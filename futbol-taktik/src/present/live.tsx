import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import type { DeckKind } from './links';

// Canlı yayın: antrenörün cihazı sunumun anlık durumunu yazar, TV ekranları izler.
// Paylaşılan modda claude.ai veritabanındaki `live/screen` belgesi (geç açılan ekran da son durumu görür).
// Bağlı ekranlar iki yoldan bulunur: oda varlığı (presence) ve ekranın yazdığı `screens/<cihaz>` nabız belgesi
// (TV, uygulamaya yazma yetkisi olan bir hesapla açıldıysa). Yerel modda aynı cihazdaki pencereler arasında
// BroadcastChannel (ör. HDMI ile bağlı TV'de açılmış ikinci pencere).

export interface TimerState {
  slide: number;
  running: boolean;
  endsAt?: number; // çalışırken bitiş anı (ms)
  remainingMs: number; // durdurulduğunda kalan
}

export interface DeckState {
  slide: number;
  step: number; // taktik adımı
  play: number; // her artışta taktik baştan oynatılır
  timer?: TimerState | null;
}

export interface LiveState extends DeckState {
  active: boolean;
  kind?: DeckKind;
  id?: string;
  at: number;
}

export interface ScreenInfo {
  device: string;
  name: string;
  ack?: number; // ekranın en son aldığı gönderim (live.at)
}

interface LiveValue {
  live: LiveState | null;
  send: (s: LiveState) => void;
  stop: () => void;
  /** Bağlı ekran sayısı; bilinemiyorsa null */
  screens: number | null;
  screenList: ScreenInfo[];
  /** Son gönderimi en az bir ekran aldı */
  acked: boolean;
  /** TV ekranı: "ben bağlı bir ekranım" der; dönen fonksiyon bırakır */
  announceScreen: () => () => void;
  /** TV ekranı: gelen sunumu aldığını bildirir */
  ackScreen: (at: number) => void;
  canCast: boolean;
  deviceName: string;
}

type Peer = { isMe: boolean; presence: Record<string, unknown> };
type Room = {
  presence(p: Record<string, unknown>): Promise<void>;
  onPeers(h: (c: { peers: readonly Peer[] }) => void, e?: (err: unknown) => void): () => void;
};

const CH = 'saha-kenari-ekran';
const LS_LIVE = 'saha-kenari-live';
const BEAT_MS = 25000;
const STALE_MS = 70000;
const Ctx = createContext<LiveValue | null>(null);
export const useLive = () => useContext(Ctx)!;

const channel = () => {
  try {
    return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CH) : null;
  } catch {
    return null;
  }
};

const DEVICE_ID = (() => {
  const make = () => Math.random().toString(36).slice(2, 10);
  try {
    let id = localStorage.getItem('saha-kenari-cihaz');
    if (!id) {
      id = make();
      localStorage.setItem('saha-kenari-cihaz', id);
    }
    return id;
  } catch {
    return make();
  }
})();

/** Ekran listesinde görünecek cihaz adı */
export const DEVICE_NAME = (() => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Tizen|SMART-TV.*Samsung|SamsungBrowser.*TV/i.test(ua)) return 'Samsung TV';
  if (/Web0S|webOS|NetCast/i.test(ua)) return 'LG TV';
  if (/Android TV|GoogleTV|BRAVIA|AFT[A-Z]|CrKey/i.test(ua)) return 'Android / Google TV';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android cihaz';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows bilgisayar';
  return 'Tarayıcı';
})();

