import { addDays, cloneFrame, FORMATIONS, makeTactic, todayISO, uid } from './football';
import type { Drawing, Drill, EventType, Match, MatchEvent, Player, Pt, Session, Tactic, TeamData } from './types';

// Örnek veri: uygulamanın ilk açılışta dolu görünmesi için. Ayarlar > "Tüm verileri sil" ile temizlenir.

const P = (number: number, name: string, group: Player['group'], role: string, foot: Player['foot'] = 'Sağ', status: Player['status'] = 'hazir', note = ''): Player => ({
  id: 'p' + number,
  number,
  name,
  group,
  role,
  foot,
  status,
  note,
});

export const samplePlayers: Player[] = [
  P(1, 'Emre Kaya', 'KL', 'KL'),
  P(12, 'Batuhan Öz', 'KL', 'KL'),
  P(2, 'Mert Aydın', 'DEF', 'SĞB'),
  P(3, 'Kerem Yıldız', 'DEF', 'SLB', 'Sol'),
  P(4, 'Onur Demir', 'DEF', 'STP'),
  P(5, 'Serkan Çelik', 'DEF', 'STP', 'Sol'),
  P(15, 'Tolga Arslan', 'DEF', 'STP', 'Sağ', 'supheli', 'Arka adale gerginliği, Perşembe kontrol'),
  P(22, 'Furkan Koç', 'DEF', 'SĞB'),
  P(6, 'Yusuf Şahin', 'OS', 'DOS'),
  P(8, 'Burak Polat', 'OS', 'MO'),
  P(10, 'Arda Erdem', 'OS', 'OOS', 'Sol'),
  P(14, 'Can Yalçın', 'OS', 'MO'),
  P(16, 'Eren Kurt', 'OS', 'DOS', 'Sağ', 'cezali', '4. sarı kart — 1 maç ceza'),
  P(18, 'Hakan Güneş', 'OS', 'MO', 'Çift'),
  P(7, 'Ozan Aksoy', 'FV', 'SĞK'),
  P(11, 'Kaan Tekin', 'FV', 'SLK', 'Sol'),
  P(9, 'Barış Uçar', 'FV', 'FV'),
  P(17, 'Deniz Karaca', 'FV', 'SĞK'),
  P(19, 'Selim Ateş', 'FV', 'FV', 'Sağ', 'sakat', 'Ayak bileği burkulması, ~2 hafta'),
  P(21, 'Umut Bayram', 'FV', 'SLK', 'Sol'),
];

// 4-3-3 sırası: KL, SLB, STP, STP, SĞB, DOS, MO, MO, SLK, FV, SĞK
const XI_433 = ['p1', 'p3', 'p5', 'p4', 'p2', 'p6', 'p10', 'p8', 'p11', 'p9', 'p7'];

const dr = (kind: Drawing['kind'], pts: [number, number][], color = 'a'): Drawing => ({
  id: uid('d'),
  kind,
  color,
  pts: pts.map(([x, y]) => ({ x, y })),
});

function homeIds(t: Tactic) {
  return t.tokens.filter((k) => k.kind === 'home').map((k) => k.id);
}
function awayIds(t: Tactic) {
  return t.tokens.filter((k) => k.kind === 'away').map((k) => k.id);
}
const ballId = (t: Tactic) => t.tokens.find((k) => k.kind === 'ball')!.id;

/** Önceki karede belirli oyuncuları yeni konumlara taşıyan yeni kare ekler */
function step(t: Tactic, moves: Record<string, Pt>, drawings: Drawing[], note: string) {
  const prev = t.frames[t.frames.length - 1];
  const f = cloneFrame(prev);
  Object.entries(moves).forEach(([id, p]) => (f.pos[id] = p));
  f.drawings = drawings;
  f.note = note;
  t.frames.push(f);
}

function numbersFor(lineup: string[]) {
  return lineup.map((id) => samplePlayers.find((p) => p.id === id)?.number);
}

