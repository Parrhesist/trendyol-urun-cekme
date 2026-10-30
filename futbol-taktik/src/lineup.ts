import { FORMATIONS, mirror, uid } from './football';
import type { Match, Player, PosGroup, Pt, Tactic, TeamInstructions, Token } from './types';

export const roleGroup = (role: string): PosGroup =>
  role === 'KL' ? 'KL' : ['SLB', 'SĞB', 'STP', 'SLKB', 'SĞKB'].includes(role) ? 'DEF' : ['DOS', 'MO', 'OOS'].includes(role) ? 'OS' : 'FV';

export const ROLE_NAMES: Record<string, string> = {
  KL: 'Kaleci',
  STP: 'Stoper',
  SLB: 'Sol bek',
  SĞB: 'Sağ bek',
  SLKB: 'Sol kanat bek',
  SĞKB: 'Sağ kanat bek',
  DOS: 'Defansif orta saha',
  MO: 'Merkez orta saha',
  OOS: 'Ofansif orta saha',
  SLK: 'Sol kanat',
  SĞK: 'Sağ kanat',
  FV: 'Forvet',
};

/**
 * Sahadaki konuma göre mevki. Takım soldan sağa hücum eder (x: kendi kale çizgisinden metre, y: üst = sol kanat).
 * Kaleci: kendi ceza sahasındaki en geri oyuncu. Üçlü savunmada kenardaki oyuncular kanat bek sayılır.
 */
export function classifyRoles(items: { id: string; p: Pt }[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!items.length) return out;
  const gk = [...items].sort((a, b) => a.p.x - b.p.x)[0];
  const hasGK = gk.p.x < 16.5 && gk.p.y > 13.84 && gk.p.y < 54.16;
  for (const it of items) {
    if (hasGK && it === gk) {
      out[it.id] = 'KL';
      continue;
    }
    const { x, y } = it.p;
    const side = y < 17 ? 'L' : y > 51 ? 'R' : null;
    const back = side === 'L' ? 'SLB' : 'SĞB';
    const wing = side === 'L' ? 'SLK' : 'SĞK';
    if (x < 31) out[it.id] = side ? back : 'STP';
    else if (x < 41) out[it.id] = side ? (x < 36 ? back : wing) : 'DOS';
    else if (x < 54) out[it.id] = side ? wing : 'MO';
    else if (x < 64) out[it.id] = side ? wing : 'OOS';
    else out[it.id] = side ? wing : 'FV';
  }
  const centreBacks = Object.values(out).filter((r) => r === 'STP').length;
  if (centreBacks >= 3)
    for (const it of items) {
      const r = out[it.id];
      if (it.p.x >= 22 && it.p.x < 56 && (r === 'SLB' || r === 'SLK')) out[it.id] = 'SLKB';
      if (it.p.x >= 22 && it.p.x < 56 && (r === 'SĞB' || r === 'SĞK')) out[it.id] = 'SĞKB';
    }
  return out;
}

/** Sahadaki dizilişi hatlara bölerek okur (ör. 4-2-3-1). Kaleci hariç, hatlar arası 10,5 m'den büyük boşlukla ayrılır. */
export function detectFormation(items: { id: string; p: Pt }[], roles: Record<string, string>): string {
  const xs = items
    .filter((it) => roles[it.id] !== 'KL')
    .map((it) => it.p.x)
    .sort((a, b) => a - b);
  if (xs.length < 3) return '—';
  const lines: number[] = [1];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - xs[i - 1] > 10.5) lines.push(1);
    else lines[lines.length - 1]++;
  }
  return lines.join('-');
}

