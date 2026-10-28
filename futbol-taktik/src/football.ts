import type { EventType, Frame, Pt, StatKey, Tactic, Token } from './types';

export const PITCH = { w: 105, h: 68 };

export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 9);

// Diziliş slotları: [mevki, x, y]. Takım soldan sağa hücum eder; y küçük = sol kanat.
export const FORMATIONS: Record<string, [string, number, number][]> = {
  '4-4-2': [
    ['KL', 5, 34], ['SLB', 24, 10], ['STP', 21, 27], ['STP', 21, 41], ['SĞB', 24, 58],
    ['SLK', 46, 11], ['MO', 43, 28], ['MO', 43, 40], ['SĞK', 46, 57], ['FV', 66, 28], ['FV', 66, 40],
  ],
  '4-3-3': [
    ['KL', 5, 34], ['SLB', 24, 10], ['STP', 21, 27], ['STP', 21, 41], ['SĞB', 24, 58],
    ['DOS', 37, 34], ['MO', 47, 22], ['MO', 47, 46], ['SLK', 66, 12], ['FV', 70, 34], ['SĞK', 66, 56],
  ],
  '4-2-3-1': [
    ['KL', 5, 34], ['SLB', 24, 10], ['STP', 21, 27], ['STP', 21, 41], ['SĞB', 24, 58],
    ['DOS', 38, 27], ['DOS', 38, 41], ['SLK', 56, 13], ['OOS', 56, 34], ['SĞK', 56, 55], ['FV', 72, 34],
  ],
  '4-1-4-1': [
    ['KL', 5, 34], ['SLB', 24, 10], ['STP', 21, 27], ['STP', 21, 41], ['SĞB', 24, 58],
    ['DOS', 35, 34], ['SLK', 52, 11], ['MO', 49, 26], ['MO', 49, 42], ['SĞK', 52, 57], ['FV', 70, 34],
  ],
  '3-5-2': [
    ['KL', 5, 34], ['STP', 21, 20], ['STP', 19, 34], ['STP', 21, 48],
    ['SLKB', 44, 8], ['DOS', 38, 34], ['MO', 48, 23], ['MO', 48, 45], ['SĞKB', 44, 60], ['FV', 68, 27], ['FV', 68, 41],
  ],
  '3-4-3': [
    ['KL', 5, 34], ['STP', 21, 20], ['STP', 19, 34], ['STP', 21, 48],
    ['SLKB', 44, 9], ['MO', 42, 27], ['MO', 42, 41], ['SĞKB', 44, 59], ['SLK', 65, 15], ['FV', 70, 34], ['SĞK', 65, 53],
  ],
  '5-3-2': [
    ['KL', 5, 34], ['SLKB', 28, 7], ['STP', 20, 21], ['STP', 18, 34], ['STP', 20, 47], ['SĞKB', 28, 61],
    ['MO', 44, 22], ['DOS', 40, 34], ['MO', 44, 46], ['FV', 64, 28], ['FV', 64, 40],
  ],
};
export const FORMATION_NAMES = Object.keys(FORMATIONS);

export const mirror = (p: Pt): Pt => ({ x: PITCH.w - p.x, y: PITCH.h - p.y });

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Bir dizilişten yeni taktik iskeleti üretir; kadrodan ilk 11 eşleştirilir. */
export function makeTactic(
  name: string,
  formation: string,
  opts: { away?: string | null; lineup?: (string | undefined)[]; numbers?: (number | undefined)[]; category?: Tactic['category'] } = {},
): Tactic {
  const tokens: Token[] = [];
  const pos: Record<string, Pt> = {};
  FORMATIONS[formation].forEach(([role, x, y], i) => {
    const id = uid('h');
    tokens.push({ id, kind: 'home', label: String(opts.numbers?.[i] ?? role), playerId: opts.lineup?.[i] });
    pos[id] = { x, y };
  });
  if (opts.away) {
    FORMATIONS[opts.away].forEach(([, x, y]) => {
      const id = uid('a');
      tokens.push({ id, kind: 'away', label: '' });
      pos[id] = mirror({ x, y });
    });
    // rakip forma numaraları 1..11
    tokens.filter((t) => t.kind === 'away').forEach((t, i) => (t.label = String(i + 1)));
  }
  const ball = uid('b');
  tokens.push({ id: ball, kind: 'ball', label: '' });
  pos[ball] = { x: 52.5, y: 34 };
  return {
    id: uid('t'),
    name,
    category: opts.category ?? 'Hücum',
    formation,
    awayFormation: opts.away ?? undefined,
    tokens,
    frames: [{ pos, drawings: [] }],
    updatedAt: Date.now(),
  };
}

