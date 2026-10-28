import { FORMATIONS } from './football';
import type { Player, PosGroup } from './types';

export const roleGroup = (role: string): PosGroup =>
  role === 'KL' ? 'KL' : ['SLB', 'SĞB', 'STP', 'SLKB', 'SĞKB'].includes(role) ? 'DEF' : ['DOS', 'MO', 'OOS'].includes(role) ? 'OS' : 'FV';

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