/** Diziliş slotlarına uygun oyuncuları otomatik yerleştirir (önce tam mevki, sonra mevki grubu). */
export function autoLineup(formation: string, players: Player[]): string[] {
  const slots = FORMATIONS[formation];
  const pool = players.filter((p) => p.status === 'hazir' || p.status === 'supheli');
  const used = new Set<string>();
  const res: string[] = slots.map(() => '');
  const pass = (match: (p: Player, role: string) => boolean) =>
    slots.forEach(([role], i) => {
      if (res[i]) return;
      const p = pool.find((x) => !used.has(x.id) && match(x, role));
      if (p) {
        res[i] = p.id;
        used.add(p.id);
      }
    });
  pass((p, r) => p.role === r && p.status === 'hazir');
  pass((p, r) => p.group === roleGroup(r) && p.status === 'hazir');
  pass((p, r) => p.group === roleGroup(r));
  pass((p) => p.group !== 'KL');
  return res;
}

export const surname = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
};

/* ---------------- Maç kadrosu ---------------- */

export type Slot = { key: string; playerId?: string; p: Pt };

/** Maçın 11 slotu: oyuncu ve sahadaki konumu (serbest konum yoksa diziliş şablonundan) */
export function matchSlots(pre: Match['pre']): Slot[] {
  const base = FORMATIONS[pre.formation] ?? FORMATIONS['4-3-3'];
  return base.map(([, x, y], i) => ({ key: String(i), playerId: pre.lineup[String(i)] || undefined, p: pre.positions?.[String(i)] ?? { x, y } }));
}

export const slotRoles = (slots: Slot[]) => classifyRoles(slots.map((s) => ({ id: s.key, p: s.p })));

/** Yedekler: ilk 11'de olanlar ayıklanmış */
export const benchOf = (pre: Match['pre']) => {
  const xi = new Set(Object.values(pre.lineup));
  return pre.bench.filter((id) => !xi.has(id));
};

/**
 * Oyuncuları koruyarak yeni dizilişe geçer: her oyuncu en yakın ve mevkisine en uygun yeni slota taşınır.
 */
export function applyFormation(pre: Match['pre'], formation: string, players: Player[] = []): Pick<Match['pre'], 'formation' | 'lineup' | 'positions'> {
  const cur = matchSlots(pre).filter((s) => s.playerId);
  const curRoles = slotRoles(matchSlots(pre));
  const next = FORMATIONS[formation].map(([, x, y], i) => ({ key: String(i), p: { x, y } }));
  const nextRoles = classifyRoles(next.map((s) => ({ id: s.key, p: s.p })));
  const natural = (id: string) => players.find((p) => p.id === id)?.role;
  return { formation, lineup: assign(cur.map((s) => ({ id: s.playerId!, p: s.p, role: curRoles[s.key], natural: natural(s.playerId!) })), next.map((s) => ({ key: s.key, p: s.p, role: nextRoles[s.key] }))), positions: {} };
}

