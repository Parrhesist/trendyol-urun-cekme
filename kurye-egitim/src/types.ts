import type { SignId } from './signs';

/** Ders içeriğindeki tek bir blok. */
export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'steps'; items: string[] }
  /** Bilgi kutuları: ipucu, uyarı, yasa maddesi, ceza */
  | { t: 'tip' | 'warn' | 'law' | 'fine'; text: string }
  /** Almanca terim ve Türkçe karşılığı */
  | { t: 'terms'; items: [de: string, tr: string][] }
  | { t: 'signs'; items: [sign: SignId, caption: string][] }
  | { t: 'table'; head: [string, string]; rows: [string, string][] };

export interface Question {
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

export interface Lesson {
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
}

export type IconName =
  | 'road' | 'parking' | 'law' | 'steering' | 'wrench' | 'heart'
  | 'home' | 'book' | 'check' | 'dict' | 'gear' | 'chevron' | 'back'
  | 'clock' | 'repeat' | 'bolt' | 'close' | 'flame' | 'info' | 'sign';
