import { FORMATIONS } from '../football';
import type { Drawing, Frame, Pt, Tactic, TacticCategory, Token } from '../types';

// Hazır taktiklerin yazım dili. Bizim takım soldan sağa hücum eder (x: 0–105 m, y: 0–68 m, üst = sol kanat).
// Oyuncu anahtarları forma numaralarıdır: bizimkiler '6', rakipler 'r6', top 'b'. '^6' = oyuncunun bir önceki adımdaki yeri.

export type P = [number, number];
export type Ref = string | P;

export interface DrawDef {
  k: Drawing['kind'];
  a: Ref;
  b?: Ref;
  via?: P[];
  c: string;
}

export interface StepDef {
  m?: Record<string, P | string>; // yeni konumlar; 'b' için oyuncu anahtarı da verilebilir
  d?: DrawDef[];
  n: string; // adımın anlatımı
}

export type LibGroup = 'Sistemler' | 'Oyun kurma' | 'Hücum kalıpları' | 'Pres ve savunma' | 'Geçişler' | 'Duran toplar';

export interface LibDef {
  id: string;
  name: string;
  group: LibGroup;
  cat: TacticCategory;
  src: string; // köken / kaynak
  desc: string; // genel anlatım
  pts: string[]; // koçluk noktaları
  tags?: string[];
  half?: boolean;
  speed?: number; // adım süresi (ms)
  scale?: number; // oyuncu boyutu
  h: string | Record<string, P>; // diziliş adı ya da açık konumlar
  a?: string | Record<string, P>;
  m0?: Record<string, P>; // başlangıç düzeltmeleri
  ball: Ref;
  cones?: P[];
  goals?: P[];
  all?: DrawDef[]; // her adımda görünen çizimler (koridor çizgileri, bölgeler)
  n0: string;
  steps: StepDef[];
}

/** Dizilişlerdeki slot sırasına göre klasik forma numaraları */
export const NUM: Record<string, number[]> = {
  '4-4-2': [1, 3, 5, 4, 2, 11, 6, 8, 7, 10, 9],
  '4-3-3': [1, 3, 5, 4, 2, 6, 10, 8, 11, 9, 7],
  '4-2-3-1': [1, 3, 5, 4, 2, 6, 8, 11, 10, 7, 9],
  '4-1-4-1': [1, 3, 5, 4, 2, 6, 11, 10, 8, 7, 9],
  '3-5-2': [1, 5, 4, 2, 3, 6, 10, 8, 7, 11, 9],
  '3-4-3': [1, 5, 4, 6, 3, 8, 10, 2, 11, 9, 7],
  '5-3-2': [1, 3, 5, 4, 6, 2, 10, 8, 7, 11, 9],
  '4-4-2 elmas': [1, 3, 5, 4, 2, 6, 8, 7, 10, 11, 9],
  '4-2-2-2': [1, 3, 5, 4, 2, 6, 8, 11, 7, 10, 9],
  '4-3-2-1': [1, 3, 5, 4, 2, 8, 6, 7, 10, 11, 9],
  '4-4-1-1': [1, 3, 5, 4, 2, 11, 6, 8, 7, 10, 9],
  '3-4-2-1': [1, 5, 4, 6, 3, 8, 16, 2, 10, 7, 9],
  '5-4-1': [1, 3, 5, 4, 6, 2, 11, 8, 16, 7, 9],
  // 1928'de ilk numaralandırma 2-3-5'e göre yapıldı: 2 sağ bek, 3 sol bek, 4-5-6 yarı-bekler, 7-11 forvetler
  '2-3-5': [1, 3, 2, 6, 5, 4, 11, 10, 9, 8, 7],
  'WM 3-2-2-3': [1, 3, 5, 2, 6, 4, 10, 8, 11, 9, 7],
};

