import type { Lesson, Module, Question, Scenario, Vehicle } from '../types';
import { trafik } from './trafik';
import { park } from './park';
import { yasal } from './yasal';
import { surus } from './surus';
import { bakim } from './bakim';
import { saglik } from './saglik';
import { teknik } from './teknik';
import { parseSignQuestion } from '../signquiz';


/** Tüm konular, araç türünden bağımsız (filtrelenmemiş). */
const ALL_MODULES: Module[] = [park, trafik, yasal, surus, teknik, bakim, saglik];

/** İçeriğin en son gözden geçirildiği tarih (ayarlar ekranında gösterilir). */
export const CONTENT_REVIEWED = 'Kasım 2026';

export interface Term {
  de: string;
  tr: string;
  lessonId: string;
  lessonTitle: string;
}

const fits = (v: Vehicle) => (x: { only?: Vehicle }) => !x.only || x.only === v;

function build(v: Vehicle) {
  const ok = fits(v);
  const modules: Module[] = ALL_MODULES.map((m) => ({
    ...m,
    lessons: m.lessons.filter(ok).map((l) => ({ ...l, blocks: l.blocks.filter(ok), quiz: l.quiz.filter(ok) })),
    scenarios: m.scenarios?.filter(ok),
  }));
  const lessons = modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module })));
  const questions = lessons.flatMap(({ lesson }) => lesson.quiz.map((q) => ({ q, lesson })));
  const scenarios = modules.flatMap((module) => (module.scenarios ?? []).map((sc) => ({ sc, module })));
  const seen = new Map<string, Term>();
  for (const { lesson } of lessons) {
    for (const b of lesson.blocks) {
      if (b.t !== 'terms') continue;
      for (const [de, tr] of b.items) {
        const key = de.toLocaleLowerCase('de');
        if (!seen.has(key)) seen.set(key, { de, tr, lessonId: lesson.id, lessonTitle: lesson.title });
      }
    }
  }
  const glossary = [...seen.values()].sort((a, b) => a.de.localeCompare(b.de, 'de'));
  const checklist = CHECKLIST_ALL.map((g) => ({ ...g, items: g.items.filter(ok) }));
  return { modules, lessons, questions, scenarios, glossary, checklist };
}

const cache = new Map<Vehicle, ReturnType<typeof build>>();

// Aşağıdaki dışa aktarımlar seçili araca göre süzülmüş içeriktir. ES modül
// bağlamaları canlıdır: applyVehicle() çağrıldığında içe aktaran her yer yeni
// değerleri görür. App her çizimde önce applyVehicle() çağırır.
export let MODULES: Module[] = [];
export let ALL_LESSONS: { lesson: Lesson; module: Module }[] = [];
export let ALL_QUESTIONS: { q: Question; lesson: Lesson }[] = [];
/** Senaryolar, konu sırasıyla. */
export let SENARYOLAR: { sc: Scenario; module: Module }[] = [];
/** Derslerdeki Almanca terimler, alfabetik ve tekrarsız. */
export let GLOSSARY: Term[] = [];
/** Vardiya öncesi kontrol listesi (Abfahrtskontrolle). */
export let CHECKLIST: CheckGroup[] = [];

export function applyVehicle(v: Vehicle) {
  if (!cache.has(v)) cache.set(v, build(v));
  const c = cache.get(v)!;
  MODULES = c.modules;
  ALL_LESSONS = c.lessons;
  ALL_QUESTIONS = c.questions;
  SENARYOLAR = c.scenarios;
  GLOSSARY = c.glossary;
  CHECKLIST = c.checklist;
}

export const findLesson = (id: string) => ALL_LESSONS.find((x) => x.lesson.id === id);
export const findModule = (id: string) => MODULES.find((m) => m.id === id);

/** Tekrar listesindeki soru: araçtan bağımsız aranır, işaret soruları yeniden üretilir. */
export const findQuestion = (id: string): Question | undefined => {
  for (const m of ALL_MODULES) for (const l of m.lessons) for (const q of l.quiz) if (q.id === id) return q;
  return parseSignQuestion(id);
};

export interface CheckGroup {
  title: string;
  items: { id: string; label: string; hint?: string; only?: Vehicle }[];
}

const CHECKLIST_ALL: CheckGroup[] = [
  {
    title: 'Aracın etrafında',
    items: [
      { id: 'hasar', label: 'Yeni hasar yok, varsa fotoğrafladım', hint: 'Tarih ve saat görünsün' },
      { id: 'lastik', label: 'Lastikler', hint: 'Hava, kesik, yan duvarda şişlik' },
      { id: 'isik', label: 'Işıklar çalışıyor', hint: 'Far, fren, sinyal, geri vites' },
      { id: 'cam', label: 'Camlar ve aynalar temiz ve sağlam' },
      { id: 'plaka', label: 'Plakalar okunuyor' },
    ],
  },
  {
    title: 'Kabinde',
    items: [
      { id: 'uyari', label: 'Motor çalışınca uyarı ışıkları sönüyor' },
      { id: 'fren', label: 'Fren ve el freni tutuyor' },
      { id: 'enerji', label: 'Yakıt veya şarj rotaya yetiyor' },
      { id: 'silecek', label: 'Silecek ve cam suyu çalışıyor' },
      { id: 'ayna', label: 'Koltuk ve aynalar ayarlı' },
      { id: 'tutucu', label: 'Telefon tutucuda sabit' },
    ],
  },
  {
    title: 'Ekipman ve belgeler',
    items: [
      { id: 'yelek', label: 'Reflektif yelek', hint: 'Sürücünün ulaşabileceği yerde' },
      { id: 'ucgen', label: 'Üçgen reflektör' },
      { id: 'ilkyardim', label: 'İlk yardım çantası', hint: 'Son kullanma tarihine bak' },
      { id: 'belge', label: 'Ehliyet ve araç ruhsatı yanımda' },
    ],
  },
  {
    title: 'Yük',
    items: [
      { id: 'yerlesim', label: 'Ağır paketler altta ve önde', only: 'van' },
      { id: 'yerlesim-p', label: 'Ağır paketler bagajda, altta', hint: 'Arka cam önündeki rafta paket yok', only: 'pkw' },
      { id: 'sabit', label: 'Yük sabit, kabinde gevşek paket yok', only: 'van' },
      { id: 'sabit-p', label: 'Arka koltuktaki paketler kemerle sabit veya ayak boşluğunda', only: 'pkw' },
      { id: 'gorus-p', label: 'Arka cam ve aynalardan görüş açık', only: 'pkw' },
      { id: 'kapi', label: 'Yük kapıları kapalı ve kilitli', only: 'van' },
      { id: 'kapi-p', label: 'Bagaj kapalı ve kilitli', only: 'pkw' },
    ],
  },
];

applyVehicle('van');
