import { addDays, todayISO } from './football';
import type { Match, MatchEvent, Session, TeamData } from './types';

export type Counts = {
  gol: number;
  sut: number;
  isabetli: number;
  korner: number;
  faul: number;
  ofsayt: number;
  sari: number;
  kirmizi: number;
  kazanma: number;
  kayip: number;
};

export function countEvents(events: MatchEvent[], team: 'biz' | 'rakip', maxMinute = 200): Counts {
  const e = events.filter((x) => x.team === team && x.minute <= maxMinute);
  const n = (t: MatchEvent['type'][]) => e.filter((x) => t.includes(x.type)).length;
  return {
    gol: n(['gol']),
    sut: n(['gol', 'isabetli_sut', 'sut']),
    isabetli: n(['gol', 'isabetli_sut']),
    korner: n(['korner']),
    faul: n(['faul']),
    ofsayt: n(['ofsayt']),
    sari: n(['sari_kart']),
    kirmizi: n(['kirmizi_kart']),
    kazanma: n(['top_kazanma']),
    kayip: n(['top_kaybi']),
  };
}

export const isPlayed = (m: Match) => m.post.us != null && m.post.them != null;

export function result(m: Match): 'G' | 'B' | 'M' | null {
  if (!isPlayed(m)) return null;
  const a = m.post.us!;
  const b = m.post.them!;
  return a > b ? 'G' : a === b ? 'B' : 'M';
}

export const RESULT_LABEL = { G: 'Galibiyet', B: 'Beraberlik', M: 'Mağlubiyet' } as const;

export function playerSeason(data: TeamData, playerId: string) {
  let apps = 0;
  let goals = 0;
  let ratingSum = 0;
  let rated = 0;
  for (const m of data.matches.filter(isPlayed)) {
    const started = Object.values(m.pre.lineup).includes(playerId);
    const subIn = m.half.subs.some((s) => s.in === playerId);
    if (started || subIn) apps++;
    goals += m.post.events.filter((e) => e.type === 'gol' && e.team === 'biz' && e.playerId === playerId).length;
    const r = m.post.ratings[playerId];
    if (r) {
      ratingSum += r;
      rated++;
    }
  }
  return { apps, goals, rating: rated ? ratingSum / rated : null };
}

/** Seans yükü: süre (dk) × RPE — Foster sRPE yöntemi, birim AU */
export const sessionMinutes = (s: Session) => s.blocks.reduce((a, b) => a + b.minutes, 0);
export const sessionLoad = (s: Session) => sessionMinutes(s) * s.rpe;

export function loadSeries(sessions: Session[], weeks = 8, ref = todayISO()) {
  const out: { start: string; load: number }[] = [];
  const end = addDays(ref, 0);
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDays(end, -(w + 1) * 7 + 1);
    const stop = addDays(end, -w * 7);
    const load = sessions.filter((s) => s.date >= start && s.date <= stop).reduce((a, s) => a + sessionLoad(s), 0);
    out.push({ start, load });
  }
  return out;
}

/** Akut:kronik iş yükü oranı — son 7 gün / son 28 günün haftalık ortalaması */
export function acwr(sessions: Session[], ref = todayISO()) {
  const sum = (from: string) => sessions.filter((s) => s.date > from && s.date <= ref).reduce((a, s) => a + sessionLoad(s), 0);
  const acute = sum(addDays(ref, -7));
  const chronic = sum(addDays(ref, -28)) / 4;
  return { acute, chronic, ratio: chronic ? acute / chronic : null };
}

export const acwrTone = (r: number | null) => (r == null ? 'neutral' : r < 0.8 ? 'warn' : r <= 1.3 ? 'good' : r <= 1.5 ? 'warn' : 'bad');
export const acwrText = (r: number | null) =>
  r == null ? 'Veri yetersiz' : r < 0.8 ? 'Düşük yük — form kaybı riski' : r <= 1.3 ? 'İdeal aralık (0,8–1,3)' : r <= 1.5 ? 'Dikkat — yük artıyor' : 'Yüksek sakatlık riski';