export const run = (a: string, ...via: P[]): DrawDef => ({ k: 'run', a, via, c: a.startsWith('r') ? 'c' : 'b' });
export const drib = (a: string, ...via: P[]): DrawDef => ({ k: 'dribble', a, via, c: 'a' });
export const pass = (a: Ref, b: Ref, ...via: P[]): DrawDef => ({ k: 'pass', a, b, via, c: 'a' });
/** Kilit pas, orta ya da şut (turuncu) */
export const key = (a: Ref, b: Ref, ...via: P[]): DrawDef => ({ k: 'pass', a, b, via, c: 'd' });
export const shot = (a: Ref, y = 34): DrawDef => key(a, [105, y]);
export const zone = (x1: number, y1: number, x2: number, y2: number, c = 'c'): DrawDef => ({ k: 'zone', a: [x1, y1], b: [x2, y2], c });
export const line = (x1: number, y1: number, x2: number, y2: number, c = 'a'): DrawDef => ({ k: 'line', a: [x1, y1], b: [x2, y2], c });
/** İki oyuncu arasındaki bağ (adam adama markaj) */
export const pair = (a: string, b: string): DrawDef => ({ k: 'line', a, b, c: 'b' });

const BALL_OFF = { x: 0.9, y: 0.7 };
const clone = (p: Record<string, Pt>) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v }]));

/** Okun ucunu oyuncu dairesinin dışında bitirmek için kısaltır */
function trimEnd(pts: Pt[], d: number): Pt[] {
  if (pts.length < 2) return pts;
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < d + 0.6) return pts;
  const t = (len - d) / len;
  return [...pts.slice(0, -1), { x: +(a.x + (b.x - a.x) * t).toFixed(2), y: +(a.y + (b.y - a.y) * t).toFixed(2) }];
}
function trimStart(pts: Pt[], d: number): Pt[] {
  return trimEnd([...pts].reverse(), d).reverse();
}

