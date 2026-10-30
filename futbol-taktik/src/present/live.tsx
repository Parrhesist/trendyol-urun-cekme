import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import type { DeckKind } from './links';

// Canlı yayın: antrenörün cihazı sunumun anlık durumunu yazar, TV ekranları izler.
// Paylaşılan modda claude.ai veritabanındaki `live/screen` belgesi (geç açılan ekran da son durumu görür)
// ve bağlı ekranları saymak için oda varlığı (presence) kullanılır. Yerel modda aynı cihazdaki
// pencereler arasında BroadcastChannel (ör. HDMI ile bağlı TV'de açılmış ikinci pencere).

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

interface LiveValue {
  live: LiveState | null;
  send: (s: LiveState) => void;
  stop: () => void;
  /** Bağlı ekran sayısı; bilinemiyorsa null */
  screens: number | null;
  /** TV ekranı: "ben bağlı bir ekranım" der; dönen fonksiyon bırakır */
  announceScreen: () => () => void;
  canCast: boolean;
}

type Peer = { isMe: boolean; presence: Record<string, unknown> };
type Room = {
  presence(p: Record<string, unknown>): Promise<void>;
  onPeers(h: (c: { peers: readonly Peer[] }) => void, e?: (err: unknown) => void): () => void;
};

const CH = 'saha-kenari-ekran';
const LS_LIVE = 'saha-kenari-live';
const Ctx = createContext<LiveValue | null>(null);
export const useLive = () => useContext(Ctx)!;

const channel = () => {
  try {
    return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CH) : null;
  } catch {
    return null;
  }
};

export function LiveProvider({ children }: { children: ReactNode }) {
  const { handles, mode, canEdit, toast } = useStore();
  const db = handles.db;
  const room = handles.room as Room | null;
  const [live, setLive] = useState<LiveState | null>(null);
  const [screens, setScreens] = useState<number | null>(null);
  const bc = useRef<BroadcastChannel | null>(null);
  const pending = useRef<LiveState | null>(null);
  const writing = useRef(false);
  const localScreens = useRef(new Map<string, number>());

  // Dinle
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
      const msg = e.data as { type: string; state?: LiveState; id?: string };
      if (msg.type === 'live' && msg.state) setLive(msg.state);
      if (msg.type === 'screen' && msg.id) localScreens.current.set(msg.id, Date.now());
      if (msg.type === 'screen-off' && msg.id) localScreens.current.delete(msg.id);
    };
    const t = setInterval(() => {
      const now = Date.now();
      localScreens.current.forEach((v, k) => now - v > 12000 && localScreens.current.delete(k));
      setScreens(localScreens.current.size);
    }, 2000);
    return () => {
      clearInterval(t);
      ch.close();
      bc.current = null;
    };
  }, [db, mode]);

  // Bağlı ekranları say (oda)
  useEffect(() => {
    if (!room) return;
    let off: (() => void) | undefined;
    try {
      off = room.onPeers(
        (c) => setScreens(c.peers.filter((p) => !p.isMe && p.presence?.role === 'ekran').length),
        () => setScreens(null),
      );
    } catch {
      setScreens(null);
    }
    return () => off?.();
  }, [room]);

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

  const announceScreen = useCallback(() => {
    if (room) {
      room.presence({ role: 'ekran' }).catch(() => undefined);
      return () => {
        room.presence({ role: null }).catch(() => undefined);
      };
    }
    const id = Math.random().toString(36).slice(2);
    const ping = () => bc.current?.postMessage({ type: 'screen', id });
    ping();
    const t = setInterval(ping, 4000);
    return () => {
      clearInterval(t);
      bc.current?.postMessage({ type: 'screen-off', id });
    };
  }, [room]);

  const canCast = (mode === 'shared' && canEdit) || mode === 'local';
  const value = useMemo(() => ({ live, send, stop, screens, announceScreen, canCast }), [live, send, stop, screens, announceScreen, canCast]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
