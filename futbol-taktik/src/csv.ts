import { EVENT_META, MANUAL_STATS, uid } from './football';
import type { EventType, MatchEvent, Player, PosGroup, StatKey } from './types';

/** Basit CSV ayrıştırıcı: virgül, noktalı virgül (Türkçe Excel) ve sekme desteklenir, tırnaklı alanlar dahil. */
export function parseCSV(text: string): string[][] {
  const first = text.split(/\r?\n/)[0] ?? '';
  const delim = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const norm = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const num = (s?: string) => {
  if (s == null || s === '') return undefined;
  const v = Number(s.replace(',', '.').replace('%', ''));
  return isNaN(v) ? undefined : v;
};

function table(text: string) {
  const rows = parseCSV(text);
  const head = (rows.shift() ?? []).map(norm);
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

export const EVENTS_TEMPLATE = `dakika;takim;olay;forma_no;x;y
12;biz;isabetli_sut;9;92;30
23;biz;gol;10;96;36
31;rakip;sut;;12;40
44;biz;top_kazanma;6;48;22`;

const EVENT_ALIASES: Record<string, EventType> = {
  gol: 'gol',
  goal: 'gol',
  isabetli_sut: 'isabetli_sut',
  shot_on_target: 'isabetli_sut',
  sut: 'sut',
  isabetsiz_sut: 'sut',
  shot: 'sut',
  top_kazanma: 'top_kazanma',
  recovery: 'top_kazanma',
  top_kaybi: 'top_kaybi',
  loss: 'top_kaybi',
  faul: 'faul',
  foul: 'faul',
  korner: 'korner',
  corner: 'korner',
  ofsayt: 'ofsayt',
  offside: 'ofsayt',
  sari_kart: 'sari_kart',
  yellow: 'sari_kart',
  kirmizi_kart: 'kirmizi_kart',
  red: 'kirmizi_kart',
};

export function importEvents(text: string, players: Player[]): { events: MatchEvent[]; skipped: number } {
  let skipped = 0;
  const events: MatchEvent[] = [];
  for (const r of table(text)) {
    const type = EVENT_ALIASES[norm(r.olay ?? r.type ?? r.event ?? '')];
    const minute = num(r.dakika ?? r.minute);
    if (!type || minute == null) {
      skipped++;
      continue;
    }
    const team = /rakip|opp|them|away/.test(norm(r.takim ?? r.team ?? '')) ? 'rakip' : 'biz';
    const no = num(r.forma_no ?? r.no ?? r.number);
    const pl = team === 'biz' && no != null ? players.find((p) => p.number === no) : undefined;
    let x = num(r.x);
    let y = num(r.y);
    // 0–100 yüzde ölçeği verilmişse metreye çevir
    if (x != null && y != null && (r.olcek ?? '').startsWith('%')) {
      x = (x / 100) * 105;
      y = (y / 100) * 68;
    }
    events.push({ id: uid('e'), minute, team, type, playerId: pl?.id, x, y });
  }
  return { events, skipped };
}

export const STATS_TEMPLATE = `istatistik;biz;rakip
topa_sahip_olma;54;46
pas;436;371
isabetli_pas_yuzde;82;77
xg;1.65;0.84
kosu_km;108.2;104.9`;

export function importStats(text: string) {
  const out: Partial<Record<StatKey, { us: number | null; them: number | null }>> = {};
  const keys = new Set(MANUAL_STATS.map((s) => s.key));
  const aliases: Record<string, StatKey> = { possession: 'topa_sahip_olma', passes: 'pas', pass_accuracy: 'isabetli_pas_yuzde', distance_km: 'kosu_km' };
  for (const r of table(text)) {
    const k0 = norm(r.istatistik ?? r.stat ?? '');
    const k = (keys.has(k0 as StatKey) ? k0 : aliases[k0]) as StatKey | undefined;
    if (!k) continue;
    out[k] = { us: num(r.biz ?? r.us) ?? null, them: num(r.rakip ?? r.them) ?? null };
  }
  return out;
}

export const PLAYERS_TEMPLATE = `forma_no;ad_soyad;mevki;ayak
1;Emre Kaya;KL;Sağ
4;Onur Demir;STP;Sağ
10;Arda Erdem;OOS;Sol`;

const GROUP_FROM_ROLE = (role: string): PosGroup => {
  const r = role.toLocaleUpperCase('tr-TR');
  if (r === 'KL' || r === 'GK') return 'KL';
  if (['SLB', 'SĞB', 'STP', 'DEF', 'SLKB', 'SĞKB', 'CB', 'LB', 'RB'].includes(r)) return 'DEF';
  if (['DOS', 'MO', 'OOS', 'OS', 'CM', 'DM', 'AM'].includes(r)) return 'OS';
  return 'FV';
};

export function importPlayers(text: string): Player[] {
  return table(text)
    .map((r) => {
      const number = num(r.forma_no ?? r.no ?? r.number);
      const name = r.ad_soyad ?? r.ad ?? r.name ?? '';
      if (number == null || !name) return null;
      const role = (r.mevki ?? r.position ?? '').toLocaleUpperCase('tr-TR');
      const foot = norm(r.ayak ?? '');
      return {
        id: uid('p'),
        number,
        name,
        role: role || undefined,
        group: GROUP_FROM_ROLE(role),
        foot: foot.startsWith('sol') ? 'Sol' : foot.startsWith('cift') ? 'Çift' : 'Sağ',
        status: 'hazir',
      } as Player;
    })
    .filter((p): p is Player => !!p);
}

export const EVENT_KEYS = Object.keys(EVENT_META).join(', ');