/** En uygun eşleştirme (Macar algoritması): mesafe + mevki uyumu toplamını en aza indirir. Kaleci yalnızca kaleci slotuna gider. */
function assign(from: { id: string; p: Pt; role: string; natural?: string }[], to: { key: string; p: Pt; role: string }[]): Record<string, string> {
  const n = from.length;
  const m = to.length;
  if (!n || !m) return {};
  const cost = (f: (typeof from)[number], t: (typeof to)[number]) => {
    // oyuncunun kadrodaki doğal mevkisi biliniyorsa o esas alınır, yoksa şu an oynadığı yer
    const r = f.natural || f.role;
    let c = Math.hypot(f.p.x - t.p.x, f.p.y - t.p.y);
    if ((r === 'KL') !== (t.role === 'KL')) c += 1000;
    if (roleGroup(r) !== roleGroup(t.role)) c += 25;
    if (r === t.role) c -= 8;
    return c;
  };
  // satır sayısı sütundan fazlaysa fazlalar eşleşmez: kare matrise tamamla
  const size = Math.max(n, m);
  const a = (i: number, j: number) => (i <= n && j <= m ? cost(from[i - 1], to[j - 1]) : 0);
  const u = new Array(size + 1).fill(0);
  const v = new Array(size + 1).fill(0);
  const p = new Array(size + 1).fill(0);
  const way = new Array(size + 1).fill(0);
  for (let i = 1; i <= size; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(size + 1).fill(Infinity);
    const used = new Array(size + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= size; j++)
        if (!used[j]) {
          const cur = a(i0, j) - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      for (let j = 0; j <= size; j++)
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const out: Record<string, string> = {};
  for (let j = 1; j <= m; j++) if (p[j] >= 1 && p[j] <= n) out[to[j - 1].key] = from[p[j] - 1].id;
  return out;
}

/** Bir oyuncunun bu mevkiye uygunluğu: 2 = doğal mevkisi, 1 = aynı hat, 0 = mevki dışı */
export function fitFor(player: Player | undefined, role: string): 0 | 1 | 2 {
  if (!player) return 0;
  if (player.role === role) return 2;
  return player.group === roleGroup(role) ? 1 : 0;
}

/* ---------------- Takım talimatları ---------------- */

export const DEFAULT_INSTRUCTIONS: TeamInstructions = {
  block: 'orta',
  line: 'normal',
  press: 'dengeli',
  width: 'dengeli',
  tempo: 'dengeli',
  passing: 'karisik',
  buildUp: 'kisa',
  focus: 'dengeli',
  onWin: 'hizli',
  onLose: 'karsi_pres',
  offside: false,
};

export type OptDef = { key: Exclude<keyof TeamInstructions, 'offside'>; label: string; help: string; options: [string, string][] };

export const INSTRUCTION_GROUPS: { title: string; items: OptDef[] }[] = [
  {
    title: 'Savunma',
    items: [
      { key: 'block', label: 'Savunma bloğu', help: 'Rakibe nerede baskı başlar', options: [['alcak', 'Alçak'], ['orta', 'Orta'], ['yuksek', 'Yüksek']] },
      { key: 'line', label: 'Savunma hattı', help: 'Son adam hattının yüksekliği', options: [['derin', 'Derin'], ['normal', 'Normal'], ['yuksek', 'Yüksek']] },
      { key: 'press', label: 'Pres yoğunluğu', help: 'Topa ne kadar agresif gidilir', options: [['az', 'Az'], ['dengeli', 'Dengeli'], ['yogun', 'Yoğun']] },
    ],
  },
  {
    title: 'Geçişler',
    items: [
      { key: 'onLose', label: 'Top kaybedince', help: 'Kayıptan sonraki ilk 5 saniye', options: [['karsi_pres', 'Karşı pres'], ['geri_cekil', 'Geri çekil, yerleş']] },
      { key: 'onWin', label: 'Top kazanınca', help: 'Kazanılan topla ilk karar', options: [['hizli', 'Hızlı hücum'], ['sakin', 'Topu sakla']] },
    ],
  },
  {
    title: 'Hücum',
    items: [
      { key: 'buildUp', label: 'Kaleciden oyun kurma', help: 'Aut ve kaleci topları', options: [['kisa', 'Kısa'], ['karisik', 'Karışık'], ['uzun', 'Uzun']] },
      { key: 'passing', label: 'Pas stili', help: '', options: [['kisa', 'Kısa pas'], ['karisik', 'Karışık'], ['direkt', 'Direkt']] },
      { key: 'tempo', label: 'Tempo', help: '', options: [['yavas', 'Yavaş'], ['dengeli', 'Dengeli'], ['hizli', 'Hızlı']] },
      { key: 'width', label: 'Hücum genişliği', help: 'Kanat oyuncularının çizgiye yakınlığı', options: [['dar', 'Dar'], ['dengeli', 'Dengeli'], ['genis', 'Geniş']] },
      { key: 'focus', label: 'Hücum yönü', help: 'Ağırlıklı oynanacak koridor', options: [['sol', 'Sol kanat'], ['merkez', 'Merkez'], ['sag', 'Sağ kanat'], ['dengeli', 'Dengeli']] },
    ],
  },
];

export const INSTRUCTION_LABEL = (ins: TeamInstructions) =>
  INSTRUCTION_GROUPS.flatMap((g) => g.items.map((it) => ({ label: it.label, value: it.options.find(([v]) => v === ins[it.key])?.[1] ?? '' })));

/** Talimatların sahadaki karşılığı (metre) */
export const PRESS_LINE = { alcak: 38, orta: 52.5, yuksek: 70 } as const;
export const DEF_LINE = { derin: 16, normal: 25, yuksek: 36 } as const;
export const WIDTH = { dar: 15, dengeli: 8, genis: 2.5 } as const;

/* ---------------- Maça özel taktik ---------------- */

/** Maç kadrosundan (sahadaki konumlarıyla) yeni taktik iskeleti */
export function tacticFromMatch(m: Match, players: Player[], opts: { name: string; category: Tactic['category']; withOpponent: boolean; half: boolean }): Tactic {
  const tokens: Token[] = [];
  const pos: Record<string, Pt> = {};
  matchSlots(m.pre).forEach((s) => {
    const id = uid('h');
    const pl = players.find((p) => p.id === s.playerId);
    tokens.push({ id, kind: 'home', label: pl ? String(pl.number) : String(+s.key + 1), playerId: pl?.id });
    pos[id] = { ...s.p };
  });
  if (opts.withOpponent && FORMATIONS[m.pre.oppFormation])
    FORMATIONS[m.pre.oppFormation].forEach(([, x, y], i) => {
      const id = uid('a');
      tokens.push({ id, kind: 'away', label: String(i + 1) });
      pos[id] = mirror({ x, y });
    });
  const ball = uid('b');
  tokens.push({ id: ball, kind: 'ball', label: '' });
  pos[ball] = { x: 52.5, y: 34 };
  return {
    id: uid('t'),
    matchId: m.id,
    name: opts.name,
    category: opts.category,
    formation: m.pre.formation,
    awayFormation: opts.withOpponent ? m.pre.oppFormation : undefined,
    half: opts.half,
    tokens,
    frames: [{ pos, drawings: [] }],
    updatedAt: Date.now(),
  };
}

/** Kütüphanedeki bir taktiğin kopyasını maç kadrosuna uyarlar: oyuncular ilk karedeki konumlarına göre eşleştirilir. */
export function adaptTactic(t: Tactic, m: Match, players: Player[]): Tactic {
  const copy: Tactic = JSON.parse(JSON.stringify(t));
  copy.id = uid('t');
  copy.matchId = m.id;
  copy.name = `${t.name} · ${m.opponent || 'maç'}`;
  copy.updatedAt = Date.now();
  const f0 = copy.frames[0].pos;
  const home = copy.tokens.filter((k) => k.kind === 'home' && f0[k.id]);
  const homeRoles = classifyRoles(home.map((k) => ({ id: k.id, p: f0[k.id] })));
  const slots = matchSlots(m.pre).filter((s) => s.playerId);
  const roles = slotRoles(matchSlots(m.pre));
  const res = assign(
    slots.map((s) => ({ id: s.playerId!, p: s.p, role: roles[s.key], natural: players.find((p) => p.id === s.playerId)?.role })),
    home.map((k) => ({ key: k.id, p: f0[k.id], role: homeRoles[k.id] })),
  );
  copy.tokens.forEach((k) => {
    if (k.kind !== 'home') return;
    const pid = res[k.id];
    const pl = players.find((p) => p.id === pid);
    k.playerId = pl?.id;
    if (pl) k.label = String(pl.number);
  });
  return copy;
}

/** Taktik tahtasında bizim oyuncuların mevkileri, ilk karedeki (temel diziliş) konumlarından */
export function tokenRoles(t: Tactic): Record<string, string> {
  if (t.category === 'Antrenman') return {};
  const f0 = t.frames[0]?.pos ?? {};
  const items = t.tokens.filter((k) => k.kind === 'home' && f0[k.id]).map((k) => ({ id: k.id, p: f0[k.id] }));
  return items.length >= 7 ? classifyRoles(items) : {};
}