/** Yazılı tanımdan oynatılabilir taktik üretir */
export function buildLib(def: LibDef): Tactic {
  const tokens: Token[] = [];
  const pos: Record<string, Pt> = {};
  const need = (k: string, where: Record<string, Pt>) => {
    const key = k.startsWith('^') ? k.slice(1) : k;
    if (!where[key]) throw new Error(`${def.id}: bilinmeyen oyuncu "${k}"`);
    return where[key];
  };
  const team = (spec: string | Record<string, P>, away: boolean) => {
    const entries: [string, P][] =
      typeof spec === 'string'
        ? FORMATIONS[spec].map(([, x, y], i) => [String(NUM[spec][i]), away ? [105 - x, 68 - y] : [x, y]])
        : Object.entries(spec);
    for (const [k, p] of entries) {
      const id = away ? 'r' + k : k;
      tokens.push({ id, kind: away ? 'away' : 'home', label: k });
      pos[id] = { x: p[0], y: p[1] };
    }
  };
  team(def.h, false);
  if (def.a) team(def.a, true);
  def.cones?.forEach((p, i) => {
    tokens.push({ id: 'c' + i, kind: 'cone', label: '' });
    pos['c' + i] = { x: p[0], y: p[1] };
  });
  def.goals?.forEach((p, i) => {
    tokens.push({ id: 'g' + i, kind: 'goal', label: '' });
    pos['g' + i] = { x: p[0], y: p[1] };
  });
  Object.entries(def.m0 ?? {}).forEach(([k, p]) => {
    need(k, pos);
    pos[k] = { x: p[0], y: p[1] };
  });
  const at = (r: Ref, where: Record<string, Pt>): Pt => {
    if (typeof r !== 'string') return { x: r[0], y: r[1] };
    const p = need(r, where);
    return { x: +(p.x + BALL_OFF.x).toFixed(2), y: +(p.y + BALL_OFF.y).toFixed(2) };
  };
  tokens.push({ id: 'b', kind: 'ball', label: '' });
  pos.b = at(def.ball, pos);

  const resolve = (d: DrawDef, prev: Record<string, Pt>, cur: Record<string, Pt>, i: number): Drawing => {
    const via = (d.via ?? []).map(([x, y]) => ({ x, y }));
    const id = `${def.id}-${i}-${Math.random().toString(36).slice(2, 6)}`;
    const P = (r: Ref, where: Record<string, Pt>) => (typeof r === 'string' ? { ...need(r, where) } : { x: r[0], y: r[1] });
    if (d.k === 'run' || d.k === 'dribble') {
      const a = d.a as string;
      const pts = [P(a, prev), ...via, P(a, cur)];
      return { id, kind: d.k, color: d.c, pts: trimEnd(pts, d.k === 'run' ? 1.9 : 1.2) };
    }
    if (d.k === 'pass') {
      let from: Pt;
      if (d.a === 'b') from = { ...prev.b };
      else if (typeof d.a === 'string' && d.a.startsWith('^')) from = P(d.a, prev);
      else from = P(d.a, cur);
      const to = P(d.b!, cur);
      let pts = [from, ...via, to];
      if (typeof d.a === 'string' && d.a !== 'b') pts = trimStart(pts, 1.2);
      if (typeof d.b === 'string') pts = trimEnd(pts, 2);
      return { id, kind: 'pass', color: d.c, pts };
    }
    // bölge ve çizgi: oyuncu anahtarı verilirse güncel konum
    return { id, kind: d.k, color: d.c, pts: [P(d.a, cur), P(d.b!, cur)] };
  };

  const persistent = (where: Record<string, Pt>) => (def.all ?? []).map((d, i) => resolve(d, where, where, 900 + i));
  const frames: Frame[] = [{ pos, drawings: persistent(pos), note: def.n0 }];
  def.steps.forEach((st, si) => {
    const prev = frames[frames.length - 1].pos;
    const cur = clone(prev);
    for (const [k, v] of Object.entries(st.m ?? {})) {
      if (k === 'b') continue;
      need(k, prev);
      cur[k] = typeof v === 'string' ? { ...need(v, cur) } : { x: v[0], y: v[1] };
    }
    const drawings = (st.d ?? []).map((d, i) => resolve(d, prev, cur, si * 50 + i));
    if (st.m?.b) cur.b = at(st.m.b as Ref, cur);
    else {
      const last = [...(st.d ?? [])].reverse().find((d) => (d.k === 'pass' && d.b) || d.k === 'dribble');
      if (last) cur.b = last.k === 'dribble' ? at(last.a, cur) : at(last.b!, cur);
      else {
        // top, sahibine yapışık: sahibi yürüdüyse top da gelir
        let holder: string | null = null;
        let best = 2.6;
        for (const t of tokens) {
          if (t.kind !== 'home' && t.kind !== 'away') continue;
          const p = prev[t.id];
          const dd = Math.hypot(p.x - prev.b.x, p.y - prev.b.y);
          if (dd < best) {
            best = dd;
            holder = t.id;
          }
        }
        if (holder) cur.b = { x: +(prev.b.x + cur[holder].x - prev[holder].x).toFixed(2), y: +(prev.b.y + cur[holder].y - prev[holder].y).toFixed(2) };
      }
    }
    frames.push({ pos: cur, drawings: [...persistent(cur), ...drawings], note: st.n });
  });

  return {
    id: 'lib-' + def.id,
    libId: def.id,
    name: def.name,
    category: def.cat,
    formation: typeof def.h === 'string' ? def.h : '4-3-3',
    awayFormation: typeof def.a === 'string' ? def.a : undefined,
    half: def.half,
    tokens,
    frames,
    description: def.desc,
    points: def.pts.join('\n'),
    source: def.src,
    stepMs: def.speed,
    tokenScale: def.scale ?? (def.group === 'Duran toplar' ? 0.7 : undefined),
    updatedAt: 0,
  };
}
