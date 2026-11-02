// İlerleme sadece bu cihazdaki tarayıcıda saklanır (localStorage).
// Bağlantıyı açan herkesin kendi, bağımsız ilerlemesi olur.
import { useSyncExternalStore } from 'react';

export interface LessonProgress {
  read: boolean;
  /** En iyi quiz sonucu (doğru sayısı) */
  best?: number;
  total?: number;
  at?: string;
}

export interface ReviewItem {
  /** 0: yeni yanlış, 1: bir kez doğru bilindi */
  box: number;
  due: number;
}

export interface State {
  v: 1;
  lessons: Record<string, LessonProgress>;
  review: Record<string, ReviewItem>;
  /** Uygulamanın kullanıldığı günler (YYYY-AA-GG), en fazla 90 */
  days: string[];
  check: { date: string; done: string[]; finishedAt?: string };
  /** İşaret testindeki en iyi sonuç */
  signBest?: { best: number; total: number };
  /** Senaryoların son sonucu (ilk seçim doğru muydu) */
  scen?: Record<string, boolean>;
}

const KEY = 'kurye-egitim:v1';
const DAY = 24 * 60 * 60 * 1000;

export const today = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const empty = (): State => ({ v: 1, lessons: {}, review: {}, days: [], check: { date: today(), done: [] } });

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const s = JSON.parse(raw) as State;
    if (s?.v !== 1) return empty();
    return { ...empty(), ...s };
  } catch {
    return empty();
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function set(fn: (s: State) => State) {
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* gizli sekme veya engellenmiş depolama: ilerleme bu oturumla sınırlı kalır */
  }
  listeners.forEach((l) => l());
}

export function useAppState(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

function touchDay(s: State): State {
  const d = today();
  if (s.days.includes(d)) return s;
  return { ...s, days: [...s.days, d].slice(-90) };
}

export function markRead(lessonId: string) {
  set((s) => touchDay({ ...s, lessons: { ...s.lessons, [lessonId]: { ...s.lessons[lessonId], read: true } } }));
}

/** Ders quizinin sonucu. Yanlış sorular tekrar listesine eklenir. */
export function saveQuiz(lessonId: string, correct: number, total: number, wrongIds: string[], rightIds: string[]) {
  set((s) => {
    const prev = s.lessons[lessonId];
    const best = Math.max(prev?.best ?? 0, correct);
    const review = { ...s.review };
    for (const id of wrongIds) review[id] = { box: 0, due: Date.now() };
    for (const id of rightIds) if (review[id]) review[id] = { box: 1, due: Date.now() + DAY };
    return touchDay({
      ...s,
      review,
      lessons: { ...s.lessons, [lessonId]: { read: true, best, total, at: today() } },
    });
  });
}

/** Tekrar sorusu: iki kez doğru bilinen soru listeden çıkar. */
export function answerReview(qid: string, ok: boolean) {
  set((s) => {
    const review = { ...s.review };
    const cur = review[qid];
    if (!ok) review[qid] = { box: 0, due: Date.now() };
    else if (!cur || cur.box >= 1) delete review[qid];
    else review[qid] = { box: 1, due: Date.now() + 2 * DAY };
    return touchDay({ ...s, review });
  });
}

export function saveSignTest(correct: number, total: number, wrongIds: string[]) {
  set((s) => {
    const review = { ...s.review };
    for (const id of wrongIds) review[id] = { box: 0, due: Date.now() };
    const prev = s.signBest;
    const better = !prev || correct / total > prev.best / prev.total;
    return touchDay({ ...s, review, signBest: better ? { best: correct, total } : prev });
  });
}

export function saveScenario(id: string, ok: boolean) {
  set((s) => touchDay({ ...s, scen: { ...s.scen, [id]: ok } }));
}

export function toggleCheck(id: string, totalItems: number) {
  set((s) => {
    const base = s.check.date === today() ? s.check : { date: today(), done: [] };
    const done = base.done.includes(id) ? base.done.filter((x) => x !== id) : [...base.done, id];
    const finishedAt =
      done.length === totalItems
        ? base.finishedAt ?? new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        : undefined;
    return touchDay({ ...s, check: { date: base.date, done, finishedAt } });
  });
}

export function resetCheck() {
  set((s) => ({ ...s, check: { date: today(), done: [] } }));
}

export function resetAll() {
  set(() => empty());
}

export const todaysCheck = (s: State) => (s.check.date === today() ? s.check : { date: today(), done: [] as string[] });

export const dueReviews = (s: State) =>
  Object.entries(s.review)
    .filter(([, r]) => r.due <= Date.now())
    .map(([id]) => id);

/** Bugün veya dün biten art arda kullanım günü sayısı. */
export function streak(s: State): number {
  const set = new Set(s.days);
  const d = new Date();
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