function buildUpTactic(): Tactic {
  const t = makeTactic('Kaleden oyun kurma — 4-3-3', '4-3-3', { away: '4-4-2', lineup: XI_433, numbers: numbersFor(XI_433), category: 'Hücum' });
  t.description = 'Rakip 2 forvetle pres yaparken DOS stoperlerin arasına iner, bekler yükselir, üçüncü adam ile çıkış.';
  const h = homeIds(t);
  const a = awayIds(t);
  const b = ballId(t);
  const f0 = t.frames[0];
  f0.pos[b] = { x: 6.5, y: 36 };
  f0.note = 'Başlangıç: top kalecide, rakip ikili forvetle önde bekliyor.';
  step(
    t,
    { [h[5]]: { x: 14, y: 34 }, [h[2]]: { x: 13, y: 18 }, [h[3]]: { x: 13, y: 50 }, [h[1]]: { x: 36, y: 6 }, [h[4]]: { x: 36, y: 62 }, [b]: { x: 13.5, y: 50 }, [a[9]]: { x: 22, y: 30 }, [a[10]]: { x: 24, y: 44 } },
    [dr('run', [[37, 34], [26, 36], [14, 34]], 'b'), dr('pass', [[6.5, 36], [13, 50]]), dr('run', [[24, 10], [31, 7], [36, 6]], 'b'), dr('run', [[24, 58], [31, 61], [36, 62]], 'b')],
    'DOS (6) stoperlerin arasına iner → 3’lü arka hat. Bekler kenar çizgisine kadar açılır. Kaleci sağ stopere oynar.',
  );
  step(
    t,
    { [h[7]]: { x: 33, y: 46 }, [b]: { x: 33, y: 46 }, [a[6]]: { x: 38, y: 40 } },
    [dr('run', [[47, 46], [40, 47], [33, 46]], 'b'), dr('pass', [[13.5, 50], [33, 46]]), dr('zone', [[28, 40], [40, 52]], 'c')],
    'Sağ MO (8) boşluğa düşer, stoper dikine pası verir. Sarı bölge: rakip orta sahanın arkası.',
  );
  step(
    t,
    { [b]: { x: 36, y: 62 }, [h[10]]: { x: 70, y: 52 }, [h[9]]: { x: 74, y: 38 } },
    [dr('pass', [[33, 46], [36, 62]]), dr('run', [[66, 56], [70, 52]], 'b'), dr('run', [[70, 34], [74, 38]], 'b')],
    'Üçüncü adam: 8 numara tek dokunuşla öne çıkan sağ beke (2). Kanat içeri kat eder, bek koridoru kullanır.',
  );
  step(
    t,
    { [h[4]]: { x: 62, y: 62 }, [b]: { x: 62, y: 62 } },
    [dr('dribble', [[36, 62], [50, 63], [62, 62]], 'a'), dr('pass', [[62, 62], [74, 40]], 'd')],
    'Bek topla ilerler, ceza sahası içine kesme orta veya içeri kat eden kanada pas.',
  );
  return t;
}

function pressTactic(): Tactic {
  const t = makeTactic('Önde pres — tetikleyici: geri pas', '4-3-3', { away: '4-4-2', lineup: XI_433, numbers: numbersFor(XI_433), category: 'Savunma' });
  t.description = 'Rakip stopere geri pas = pres tetikleyicisi. Forvet pas açısını kapatır, kanatlar bekleri gölgeler.';
  const h = homeIds(t);
  const a = awayIds(t);
  const b = ballId(t);
  t.frames[0].pos[b] = { x: 70, y: 46 };
  t.frames[0].note = 'Rakip sol stoperde top (sağ tarafımız). Blok orta saha çizgisi civarında.';
  step(
    t,
    { [h[9]]: { x: 76, y: 42 }, [h[10]]: { x: 76, y: 56 }, [h[8]]: { x: 74, y: 26 }, [h[7]]: { x: 64, y: 44 }, [h[6]]: { x: 62, y: 30 }, [h[5]]: { x: 52, y: 36 } },
    [dr('run', [[70, 34], [76, 42]], 'b'), dr('run', [[66, 56], [76, 56]], 'b'), dr('run', [[47, 46], [64, 44]], 'b'), dr('zone', [[70, 36], [86, 60]], 'c')],
    'Forvet (9) içeriden dışa koşarak geri pas yolunu keser. Kanat (7) beki gölgeler, 8 numara yakındaki orta sahacıyı alır. Tuzak bölgesi: sarı alan.',
  );
  step(
    t,
    { [b]: { x: 82, y: 62 }, [a[4]]: { x: 82, y: 62 }, [h[10]]: { x: 80, y: 60 }, [h[4]]: { x: 70, y: 60 } },
    [dr('pass', [[70, 46], [82, 62]], 'd'), dr('run', [[24, 58], [50, 60], [70, 60]], 'b'), dr('line', [[30, 6], [30, 62]], 'a')],
    'Top kenara gider = kenar çizgisi ikinci savunmacı. Sağ bek agresif çıkar, savunma hattı 30 m’ye yükselir.',
  );
  return t;
}