export const cloneFrame = (f: Frame): Frame => ({
  pos: Object.fromEntries(Object.entries(f.pos).map(([k, v]) => [k, { ...v }])),
  drawings: [],
  note: '',
});

export const DRAW_COLORS: Record<string, string> = {
  a: 'var(--ink-draw-a)',
  b: 'var(--ink-draw-b)',
  c: 'var(--ink-draw-c)',
  d: 'var(--ink-draw-d)',
};

/** Catmull-Rom eğrisini kübik Bézier yoluna çevirir — serbest çizimler yumuşak görünür. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${c1.x.toFixed(2)},${c1.y.toFixed(2)} ${c2.x.toFixed(2)},${c2.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Noktaları seyreltir (Ramer–Douglas–Peucker) */
export function simplify(pts: Pt[], eps = 0.6): Pt[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let idx = 0;
  let max = 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i].x - dx * pts[i].y + b.x * a.y - b.y * a.x) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max > eps) return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
  return [a, b];
}

/** Zikzak (top sürme) yolu */
export function zigzagPath(pts: Pt[]): string {
  const out: Pt[] = [];
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / (seg || 1);
    const ny = (b.x - a.x) / (seg || 1);
    for (let s = 0; s < seg; s += 0.35) {
      acc += 0.35;
      const t = s / seg;
      const amp = 0.65 * Math.sin((acc * Math.PI * 2) / 1.8);
      out.push({ x: a.x + (b.x - a.x) * t + nx * amp, y: a.y + (b.y - a.y) * t + ny * amp });
    }
  }
  out.push(pts[pts.length - 1]);
  return 'M' + out.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('L');
}

export const EVENT_META: Record<EventType, { label: string; short: string; shot?: boolean }> = {
  gol: { label: 'Gol', short: 'G', shot: true },
  isabetli_sut: { label: 'İsabetli şut', short: 'İŞ', shot: true },
  sut: { label: 'İsabetsiz şut', short: 'Ş', shot: true },
  top_kazanma: { label: 'Top kazanma', short: 'TK' },
  top_kaybi: { label: 'Top kaybı', short: 'TY' },
  faul: { label: 'Faul', short: 'F' },
  korner: { label: 'Korner', short: 'K' },
  ofsayt: { label: 'Ofsayt', short: 'O' },
  sari_kart: { label: 'Sarı kart', short: 'SK' },
  kirmizi_kart: { label: 'Kırmızı kart', short: 'KK' },
};
export const EVENT_TYPES = Object.keys(EVENT_META) as EventType[];

export const MANUAL_STATS: { key: StatKey; label: string; unit?: string }[] = [
  { key: 'topa_sahip_olma', label: 'Topa sahip olma', unit: '%' },
  { key: 'pas', label: 'Pas' },
  { key: 'isabetli_pas_yuzde', label: 'Pas isabeti', unit: '%' },
  { key: 'xg', label: 'Gol beklentisi (xG)' },
  { key: 'kosu_km', label: 'Toplam koşu', unit: 'km' },
];

export const STATUS_META = {
  hazir: { label: 'Hazır', tone: 'good' },
  supheli: { label: 'Şüpheli', tone: 'warn' },
  sakat: { label: 'Sakat', tone: 'bad' },
  cezali: { label: 'Cezalı', tone: 'bad' },
} as const;

export const GROUP_LABEL = { KL: 'Kaleci', DEF: 'Defans', OS: 'Orta saha', FV: 'Forvet' } as const;

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(+d) ? iso : d.toLocaleDateString('tr-TR', opts);
};

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Pazartesi başlangıçlı hafta */
export const weekStart = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  const wd = (d.getDay() + 6) % 7;
  return addDays(iso, -wd);
};