export function LiveProvider({ children }: { children: ReactNode }) {
  const { handles, mode, canEdit, toast } = useStore();
  const db = handles.db;
  const room = handles.room as Room | null;
  const [live, setLive] = useState<LiveState | null>(null);
  const [roomScreens, setRoomScreens] = useState<ScreenInfo[] | null>(null);
  const [dbScreens, setDbScreens] = useState<(ScreenInfo & { seen: number })[] | null>(null);
  const [localScreens, setLocalScreens] = useState<ScreenInfo[]>([]);
  const [tick, setTick] = useState(0);
  const bc = useRef<BroadcastChannel | null>(null);
  const pending = useRef<LiveState | null>(null);
  const writing = useRef(false);
  const localSeen = useRef(new Map<string, ScreenInfo & { t: number }>());
  const screenWritable = useRef(true);
  const lastAck = useRef<number | undefined>(undefined);
  const canCast = (mode === 'shared' && canEdit) || mode === 'local';

  // Sunum durumunu dinle
  useEffect(() => {
    if (mode === 'loading') return;
    if (db) {
      return db.doc('live/screen').onSnapshot(
        (s) => setLive(s.exists ? (s.data() as unknown as LiveState) : null),
        () => undefined,
      );
    }
    // yerel: aynı cihazdaki pencereler
    try {
      const raw = localStorage.getItem(LS_LIVE);
      if (raw) setLive(JSON.parse(raw));
    } catch {
      /* depolama kapalı */
    }
    const ch = channel();
    bc.current = ch;
    if (!ch) return;
    ch.onmessage = (e) => {
      const msg = e.data as { type: string; state?: LiveState; id?: string; name?: string; ack?: number };
      if (msg.type === 'live' && msg.state) setLive(msg.state);
      if (msg.type === 'screen' && msg.id) localSeen.current.set(msg.id, { device: msg.id, name: msg.name ?? 'Ekran', ack: msg.ack, t: Date.now() });
      if (msg.type === 'screen-off' && msg.id) localSeen.current.delete(msg.id);
    };
    const t = setInterval(() => {
      const now = Date.now();
      localSeen.current.forEach((v, k) => now - v.t > 12000 && localSeen.current.delete(k));
      setLocalScreens([...localSeen.current.values()]);
    }, 2000);
    return () => {
      clearInterval(t);
      ch.close();
      bc.current = null;
    };
  }, [db, mode]);

  // Bağlı ekranlar: oda varlığı
  useEffect(() => {
    if (!room) return;
    let off: (() => void) | undefined;
    try {
      off = room.onPeers(
        (c) =>
          setRoomScreens(
            c.peers
              .filter((p) => !p.isMe && p.presence?.role === 'ekran')
              .map((p) => ({ device: String(p.presence.device ?? Math.random()), name: String(p.presence.name ?? 'Ekran') })),
          ),
        () => setRoomScreens(null),
      );
    } catch {
      setRoomScreens(null);
    }
    return () => off?.();
  }, [room]);

  // Bağlı ekranlar: nabız belgeleri (yalnızca yayın yapabilen cihazda dinlenir)
  useEffect(() => {
    if (!db || !canCast) return;
    return db.collection('screens').onSnapshot(
      (snap) => setDbScreens(snap.docs.filter((d) => d.exists).map((d) => d.data() as unknown as ScreenInfo & { seen: number })),
      () => setDbScreens(null),
    );
  }, [db, canCast]);

  // eski nabızları düşürmek için ara sıra yeniden hesapla
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 10000);
    return () => clearInterval(t);
  }, []);

  const screenList = useMemo(() => {
    void tick;
    const now = Date.now();
    const map = new Map<string, ScreenInfo>();
    (roomScreens ?? []).forEach((s) => map.set(s.device, s));
    (dbScreens ?? []).filter((s) => now - s.seen < STALE_MS).forEach((s) => map.set(s.device, { ...map.get(s.device), ...s }));
    localScreens.forEach((s) => map.set(s.device, s));
    return [...map.values()];
  }, [roomScreens, dbScreens, localScreens, tick]);
  const screensKnown = mode === 'local' || roomScreens !== null || dbScreens !== null;
  const acked = !!live?.active && screenList.some((s) => s.ack === live.at);

  const flush = useCallback(async () => {
    if (!db || writing.current) return;
    writing.current = true;
    while (pending.current) {
      const s = pending.current;
      pending.current = null;
      try {
        await db.doc('live/screen').set(JSON.parse(JSON.stringify(s)));
      } catch {
        toast('Ekrana gönderilemedi. Bağlantıyı kontrol edin.', 'err');
      }
    }
    writing.current = false;
  }, [db, toast]);

  const send = useCallback(
    (s: LiveState) => {
      setLive(s);
      if (db) {
        pending.current = s; // art arda gelen güncellemelerden yalnızca sonuncusu yazılır
        flush();
        return;
      }
      try {
        localStorage.setItem(LS_LIVE, JSON.stringify(s));
      } catch {
        /* depolama kapalı */
      }
      bc.current?.postMessage({ type: 'live', state: s });
    },
    [db, flush],
  );

  const stop = useCallback(() => send({ active: false, slide: 0, step: 0, play: 0, at: Date.now() }), [send]);

  const beat = useCallback(() => {
    if (db && screenWritable.current)
      db.doc('screens/' + DEVICE_ID)
        .set({ device: DEVICE_ID, name: DEVICE_NAME, seen: Date.now(), ...(lastAck.current ? { ack: lastAck.current } : {}) })
        .catch(() => {
          screenWritable.current = false; // bu hesap yazamıyor: yalnızca oda varlığına güvenilir
        });
    if (!db) bc.current?.postMessage({ type: 'screen', id: DEVICE_ID, name: DEVICE_NAME, ack: lastAck.current });
  }, [db]);

  const announceScreen = useCallback(() => {
    room?.presence({ role: 'ekran', device: DEVICE_ID, name: DEVICE_NAME }).catch(() => undefined);
    beat();
    const t = setInterval(beat, db ? BEAT_MS : 4000);
    return () => {
      clearInterval(t);
      room?.presence({ role: null, device: null, name: null }).catch(() => undefined);
      if (db && screenWritable.current) db.doc('screens/' + DEVICE_ID).delete().catch(() => undefined);
      if (!db) bc.current?.postMessage({ type: 'screen-off', id: DEVICE_ID });
    };
  }, [room, db, beat]);

  const ackScreen = useCallback(
    (at: number) => {
      if (lastAck.current === at) return;
      lastAck.current = at;
      beat();
    },
    [beat],
  );

  const value = useMemo(
    () => ({ live, send, stop, screens: screensKnown ? screenList.length : null, screenList, acked, announceScreen, ackScreen, canCast, deviceName: DEVICE_NAME }),
    [live, send, stop, screensKnown, screenList, acked, announceScreen, ackScreen, canCast],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