function cornerTactic(): Tactic {
  const t = makeTactic('Korner — ön direk blok', '4-3-3', { away: '4-4-2', lineup: XI_433, numbers: numbersFor(XI_433), category: 'Duran Top' });
  t.half = true;
  t.description = 'Sol korner. 5 kişilik ceza sahası yüklemesi, ön direğe blok ve arka direğe gecikmeli koşu.';
  const h = homeIds(t);
  const a = awayIds(t);
  const b = ballId(t);
  const f = t.frames[0];
  const place: Record<number, Pt> = { 0: { x: 6, y: 34 }, 1: { x: 52, y: 20 }, 2: { x: 92, y: 30 }, 3: { x: 90, y: 38 }, 4: { x: 52, y: 48 }, 5: { x: 70, y: 34 }, 6: { x: 86, y: 20 }, 7: { x: 84, y: 44 }, 8: { x: 104, y: 1 }, 9: { x: 94, y: 26 }, 10: { x: 87, y: 50 } };
  Object.entries(place).forEach(([i, p]) => (f.pos[h[+i]] = p));
  const def: Pt[] = [{ x: 104, y: 30 }, { x: 104, y: 38 }, { x: 99, y: 28 }, { x: 99, y: 34 }, { x: 99, y: 40 }, { x: 96, y: 31 }, { x: 96, y: 37 }, { x: 94, y: 44 }, { x: 98, y: 24 }, { x: 88, y: 34 }, { x: 66, y: 34 }];
  a.forEach((id, i) => (f.pos[id] = def[i]));
  f.pos[b] = { x: 104, y: 1 };
  f.note = 'Diziliş: 4 (STP) ön direk bloğu, 5 ve 9 ortada, 2 numara arka direkten gecikmeli.';
  step(
    t,
    { [h[2]]: { x: 99, y: 26 }, [h[9]]: { x: 100, y: 31 }, [h[3]]: { x: 98, y: 38 }, [h[10]]: { x: 99, y: 46 }, [b]: { x: 99, y: 31 } },
    [dr('pass', [[104, 1], [96, 14], [99, 31]], 'd'), dr('run', [[92, 30], [99, 26]], 'b'), dr('run', [[94, 26], [97, 30], [100, 31]], 'b'), dr('run', [[87, 50], [92, 49], [99, 46]], 'b')],
    'İç falso orta ön direğe. 9 numara blok arkasından kafa vuruşu. 2 numara arka direğe sızar, 8 numara ceza yayında ikinci top.',
  );
  return t;
}

function counterTactic(): Tactic {
  const t = makeTactic('Hızlı hücum — sol kanat', '4-2-3-1', { away: '4-3-3', category: 'Geçiş' });
  t.description = 'Top kazanıldığı anda 3 pasta şut. İlk pas ileriye, kanatlar çizgiye, forvet ön direğe.';
  const h = homeIds(t);
  const b = ballId(t);
  const XI = ['p1', 'p3', 'p5', 'p4', 'p2', 'p6', 'p8', 'p11', 'p10', 'p7', 'p9'];
  t.tokens.filter((k) => k.kind === 'home').forEach((k, i) => {
    k.playerId = XI[i];
    k.label = String(samplePlayers.find((p) => p.id === XI[i])?.number ?? k.label);
  });
  t.frames[0].pos[b] = { x: 38, y: 30 };
  t.frames[0].note = 'Top 6 numarada kazanıldı.';
  step(t, { [b]: { x: 56, y: 34 }, [h[7]]: { x: 70, y: 10 }, [h[10]]: { x: 82, y: 32 } }, [dr('pass', [[38, 30], [56, 34]]), dr('run', [[56, 13], [70, 10]], 'b'), dr('run', [[72, 34], [82, 32]], 'b')], 'İlk pas 10 numaraya, sol kanat çizgiye açılır.');
  step(t, { [b]: { x: 84, y: 10 }, [h[7]]: { x: 84, y: 10 }, [h[9]]: { x: 88, y: 40 } }, [dr('pass', [[56, 34], [72, 12]]), dr('dribble', [[72, 12], [84, 10]]), dr('run', [[56, 55], [72, 50], [88, 40]], 'b')], 'Kanat derin taşır, sağ kanat arka direğe koşar.');
  step(t, { [b]: { x: 95, y: 31 }, [h[10]]: { x: 95, y: 31 } }, [dr('pass', [[84, 10], [95, 31]], 'd')], 'Yerden kesme ortaya forvet ön direkte.');
  return t;
}

