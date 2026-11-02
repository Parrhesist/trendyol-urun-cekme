// İşaret testi: soruları işaret listesinden otomatik üretir.
// Soru kimliği "isaret~<işaret>~<tür>" biçimindedir; tekrar listesinde yeniden üretilebilir.
import { SIGNS, signInfo, type SignId } from './signs';
import type { Question } from './types';

type Kind = 'a' | 'b';

const pickOthers = (id: SignId, n: number): SignId[] => {
  const me = signInfo(id);
  const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  const same = shuffle(SIGNS.filter((s) => s.cat === me.cat && s.id !== id && s.tr !== me.tr));
  const rest = shuffle(SIGNS.filter((s) => s.cat !== me.cat));
  return [...same, ...rest].slice(0, n).map((s) => s.id);
};

export function signQuestion(id: SignId, kind: Kind): Question {
  const me = signInfo(id);
  const others = pickOthers(id, 3);
  const all = [id, ...others];
  if (kind === 'a') {
    return {
      id: `isaret~${id}~a`,
      q: 'Bu işaret ne anlama gelir?',
      sign: id,
      options: all.map((x) => signInfo(x).tr),
      answer: 0,
      why: `${me.de}. ${me.desc}`,
    };
  }
  return {
    id: `isaret~${id}~b`,
    q: `Hangisi “${me.tr}” işaretidir?`,
    options: all.map((x) => signInfo(x).de),
    optionSigns: all,
    answer: 0,
    why: `${me.de}. ${me.desc}`,
  };
}

export function parseSignQuestion(qid: string): Question | undefined {
  const [pre, id, kind] = qid.split('~');
  if (pre !== 'isaret' || !SIGNS.some((s) => s.id === id) || (kind !== 'a' && kind !== 'b')) return undefined;
  return signQuestion(id as SignId, kind);
}

/** Karışık işaret testi: her işaret en fazla bir kez. */
export function signTest(n = 12): Question[] {
  const ids = SIGNS.map((s) => s.id)
    .map((id) => [Math.random(), id] as const)
    .sort((a, b) => a[0] - b[0])
    .slice(0, n)
    .map((x) => x[1]);
  return ids.map((id, i) => signQuestion(id, i % 2 ? 'b' : 'a'));
}
