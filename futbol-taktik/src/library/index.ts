import { uid } from '../football';
import type { Tactic } from '../types';
import { ATTACK } from './attack';
import { BUILDUP } from './buildup';
import { DEFENCE } from './defence';
import { buildLib, type LibDef, type LibGroup } from './dsl';
import { SET_PIECES } from './setpieces';
import { SYSTEMS } from './systems';
import { TRANSITIONS } from './transitions';

// Hazır taktik kütüphanesi: koddan gelir, salt okunur. Düzenlemek için kullanıcı kendi kopyasını oluşturur.

export const LIB_GROUPS: LibGroup[] = ['Sistemler', 'Oyun kurma', 'Hücum kalıpları', 'Pres ve savunma', 'Geçişler', 'Duran toplar'];

export interface LibItem {
  def: LibDef;
  tactic: Tactic;
}

const DEFS: LibDef[] = [...SYSTEMS, ...BUILDUP, ...ATTACK, ...DEFENCE, ...TRANSITIONS, ...SET_PIECES];

export const LIBRARY: LibItem[] = DEFS.map((def) => ({ def, tactic: buildLib(def) }));

const byId = new Map(LIBRARY.map((it) => [it.def.id, it]));
export const libItem = (id: string) => byId.get(id);

/** Kütüphane taktiğinin kullanıcıya ait, düzenlenebilir kopyası */
export function forkLib(it: LibItem): Tactic {
  const copy: Tactic = JSON.parse(JSON.stringify(it.tactic));
  copy.id = uid('t');
  copy.libId = it.def.id;
  copy.updatedAt = Date.now();
  return copy;
}

/** Arama: ad, grup, etiket, kaynak ve anlatımda (Türkçe büyük-küçük harf duyarsız) */
export function searchLib(q: string, group: LibGroup | 'Tümü') {
  const n = (s: string) => s.toLocaleLowerCase('tr-TR');
  const terms = n(q).split(/\s+/).filter(Boolean);
  return LIBRARY.filter((it) => {
    if (group !== 'Tümü' && it.def.group !== group) return false;
    const hay = n([it.def.name, it.def.group, it.def.src, it.def.desc, ...(it.def.tags ?? [])].join(' '));
    return terms.every((t) => hay.includes(t));
  });
}
