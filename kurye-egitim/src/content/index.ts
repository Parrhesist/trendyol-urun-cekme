import type { Lesson, Module, Question } from '../types';
import { trafik } from './trafik';
import { park } from './park';
import { yasal } from './yasal';
import { surus } from './surus';
import { bakim } from './bakim';
import { saglik } from './saglik';
import { parseSignQuestion } from '../signquiz';
import { SENARYOLAR } from './senaryolar';

export { SENARYOLAR };

export const MODULES: Module[] = [park, trafik, yasal, surus, bakim, saglik];

/** İçeriğin en son gözden geçirildiği tarih (ayarlar ekranında gösterilir). */
export const CONTENT_REVIEWED = 'Kasım 2026';

export const ALL_LESSONS: { lesson: Lesson; module: Module }[] = MODULES.flatMap((module) =>
  module.lessons.map((lesson) => ({ lesson, module })),
);

export const ALL_QUESTIONS: { q: Question; lesson: Lesson }[] = ALL_LESSONS.flatMap(({ lesson }) =>
  lesson.quiz.map((q) => ({ q, lesson })),
);

export const findLesson = (id: string) => ALL_LESSONS.find((x) => x.lesson.id === id);
export const findModule = (id: string) => MODULES.find((m) => m.id === id);
/** Ders sorusu veya otomatik üretilen işaret sorusu. */
export const findQuestion = (id: string): Question | undefined =>
  ALL_QUESTIONS.find((x) => x.q.id === id)?.q ?? parseSignQuestion(id);

export interface Term {
  de: string;
  tr: string;
  lessonId: string;
  lessonTitle: string;
}

/** Derslerdeki tüm Almanca terimler, alfabetik ve tekrarsız. */
export const GLOSSARY: Term[] = (() => {
  const seen = new Map<string, Term>();
  for (const { lesson } of ALL_LESSONS) {
    for (const b of lesson.blocks) {
      if (b.t !== 'terms') continue;
      for (const [de, tr] of b.items) {
        const key = de.toLocaleLowerCase('de');
        if (!seen.has(key)) seen.set(key, { de, tr, lessonId: lesson.id, lessonTitle: lesson.title });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.de.localeCompare(b.de, 'de'));
})();

export interface CheckGroup {
  title: string;
  items: { id: string; label: string; hint?: string }[];
}

/** Vardiya öncesi kontrol listesi (Abfahrtskontrolle). */
export const CHECKLIST: CheckGroup[] = [
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
      { id: 'yerlesim', label: 'Ağır paketler altta ve önde' },
      { id: 'sabit', label: 'Yük sabit, kabinde gevşek paket yok' },
      { id: 'kapi', label: 'Yük kapıları kapalı ve kilitli' },
    ],
  },
];
