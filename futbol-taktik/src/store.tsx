import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildSample } from './sample';
import type { Collection, Settings, TeamData } from './types';

// Veri katmanı: claude.ai Artifact içinde paylaşılan veritabanı (db), dışarıda tarayıcı localStorage.

const LS_KEY = 'futbol-taktik-v1';
const COLLECTIONS: Collection[] = ['players', 'tactics', 'drills', 'sessions', 'matches'];

export const DEFAULT_SETTINGS: Settings = {
  teamName: 'Takımım',
  shortName: 'TKM',
  homeColor: '#d4452b',
  awayColor: '#2f5d9e',
  showNames: false,
  labels: 'role',
};

const EMPTY: TeamData = { settings: DEFAULT_SETTINGS, players: [], tactics: [], drills: [], sessions: [], matches: [] };

type Mode = 'loading' | 'shared' | 'local';

interface StoreValue {
  data: TeamData;
  mode: Mode;
  canEdit: boolean;
  isEmpty: boolean;
  save: <C extends Collection>(c: C, item: TeamData[C][number]) => Promise<void>;
  remove: (c: Collection, id: string) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;
  replaceAll: (d: TeamData) => Promise<void>;
  toast: (msg: string, tone?: 'ok' | 'err') => void;
  toasts: { id: number; msg: string; tone: 'ok' | 'err' }[];
}

const Ctx = createContext<StoreValue | null>(null);
export const useStore = () => useContext(Ctx)!;