function drillDiagram(name: string, setup: (t: Tactic) => void): Tactic {
  const t = makeTactic(name, '4-3-3', { category: 'Antrenman' });
  t.tokens = [];
  t.frames = [{ pos: {}, drawings: [] }];
  setup(t);
  return t;
}

function addTok(t: Tactic, kind: Tactic['tokens'][number]['kind'], label: string, p: Pt) {
  const id = uid(kind[0]);
  t.tokens.push({ id, kind, label });
  t.frames[0].pos[id] = p;
  return id;
}

function rondoDiagram() {
  return drillDiagram('Rondo 5v2', (t) => {
    t.half = true;
    const c = { x: 80, y: 34 };
    [0, 1, 2, 3, 4].forEach((i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      addTok(t, 'home', String(i + 1), { x: c.x + Math.cos(a) * 9, y: c.y + Math.sin(a) * 9 });
    });
    addTok(t, 'away', 'A', { x: 78, y: 33 });
    addTok(t, 'away', 'B', { x: 83, y: 36 });
    addTok(t, 'ball', '', { x: 80, y: 25.5 });
    [[70, 24], [90, 24], [70, 44], [90, 44]].forEach(([x, y]) => addTok(t, 'cone', '', { x, y }));
    t.frames[0].drawings = [dr('pass', [[80, 25], [88.5, 31]]), dr('pass', [[88.5, 31], [74.7, 41.2]]), dr('run', [[78, 33], [84, 32]], 'b')];
  });
}

function ssgDiagram() {
  return drillDiagram('4v4+3 pozisyon oyunu', (t) => {
    t.half = true;
    [[62, 20], [62, 48], [80, 22], [80, 46]].forEach(([x, y], i) => addTok(t, 'home', String(i + 1), { x, y }));
    [[68, 30], [68, 40], [76, 30], [76, 40]].forEach(([x, y], i) => addTok(t, 'away', String(i + 1), { x, y }));
    [[54, 34], [88, 34], [71, 14]].forEach(([x, y]) => addTok(t, 'home', 'J', { x, y }));
    addTok(t, 'ball', '', { x: 55, y: 34 });
    [[54, 14], [88, 14], [54, 54], [88, 54]].forEach(([x, y]) => addTok(t, 'cone', '', { x, y }));
    t.frames[0].drawings = [dr('zone', [[54, 14], [88, 54]], 'c'), dr('pass', [[55, 34], [62, 20]]), dr('pass', [[62, 20], [80, 22]])];
  });
}

function finishingDiagram() {
  return drillDiagram('Kanat ortası ve bitiricilik', (t) => {
    t.half = true;
    addTok(t, 'goal', '', { x: 105, y: 34 });
    addTok(t, 'home', '7', { x: 78, y: 60 });
    addTok(t, 'home', '9', { x: 80, y: 36 });
    addTok(t, 'home', '11', { x: 82, y: 22 });
    addTok(t, 'home', 'KL', { x: 104, y: 34 });
    addTok(t, 'ball', '', { x: 79, y: 60 });
    [[86, 62], [94, 62]].forEach(([x, y]) => addTok(t, 'cone', '', { x, y }));
    t.frames[0].drawings = [dr('dribble', [[79, 61], [96, 62]]), dr('pass', [[96, 62], [99, 36]], 'd'), dr('run', [[80, 36], [94, 34], [99, 36]], 'b'), dr('run', [[82, 22], [96, 28], [100, 30]], 'b')];
  });
}

function pressDiagram() {
  return drillDiagram('Geçiş oyunu 6v6 — 5 saniye kuralı', (t) => {
    [[40, 20], [40, 48], [50, 34], [60, 20], [60, 48], [66, 34]].forEach(([x, y], i) => addTok(t, 'home', String(i + 1), { x, y }));
    [[44, 26], [44, 42], [55, 30], [55, 40], [63, 26], [63, 44]].forEach(([x, y], i) => addTok(t, 'away', String(i + 1), { x, y }));
    addTok(t, 'goal', '', { x: 33, y: 34 });
    addTok(t, 'goal', '', { x: 72, y: 34 });
    addTok(t, 'ball', '', { x: 56, y: 31 });
    t.frames[0].drawings = [dr('zone', [[34, 10], [72, 58]], 'c'), dr('run', [[50, 34], [55, 31]], 'b'), dr('run', [[60, 20], [56, 28]], 'b')];
  });
}

