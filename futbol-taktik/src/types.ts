// Saha koordinatları metre cinsindendir: x 0–105 (kendi kalemizden rakip kaleye), y 0–68 (üst = sol kanat).
export type Pt = { x: number; y: number };

export type PosGroup = 'KL' | 'DEF' | 'OS' | 'FV';
export type Availability = 'hazir' | 'supheli' | 'sakat' | 'cezali';

export interface Player {
  id: string;
  number: number;
  name: string;
  group: PosGroup;
  role?: string; // tercih edilen mevki kısaltması (STP, SĞB…)
  foot?: 'Sağ' | 'Sol' | 'Çift';
  status: Availability;
  note?: string;
}

export type TokenKind = 'home' | 'away' | 'ball' | 'cone' | 'goal';

export interface Token {
  id: string;
  kind: TokenKind;
  label: string; // forma no ya da mevki
  playerId?: string;
}

export type DrawKind = 'run' | 'pass' | 'dribble' | 'zone' | 'line';

export interface Drawing {
  id: string;
  kind: DrawKind;
  pts: Pt[];
  color: string; // palet anahtarı: a | b | c | d
}

export interface Frame {
  pos: Record<string, Pt>;
  drawings: Drawing[];
  note?: string;
}

export type TacticCategory = 'Sistem' | 'Hücum' | 'Savunma' | 'Geçiş' | 'Duran Top' | 'Antrenman';

export interface Tactic {
  id: string;
  matchId?: string; // bu maç için hazırlanmış taktik
  name: string;
  category: TacticCategory;
  formation: string;
  awayFormation?: string;
  half?: boolean; // yarı saha görünümü
  tokens: Token[];
  frames: Frame[];
  description?: string;
  points?: string; // koçluk noktaları, her satır bir madde
  source?: string; // köken / kaynak
  stepMs?: number; // animasyonda bir adımın süresi
  libId?: string; // hazır kütüphaneden kopyalandıysa kaynağı
  tokenScale?: number; // oyuncu dairesi boyutu (kalabalık duran top çizimleri için küçük)
  updatedAt: number;
}

export interface Drill {
  id: string;
  name: string;
  category: string;
  minutes: number;
  players: string;
  equipment: string;
  objective: string;
  coachingPoints: string;
  tacticId?: string;
}

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  focus: string;
  rpe: number; // 1–10, seans zorluk algısı
  blocks: { drillId: string; minutes: number }[];
  absent: string[];
  notes: string;
}

export type EventType =
  | 'gol'
  | 'isabetli_sut'
  | 'sut'
  | 'top_kazanma'
  | 'top_kaybi'
  | 'faul'
  | 'korner'
  | 'ofsayt'
  | 'sari_kart'
  | 'kirmizi_kart';

export interface MatchEvent {
  id: string;
  minute: number;
  team: 'biz' | 'rakip';
  type: EventType;
  playerId?: string;
  x?: number;
  y?: number;
}

export type StatKey =
  | 'topa_sahip_olma'
  | 'pas'
  | 'isabetli_pas_yuzde'
  | 'xg'
  | 'kosu_km';

export interface Duties {
  captain?: string;
  penalty?: string;
  corner?: string;
  freeKick?: string;
}

export interface TeamInstructions {
  block: 'alcak' | 'orta' | 'yuksek'; // pres başlangıç hattı
  line: 'derin' | 'normal' | 'yuksek'; // savunma hattı
  press: 'az' | 'dengeli' | 'yogun';
  width: 'dar' | 'dengeli' | 'genis';
  tempo: 'yavas' | 'dengeli' | 'hizli';
  passing: 'kisa' | 'karisik' | 'direkt';
  buildUp: 'kisa' | 'karisik' | 'uzun';
  focus: 'sol' | 'merkez' | 'sag' | 'dengeli';
  onWin: 'hizli' | 'sakin';
  onLose: 'karsi_pres' | 'geri_cekil';
  offside: boolean;
}

export interface Match {
  id: string;
  date: string;
  time?: string;
  opponent: string;
  venue: 'İç Saha' | 'Deplasman';
  competition: string;
  pre: {
    formation: string;
    lineup: Record<string, string>; // slot index -> playerId
    bench: string[];
    oppFormation: string;
    oppStrengths: string;
    oppWeaknesses: string;
    oppKeyPlayers: string;
    planAttack: string;
    planDefence: string;
    planTransition: string;
    tacticIds: string[];
    tasks: Record<string, string>; // playerId -> görev
    positions?: Record<string, Pt>; // slot -> sahadaki serbest konum (yoksa diziliş şablonundan)
    duties?: Duties;
    instructions?: TeamInstructions;
  };
  half: {
    us: number | null;
    them: number | null;
    good: string[];
    bad: string[];
    subs: { out: string; in: string }[];
    message: string;
  };
  post: {
    us: number | null;
    them: number | null;
    events: MatchEvent[];
    manual: Partial<Record<StatKey, { us: number | null; them: number | null }>>;
    ratings: Record<string, number>;
    summary: string;
    focusNext: string[];
  };
}

export interface Settings {
  teamName: string;
  shortName: string;
  homeColor: string;
  awayColor: string;
  showNames: boolean;
  labels?: LabelMode;
  appUrl?: string; // TV ve paylaşım bağlantıları için uygulama adresi
}

/** Taktik tahtasında oyuncu altındaki etiket */
export type LabelMode = 'num' | 'name' | 'role' | 'both';

export interface TeamData {
  settings: Settings;
  players: Player[];
  tactics: Tactic[];
  drills: Drill[];
  sessions: Session[];
  matches: Match[];
}

export type Collection = 'players' | 'tactics' | 'drills' | 'sessions' | 'matches';