// claude.ai çalışma zamanı tipleri (yalnızca kullandığımız kısım)
type DocSnap = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
type DocRef = {
  set(d: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(n: (s: DocSnap) => void, e?: (err: unknown) => void): () => void;
};
type ColRef = { doc(id: string): DocRef; onSnapshot(n: (s: { docs: DocSnap[] }) => void, e?: (err: unknown) => void): () => void };
type DB = { doc(p: string): DocRef; collection(p: string): ColRef };
type ClaudeRT = { use(name: string): Promise<unknown> };

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function readLocal(): TeamData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}
function writeLocal(d: TeamData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  } catch {
    /* depolama kapalı olabilir; uygulama bellekte çalışmaya devam eder */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TeamData>(EMPTY);
  const [mode, setMode] = useState<Mode>('loading');
  const [canEdit, setCanEdit] = useState(true);
  const [loaded, setLoaded] = useState(0);
  const [toasts, setToasts] = useState<StoreValue['toasts']>([]);
  const dbRef = useRef<DB | null>(null);
  const queues = useRef(new Map<string, Promise<unknown>>());
  const dirty = useRef(new Set<string>()); // yazımı henüz onaylanmamış belgeler: yerel sürüm geçerli
  const dataRef = useRef(data);
  dataRef.current = data;

  const toast = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    let cancelled = false;
    const startLocal = () => {
      if (cancelled) return;
      const d = readLocal() ?? buildSample();
      writeLocal(d);
      setData(d);
      setMode('local');
    };
    const rt = (window as unknown as { claude?: ClaudeRT }).claude;
    if (!rt?.use) {
      startLocal();
      return;
    }
    (async () => {
      const db = (await rt.use('db').catch(() => null)) as DB | null;
      if (cancelled) return;
      if (!db) return startLocal();
      dbRef.current = db;
      const user = (await rt.use('user').catch(() => null)) as { can(n: string): Promise<boolean | null> } | null;
      const can = user ? await user.can('data.write').catch(() => null) : null;
      setCanEdit(can !== false);
      setMode('shared');
      const seen = new Set<string>();
      const markLoaded = (k: string) => {
        if (!seen.has(k)) {
          seen.add(k);
          setLoaded(seen.size);
        }
      };
      COLLECTIONS.forEach((c) => {
        unsubs.push(
          db.collection(c).onSnapshot(
            (snap) => {
              const items = snap.docs.filter((d) => d.exists).map((d) => d.data()) as { id: string }[];
              setData((prev) => {
                const local = prev[c] as { id: string }[];
                const isDirty = (id: string) => dirty.current.has(`${c}/${id}`);
                const merged = items.filter((it) => !isDirty(it.id)).concat(local.filter((x) => isDirty(x.id)));
                return { ...prev, [c]: merged };
              });
              markLoaded(c);
            },
            () => markLoaded(c),
          ),
        );
      });
      unsubs.push(
        db.doc('settings/team').onSnapshot(
          (s) => {
            if (s.exists) setData((prev) => ({ ...prev, settings: { ...DEFAULT_SETTINGS, ...(s.data() as Partial<Settings>) } }));
            markLoaded('settings');
          },
          () => markLoaded('settings'),
        ),
      );
    })();
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      unsubs = [];
    };
  }, []);

  /** Aynı belgeye yazımlar sırayla gider */
  const enqueue = useCallback((path: string, fn: () => Promise<void>) => {
    const prev = queues.current.get(path) ?? Promise.resolve();
    const next = prev.then(fn, fn).finally(() => {
      if (queues.current.get(path) === tail && !pending.current.has(path)) dirty.current.delete(path);
    });
    const tail = next.catch(() => undefined);
    queues.current.set(path, tail);
    return next;
  }, []);

  const onWriteError = useCallback(
    (e: unknown) => {
      const code = (e as { code?: string })?.code;
      if (code === 'invalid_argument') setCanEdit(false);
      toast(code === 'quota_exceeded' ? 'Depolama dolu: eski maç veya taktikleri silin.' : 'Kaydedilemedi. Düzenleme yetkiniz olmayabilir.', 'err');
    },
    [toast],
  );

  // Hızlı ardışık yazımları (ör. metin kutusuna yazarken) belge başına tek yazıma indirger
  const pending = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; fn: () => Promise<void>; resolve: () => void }>());
  const debounced = useCallback(
    (path: string, fn: () => Promise<void>) =>
      new Promise<void>((resolve) => {
        dirty.current.add(path);
        const prev = pending.current.get(path);
        if (prev) {
          clearTimeout(prev.timer);
          prev.resolve();
        }
        const timer = setTimeout(() => {
          pending.current.delete(path);
          enqueue(path, fn).catch(onWriteError).finally(resolve);
        }, 500);
        pending.current.set(path, { timer, fn, resolve });
      }),
    [enqueue, onWriteError],
  );
  useEffect(() => {
    const flush = () =>
      pending.current.forEach((p, path) => {
        clearTimeout(p.timer);
        enqueue(path, p.fn).catch(() => undefined);
        pending.current.delete(path);
      });
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [enqueue]);

  const save = useCallback<StoreValue['save']>(
    async (c, item) => {
      const clean = plain(item) as { id: string };
      setData((prev) => {
        const list = prev[c] as { id: string }[];
        const exists = list.some((x) => x.id === clean.id);
        const next = { ...prev, [c]: exists ? list.map((x) => (x.id === clean.id ? clean : x)) : [...list, clean] };
        if (!dbRef.current) writeLocal(next);
        return next;
      });
      const db = dbRef.current;
      if (db) await debounced(`${c}/${clean.id}`, () => db.collection(c).doc(clean.id).set(clean));
    },
    [debounced],
  );

  const remove = useCallback<StoreValue['remove']>(
    async (c, id) => {
      setData((prev) => {
        const next = { ...prev, [c]: (prev[c] as { id: string }[]).filter((x) => x.id !== id) };
        if (!dbRef.current) writeLocal(next);
        return next;
      });
      const db = dbRef.current;
      const p = pending.current.get(`${c}/${id}`);
      if (p) {
        clearTimeout(p.timer);
        p.resolve();
        pending.current.delete(`${c}/${id}`);
      }
      if (db) dirty.current.add(`${c}/${id}`);
      if (db) await enqueue(`${c}/${id}`, () => db.collection(c).doc(id).delete()).catch(onWriteError);
    },
    [enqueue, onWriteError],
  );

  const saveSettings = useCallback<StoreValue['saveSettings']>(
    async (s) => {
      setData((prev) => {
        const next = { ...prev, settings: s };
        if (!dbRef.current) writeLocal(next);
        return next;
      });
      const db = dbRef.current;
      if (db) await enqueue('settings/team', () => db.doc('settings/team').set(plain(s) as never)).catch(onWriteError);
    },
    [enqueue, onWriteError],
  );

  const replaceAll = useCallback<StoreValue['replaceAll']>(
    async (d) => {
      const db = dbRef.current;
      if (!db) {
        writeLocal(d);
        setData(d);
        return;
      }
      const cur = dataRef.current;
      const jobs: Promise<void>[] = [];
      for (const c of COLLECTIONS) {
        const keep = new Set((d[c] as { id: string }[]).map((x) => x.id));
        for (const old of cur[c] as { id: string }[]) if (!keep.has(old.id)) jobs.push(remove(c, old.id));
        for (const item of d[c] as never[]) jobs.push(save(c, item));
      }
      jobs.push(saveSettings(d.settings));
      await Promise.all(jobs);
    },
    [remove, save, saveSettings],
  );

  const isEmpty = mode === 'shared' && loaded >= 6 && COLLECTIONS.every((c) => data[c].length === 0);
  const effectiveMode: Mode = mode === 'shared' && loaded < 6 ? 'loading' : mode;

  const value = useMemo(
    () => ({ data, mode: effectiveMode, canEdit, isEmpty, save, remove, saveSettings, replaceAll, toast, toasts }),
    [data, effectiveMode, canEdit, isEmpty, save, remove, saveSettings, replaceAll, toast, toasts],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePlayer = () => {
  const { data } = useStore();
  return useCallback((id?: string) => data.players.find((p) => p.id === id), [data.players]);
};