function toolsFromTactics() {
  const diagrams = [rondoDiagram(), ssgDiagram(), finishingDiagram(), pressDiagram()];
  const drills: Drill[] = [
    { id: 'drA', name: 'Isınma — aktivasyon ve koordinasyon', category: 'Isınma', minutes: 15, players: 'Tüm kadro', equipment: 'Merdiven, huni', objective: 'Kas aktivasyonu, sakatlık önleme (FIFA 11+).', coachingPoints: 'Diz içe kaçmasın\nİniş yumuşak\nTempo kademeli artsın' },
    { id: 'drB', name: 'Rondo 5v2', category: 'Teknik', minutes: 12, players: '7 (5+2)', equipment: '4 huni, 2 top', objective: 'Tek-iki dokunuş, vücut açısı, pres altında pas.', coachingPoints: 'Topu almadan önce omuz kontrolü\nPas uzak ayağa\nİki pres oyuncusu arası çizgiye pas yok', tacticId: diagrams[0].id },
    { id: 'drC', name: '4v4+3 pozisyon oyunu', category: 'Taktik', minutes: 20, players: '11 (4+4+3 joker)', equipment: '4 huni, yelek 3 renk', objective: 'Hat kırma, üçüncü adam, genişlik-derinlik.', coachingPoints: 'Joker iki dokunuş\n6 pas = 1 puan\nArası açılan iki rakip arasından dikine pas', tacticId: diagrams[1].id },
    { id: 'drD', name: 'Kanat ortası ve bitiricilik', category: 'Bitiricilik', minutes: 15, players: '3 + kaleci', equipment: '2 huni, kale', objective: 'Kanattan derin taşıma, yerden kesme orta, ön-arka direk koşusu.', coachingPoints: 'Koşu zamanlaması ortadan hemen önce\nÖn direk – arka direk – ceza yayı\nİlk dokunuş şut', tacticId: diagrams[2].id },
    { id: 'drE', name: 'Geçiş oyunu 6v6 — 5 saniye kuralı', category: 'Taktik', minutes: 20, players: '12 + 2 kaleci', equipment: '2 mini kale, huni', objective: 'Top kaybı sonrası 5 saniyede geri kazanma.', coachingPoints: 'Kayıpta en yakın 3 oyuncu basar\nUzak oyuncular pas yollarını kapatır\n5 sn sonra blok kur', tacticId: diagrams[3].id },
    { id: 'drF', name: 'Soğuma ve esneme', category: 'Toparlanma', minutes: 10, players: 'Tüm kadro', equipment: '—', objective: 'Toparlanma, statik esneme.', coachingPoints: 'Hamstring ve kalça fleksör\nNefes kontrolü' },
  ];
  return { diagrams, drills };
}

function ev(minute: number, team: 'biz' | 'rakip', type: EventType, playerId?: string, x?: number, y?: number): MatchEvent {
  return { id: uid('e'), minute, team, type, playerId, x, y };
}

function blankMatch(over: Partial<Match> & Pick<Match, 'date' | 'opponent'>): Match {
  return {
    id: uid('m'),
    venue: 'İç Saha',
    competition: 'BAL Ligi',
    time: '15:00',
    ...over,
    pre: {
      formation: '4-3-3',
      lineup: Object.fromEntries(XI_433.map((id, i) => [String(i), id])),
      bench: ['p12', 'p22', 'p14', 'p18', 'p17', 'p21'],
      oppFormation: '4-4-2',
      oppStrengths: '',
      oppWeaknesses: '',
      oppKeyPlayers: '',
      planAttack: '',
      planDefence: '',
      planTransition: '',
      tacticIds: [],
      tasks: {},
      ...over.pre,
    },
    half: { us: null, them: null, good: [], bad: [], subs: [], message: '', ...over.half },
    post: { us: null, them: null, events: [], manual: {}, ratings: {}, summary: '', focusNext: [], ...over.post },
  };
}

