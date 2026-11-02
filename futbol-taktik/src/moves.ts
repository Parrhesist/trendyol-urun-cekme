import { clamp, cloneFrame, PITCH } from './football';
import type { Drawing, Frame, Pt, Tactic, Token } from './types';

// Hareket okları: koşu oyuncuyu, top sürme oyuncuyu ve topu, pas topu bir sonraki adımda okun ucuna götürür.
// Ok çizildiği adımda durur (plan); animasyon o adımdan sonrakine geçerken taş okun yolunu izler.

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const BALL_OFF = { x: 0.9, y: 0.7 };
const fix = (p: Pt): Pt => ({ x: +clamp(p.x, -1, PITCH.w + 1).toFixed(2), y: +clamp(p.y, -1, PITCH.h + 1).toFixed(2) });

function nearest(tokens: Token[], pos: Record<string, Pt>, p: Pt, kinds: Token['kind'][], max: number): Token | null {
  let best: Token | null = null;
  let bd = max;
  for (const t of tokens) {
    const q = pos[t.id];
    if (!q || !kinds.includes(t.kind)) continue;
    const d = dist(q, p);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

/** Çizginin başını taşın kenarına çeker (ok taşın altından çıkmasın) */
function fromEdge(pts: Pt[], from: Pt, r: number): Pt[] {
  const rest = pts.slice(1);
  const next = rest[0] ?? from;
  const len = dist(from, next);
  const t = len > r + 0.5 ? r / len : 0;
  return [fix({ x: from.x + (next.x - from.x) * t, y: from.y + (next.y - from.y) * t }), ...rest];
}

/** Taşı bir adımdan itibaren yeni yere koyar; sonraki adımlarda eski yerinde duruyorsa onları da taşır */
function place(frames: Frame[], from: number, id: string, p: Pt) {
  const old = frames[from].pos[id];
  for (let j = from; j < frames.length; j++) {
    const cur = frames[j].pos[id];
    if (j > from && (!cur || !old || dist(cur, old) > 0.05)) break;
    frames[j] = { ...frames[j], pos: { ...frames[j].pos, [id]: p } };
  }
}

/**
 * Yeni çizimi adıma ekler. Koşu, top sürme ve pas bir oyuncunun ya da topun yanından başlıyorsa harekete bağlanır:
 * sonraki adım (yoksa eklenir) o taşı okun ucunda gösterir.
 */
export function addDrawing(t: Tactic, fi: number, raw: Drawing): { tactic: Tactic; created: boolean; mover?: Token['kind'] } {
  const frames = [...t.frames];
  const pos = frames[fi].pos;
  const start = raw.pts[0];
  let mover: Token | null = null;
  let carry: Token | null = null;
  if (raw.kind === 'pass') {
    mover = nearest(t.tokens, pos, start, ['ball'], 5);
    if (!mover) {
      const holder = nearest(t.tokens, pos, start, ['home', 'away'], 5);
      if (holder) mover = nearest(t.tokens, pos, pos[holder.id], ['ball'], 3);
    }
  } else if (raw.kind === 'run' || raw.kind === 'dribble') {
    mover = nearest(t.tokens, pos, start, ['home', 'away'], 5);
    if (mover && raw.kind === 'dribble') carry = nearest(t.tokens, pos, pos[mover.id], ['ball'], 3);
  }
  if (!mover) {
    frames[fi] = { ...frames[fi], drawings: [...frames[fi].drawings, raw] };
    return { tactic: { ...t, frames }, created: false };
  }

  const from = pos[mover.id];
  const end = raw.pts[raw.pts.length - 1];
  const created = fi + 1 >= frames.length;
  if (created) frames.push(cloneFrame(frames[fi]));
  const nextPos = frames[fi + 1].pos;
  let to = end;
  let pts = raw.pts;
  const r = mover.kind === 'ball' ? 1.2 : 1.75 * (t.tokenScale ?? 1) + 0.25;
  if (raw.kind === 'pass') {
    // oyuncuya atılan pas onun ayağında durur; ok ucu oyuncunun kenarında biter
    const recv = nearest(t.tokens, nextPos, end, ['home', 'away'], 2.6);
    if (recv) {
      to = { x: nextPos[recv.id].x + BALL_OFF.x, y: nextPos[recv.id].y + BALL_OFF.y };
      const rp = pos[recv.id] ?? nextPos[recv.id];
      pts = [...fromEdge([...pts.slice(0, -1), rp].reverse(), rp, 1.75 * (t.tokenScale ?? 1) + 0.3)].reverse();
    }
  }
  to = fix(to);
  const carryTo = carry ? fix({ x: to.x + pos[carry.id].x - from.x, y: to.y + pos[carry.id].y - from.y }) : undefined;
  const d: Drawing = { ...raw, pts: fromEdge(pts, from, r), mover: mover.id, to, ...(carry && carryTo ? { carry: carry.id, carryTo } : {}) };

  frames[fi] = { ...frames[fi], drawings: [...frames[fi].drawings, d] };
  place(frames, fi + 1, mover.id, to);
  if (carry && carryTo) place(frames, fi + 1, carry.id, carryTo);
  return { tactic: { ...t, frames }, created, mover: mover.kind };
}

/** Çizimi siler; hareket okuysa sonraki adımdaki taşı okun başındaki yerine geri koyar */
export function removeDrawing(t: Tactic, fi: number, id: string): Tactic {
  const frames = [...t.frames];
  const d = frames[fi].drawings.find((x) => x.id === id);
  frames[fi] = { ...frames[fi], drawings: frames[fi].drawings.filter((x) => x.id !== id) };
  const next = frames[fi + 1];
  const back = (tok?: string, at?: Pt) => {
    if (!tok || !at || !next) return;
    const now = next.pos[tok];
    const was = frames[fi].pos[tok];
    if (now && was && dist(now, at) < 0.1) place(frames, fi + 1, tok, { ...was });
  };
  back(d?.mover, d?.to);
  back(d?.carry, d?.carryTo);
  return { ...t, frames };
}

/** Kırık çizgi üzerinde 0–1 arası orandaki nokta */
function along(pts: Pt[]): (e: number) => Pt {
  const lens = pts.slice(1).map((p, i) => dist(pts[i], p));
  const total = lens.reduce((a, b) => a + b, 0);
  return (e) => {
    if (total < 0.01) return pts[pts.length - 1];
    let s = e * total;
    for (let i = 0; i < lens.length; i++) {
      if (s <= lens[i] || i === lens.length - 1) {
        const k = lens[i] ? Math.min(1, s / lens[i]) : 1;
        const a = pts[i];
        const b = pts[i + 1];
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      }
      s -= lens[i];
    }
    return pts[pts.length - 1];
  };
}

/** Bir adımdan sonrakine geçerken okları izleyen taşların yolları (taş elle başka yere konmuşsa düz geçiş) */
export function movePaths(prev: Frame, cur: Frame): Record<string, (e: number) => Pt> {
  const out: Record<string, (e: number) => Pt> = {};
  for (const d of prev.drawings) {
    if (!d.mover || !d.to) continue;
    const a = prev.pos[d.mover];
    const b = cur.pos[d.mover];
    if (!a || !b || dist(b, d.to) > 0.3) continue;
    const path = along([a, ...d.pts.slice(1, -1), b]);
    out[d.mover] = path;
    if (d.carry && d.carryTo) {
      const ca = prev.pos[d.carry];
      const cb = cur.pos[d.carry];
      if (ca && cb && dist(cb, d.carryTo) < 0.3) {
        const o0 = { x: ca.x - a.x, y: ca.y - a.y };
        const o1 = { x: cb.x - b.x, y: cb.y - b.y };
        out[d.carry] = (e) => {
          const p = path(e);
          return { x: p.x + o0.x + (o1.x - o0.x) * e, y: p.y + o0.y + (o1.y - o0.y) * e };
        };
      }
    }
  }
  return out;
}

/** Küçük önizlemede gösterilecek oklar: ilk adımın hareket okları ve ikinci adımın çizimleri */
export function previewDrawings(t: Tactic): Drawing[] {
  const [f0, f1] = t.frames;
  return f1 ? [...f0.drawings.filter((d) => d.mover), ...f1.drawings] : f0.drawings;
}
