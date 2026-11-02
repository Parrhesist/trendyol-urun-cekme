import type { SignId } from './signs';

/** Kuryenin kullandığı araç. Ortak içerikte boş bırakılır. */
export type Vehicle = 'van' | 'pkw';

/** Sadece bir araç türünde gösterilecek içerik */
export interface Only {
  only?: Vehicle;
}

/** Ders içeriğindeki tek bir blok. */
export type Block = Only & (
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'steps'; items: string[] }
  /** Bilgi kutuları: ipucu, uyarı, yasa maddesi, ceza */
  | { t: 'tip' | 'warn' | 'law' | 'fine'; text: string }
  /** Almanca terim ve Türkçe karşılığı */
  | { t: 'terms'; items: [de: string, tr: string][] }
  | { t: 'signs'; items: [sign: SignId, caption: string][] }
  | { t: 'table'; head: [string, string]; rows: [string, string][] });

export interface Question extends Only {
  id: string;
  q: string;
  /** Soruda gösterilen işaret(ler); ikincisi genelde ek tabela */
  sign?: SignId | SignId[];
  options: string[];
  /** Şıklar işaret olarak gösterilir (options metinleri ekran okuyucu içindir) */
  optionSigns?: SignId[];
  /** Doğru şıkkın sırası (0'dan başlar) */
  answer: number;
  why: string;
}

export interface Lesson extends Only {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  blocks: Block[];
  quiz: Question[];
}

export interface Module {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  lessons: Lesson[];
  scenarios?: Scenario[];
}

export type IconName =
  | 'road' | 'parking' | 'law' | 'steering' | 'wrench' | 'heart'
  | 'home' | 'book' | 'check' | 'dict' | 'gear' | 'chevron' | 'back'
  | 'clock' | 'repeat' | 'bolt' | 'close' | 'flame' | 'info' | 'sign' | 'map' | 'van' | 'car' | 'gauge';

/* ---------- Senaryolar (yukarıdan bakış sokak sahneleri) ---------- */
// Sahne koordinatları: 360 × 260 birim. Yaklaşık 10 birim = 1 metre.

export type SceneEl =
  | { k: 'road' | 'walk' | 'bike' | 'gate'; x: number; y: number; w: number; h: number }
  | { k: 'house'; x: number; y: number; w: number; h: number; no?: string; target?: boolean }
  | { k: 'dash' | 'line'; x1: number; y1: number; x2: number; y2: number }
  | { k: 'zebra'; x: number; y: number; w: number; h: number }
  | { k: 'car'; x: number; y: number; v?: boolean; c?: 0 | 1 | 2 }
  /** Direk ve işaret(ler). x,y direğin yerdeki noktası. */
  | { k: 'sign'; x: number; y: number; ids: SignId[]; size?: number }
  /** Beyaz yazılı plaka (ör. Feuerwehrzufahrt) */
  | { k: 'plate'; x: number; y: number; text: string; red?: boolean }
  | { k: 'label'; x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end' }
  | { k: 'arrow'; x: number; y: number; dir: 'r' | 'l' | 'u' | 'd' }
  | { k: 'measure'; x1: number; y1: number; x2: number; y2: number; text: string }
  /** Senin van'ın (vurgu renginde) */
  | { k: 'van'; x: number; y: number; v?: boolean; label?: string; labelY?: number }
  /** Bisikletli, yukarıdan; x,y bisikletin sol/üst ucu */
  | { k: 'rider'; x: number; y: number; v?: boolean }
  /** Yaya, yukarıdan; x,y merkez */
  | { k: 'ped'; x: number; y: number }
  /** Bariyer (Leitplanke) */
  | { k: 'rail'; x1: number; y1: number; x2: number; y2: number }
  /** Köprü veya üst geçit */
  | { k: 'bridge'; x: number; y: number; w: number; h: number; label?: string }
  /** Nötr kutu (koltuk, bagaj, bahçe vb.) */
  | { k: 'box'; x: number; y: number; w: number; h: number; label?: string; tone?: 'seat' | 'trunk' | 'grass' | 'body' | 'wheel' }
  | { k: 'dog'; x: number; y: number }
  | { k: 'fence'; x1: number; y1: number; x2: number; y2: number };

export interface Spot {
  id: 'A' | 'B' | 'C' | 'D';
  x: number;
  y: number;
  /** Dikey park (sokak dikey ise) */
  v?: boolean;
  /** Araç dışı seçenekler için boyut (ör. yaya, üçgen reflektör) */
  w?: number;
  h?: number;
  label: string;
  ok: boolean;
  why: string;
}

export interface SpotScenario extends Only {
  kind?: 'spots';
  id: string;
  title: string;
  /** Durumun anlatımı */
  situation: string;
  question: string;
  scene: SceneEl[];
  spots: Spot[];
  /** Akılda kalacak kural */
  rule: string;
}

/** Sıralama senaryosu: adımlar doğru sırayla seçilir. */
export interface OrderScenario extends Only {
  kind: 'order';
  id: string;
  title: string;
  situation: string;
  question: string;
  /** Doğru sırayla adımlar */
  steps: string[];
  /** Adım adım açıklama (steps ile aynı sırada) */
  notes: string[];
  rule: string;
}

export type Scenario = SpotScenario | OrderScenario;