function randomShots(team: 'biz' | 'rakip', n: number, seed: number, players: string[]): MatchEvent[] {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const out: MatchEvent[] = [];
  for (let i = 0; i < n; i++) {
    const x = team === 'biz' ? 82 + r() * 20 : 3 + r() * 20;
    const y = 18 + r() * 32;
    out.push(ev(Math.round(3 + r() * 87), team, r() < 0.45 ? 'isabetli_sut' : 'sut', team === 'biz' ? players[Math.floor(r() * players.length)] : undefined, +x.toFixed(1), +y.toFixed(1)));
  }
  return out;
}

function randomField(team: 'biz' | 'rakip', type: EventType, n: number, seed: number, players: string[]): MatchEvent[] {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => {
    const x = type === 'top_kazanma' ? 15 + r() * 60 : 30 + r() * 65;
    return ev(Math.round(2 + r() * 88), team, type, team === 'biz' ? players[Math.floor(r() * players.length)] : undefined, +x.toFixed(1), +(4 + r() * 60).toFixed(1));
  });
}

export function buildSample(): TeamData {
  const today = todayISO();
  const tactics = [buildUpTactic(), pressTactic(), cornerTactic(), counterTactic()];
  const { diagrams, drills } = toolsFromTactics();
  // listede maç taktikleri önde, antrenman diyagramları sonda görünsün
  const now = Date.now();
  tactics.forEach((t, i) => (t.updatedAt = now - i * 60000));
  diagrams.forEach((t, i) => (t.updatedAt = now - 86400000 - i * 60000));

  const outfield = XI_433.slice(1);
  const played = (daysAgo: number, opp: string, us: number, them: number, halfUs: number, halfThem: number, seed: number, venue: Match['venue']) => {
    const goals: MatchEvent[] = [];
    for (let i = 0; i < us; i++) goals.push(ev(20 + i * 23 + (seed % 7), 'biz', 'gol', ['p9', 'p10', 'p11', 'p7'][i % 4], 94 + (i % 3) * 3, 28 + ((i * 7) % 12)));
    for (let i = 0; i < them; i++) goals.push(ev(35 + i * 19, 'rakip', 'gol', undefined, 8 + (i % 2) * 4, 30 + i * 4));
    const events = [
      ...goals,
      ...randomShots('biz', 9 + (seed % 4), seed, ['p9', 'p10', 'p11', 'p7', 'p8']),
      ...randomShots('rakip', 6 + (seed % 3), seed + 7, []),
      ...randomField('biz', 'top_kazanma', 22, seed + 3, outfield),
      ...randomField('biz', 'top_kaybi', 14, seed + 5, outfield),
      ...randomField('biz', 'faul', 9, seed + 11, outfield),
      ...randomField('rakip', 'faul', 11, seed + 13, []),
      ...Array.from({ length: 5 }, (_, i) => ev(10 + i * 15, 'biz', 'korner')),
      ...Array.from({ length: 3 }, (_, i) => ev(18 + i * 20, 'rakip', 'korner')),
      ev(61, 'biz', 'sari_kart', 'p6'),
      ev(77, 'rakip', 'sari_kart'),
      ev(33, 'biz', 'ofsayt', 'p9'),
    ].sort((a, b) => a.minute - b.minute);
    const ratings: Record<string, number> = {};
    XI_433.forEach((id, i) => (ratings[id] = Math.round((6 + ((seed + i * 3) % 7) / 2) * 2) / 2));
    return blankMatch({
      date: addDays(today, -daysAgo),
      opponent: opp,
      venue,
      pre: { oppFormation: '4-4-2' } as Match['pre'],
      half: { us: halfUs, them: halfThem, good: ['Önde pres tetikleyicileri', 'Sol kanat bindirmeleri'], bad: ['İkinci top mücadelesi'], subs: [], message: '' },
      post: {
        us,
        them,
        events,
        manual: {
          topa_sahip_olma: { us: 52 + (seed % 9), them: 48 - (seed % 9) },
          pas: { us: 410 + seed * 3, them: 360 + seed },
          isabetli_pas_yuzde: { us: 81, them: 76 },
          xg: { us: +(1.2 + (seed % 5) * 0.3).toFixed(2), them: +(0.7 + (seed % 3) * 0.2).toFixed(2) },
        },
        ratings,
        summary: us > them ? 'Oyun planına sadık kaldık; pres tetikleyicileri işe yaradı.' : us === them ? 'İkinci yarı tempo düştü, duran top savunmasında sorun yaşadık.' : 'Geçiş savunmasında geç kaldık, ikinci toplar rakipte kaldı.',
        focusNext: us >= them ? ['Bitiricilik — kanat ortaları'] : ['Geçiş savunması', 'İkinci top mücadelesi'],
      },
    });
  };

  const matches: Match[] = [
    played(23, 'Yıldırım Gençlik', 2, 1, 1, 0, 3, 'İç Saha'),
    played(16, 'Çınar SK', 1, 1, 0, 1, 8, 'Deplasman'),
    played(9, 'Sahil Belediyespor', 0, 2, 0, 1, 12, 'Deplasman'),
    played(2, 'Göztepe Mahalle FK', 3, 1, 1, 1, 5, 'İç Saha'),
    blankMatch({
      date: addDays(today, 5),
      opponent: 'Doğan Spor Kulübü',
      venue: 'Deplasman',
      pre: {
        formation: '4-3-3',
        lineup: Object.fromEntries(XI_433.map((id, i) => [String(i), id])),
        bench: ['p12', 'p22', 'p14', 'p18', 'p17', 'p21', 'p15'],
        oppFormation: '4-4-2',
        oppStrengths: 'Hava topları — iki uzun stoper ve hedef forvet\nDuran toplarda tehlikeli (son 5 maçta 4 gol)\nSağ kanatları hızlı',
        oppWeaknesses: 'Orta saha ikilisi arası açılıyor\nBekler hücuma çıkınca arkaları boş\nGeri pas altında stoperler rahatsız',
        oppKeyPlayers: '9 — hedef forvet, sırtı dönük oyunda güçlü\n7 — sağ kanat, içeri kat edip sol ayakla şut\n4 — stoper, duran top hücumunda ilk adam',
        planAttack: 'Kaleden kısa oyun kurma, DOS stoperler arasına. Orta saha ikilisi arasındaki boşlukta 10 numara.',
        planDefence: 'Orta blok, geri pas tetikleyicisiyle önde pres. Hedef forvete ikinci top için DOS yakın.',
        planTransition: 'Top kazanınca ilk pas ileri, sol kanat derinlik koşusu. Kayıpta 5 saniye pres.',
        tacticIds: [tactics[0].id, tactics[1].id, tactics[2].id],
        tasks: {
          p6: 'Stoperler arasına in, 9 numaranın sırtında kal.',
          p10: 'Rakip MO ikilisi arasında konumlan, dönerek oyna.',
          p2: 'Bindirmeleri geç tetikle; 7 numara içeri kat ederken sağ kenarı koru.',
          p9: 'Geri pası tetikleyici say, kaleciye açıyı kapat.',
        },
      } as Match['pre'],
    }),
  ];

  const ws = (n: number) => addDays(today, -n);
  const sessions: Session[] = [];
  const plan: [number, string, string, number, [string, number][]][] = [];
  // son 4 hafta + bu hafta: haftada 3 seans
  for (let w = 4; w >= 0; w--) {
    plan.push([w * 7 + 6, 'Toparlanma + teknik', 'Toparlanma', 3, [['drA', 15], ['drB', 15], ['drF', 15]]]);
    plan.push([w * 7 + 4, 'Taktik — oyun kurma', 'Oyun kurma', 6 + (w % 2), [['drA', 15], ['drC', 25], ['drD', 20], ['drF', 10]]]);
    plan.push([w * 7 + 2, 'Yoğun — geçiş oyunu', 'Geçiş', 8 - (w % 3 === 0 ? 1 : 0), [['drA', 15], ['drB', 12], ['drE', 30 + w * 2], ['drF', 10]]]);
  }
  plan.forEach(([d, title, focus, rpe, blocks], i) => {
    const date = ws(d - 4);
    sessions.push({ id: 's' + i, date, title, focus, rpe, blocks: blocks.map(([drillId, minutes]) => ({ drillId, minutes })), absent: i % 3 === 0 ? ['p19'] : ['p19', 'p15'], notes: '' });
  });

  return {
    settings: { teamName: 'Kartal Gençlik SK', shortName: 'KGS', homeColor: '#d4452b', awayColor: '#2f5d9e', showNames: false },
    players: samplePlayers,
    tactics: [...tactics, ...diagrams],
    drills,
    sessions,
    matches,
  };
}

export const EMPTY_FORMATION_LINEUP = (f: string) => FORMATIONS[f].map(() => undefined);
