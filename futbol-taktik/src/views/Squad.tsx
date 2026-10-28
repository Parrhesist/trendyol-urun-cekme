import { useMemo, useState } from 'react';
import { Importer } from '../components/Importer';
import { importPlayers, PLAYERS_TEMPLATE } from '../csv';
import { GROUP_LABEL, STATUS_META, uid } from '../football';
import { useStore } from '../store';
import { playerSeason } from '../stats';
import type { Availability, Player, PosGroup } from '../types';
import { Btn, ConfirmBtn, Field, Modal, Pill } from '../ui';

const ROLES = ['KL', 'SĞB', 'SLB', 'STP', 'SĞKB', 'SLKB', 'DOS', 'MO', 'OOS', 'SĞK', 'SLK', 'FV'];

export function Squad() {
  const { data, canEdit, save, toast } = useStore();
  const [edit, setEdit] = useState<Player | null>(null);
  const [importing, setImporting] = useState(false);
  const groups = useMemo(() => {
    const g: Record<PosGroup, Player[]> = { KL: [], DEF: [], OS: [], FV: [] };
    [...data.players].sort((a, b) => a.number - b.number).forEach((p) => g[p.group].push(p));
    return g;
  }, [data.players]);
  const counts = useMemo(() => {
    const c: Record<Availability, number> = { hazir: 0, supheli: 0, sakat: 0, cezali: 0 };
    data.players.forEach((p) => c[p.status]++);
    return c;
  }, [data.players]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{data.players.length} oyuncu</p>
          <h1>Kadro</h1>
        </div>
        {canEdit && (
          <div className="row">
            <Btn icon="upload" onClick={() => setImporting(true)}>
              CSV’den aktar
            </Btn>
            <Btn variant="primary" icon="plus" onClick={() => setEdit({ id: uid('p'), number: 0, name: '', group: 'OS', status: 'hazir', foot: 'Sağ' })}>
              Oyuncu ekle
            </Btn>
          </div>
        )}
      </header>
      <div className="status-strip">
        {(Object.keys(STATUS_META) as Availability[]).map((k) => (
          <div key={k} className={'status-cell tone-' + STATUS_META[k].tone}>
            <span className="big-num">{counts[k]}</span>
            <span>{STATUS_META[k].label}</span>
          </div>
        ))}
      </div>
      {(Object.keys(groups) as PosGroup[]).map((g) => (
        <section key={g} className="squad-group">
          <h2 className="section-title">{GROUP_LABEL[g]}</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="num">No</th>
                  <th>Oyuncu</th>
                  <th>Mevki</th>
                  <th>Ayak</th>
                  <th>Durum</th>
                  <th className="num">Maç</th>
                  <th className="num">Gol</th>
                  <th className="num">Ort. puan</th>
                  <th>Not</th>
                </tr>
              </thead>
              <tbody>
                {groups[g].map((p) => {
                  const s = playerSeason(data, p.id);
                  return (
                    <tr key={p.id} onClick={canEdit ? () => setEdit(p) : undefined} className={canEdit ? 'clickable' : ''}>
                      <td className="num">
                        <span className="shirt">{p.number}</span>
                      </td>
                      <td>
                        <strong>{p.name}</strong>
                      </td>
                      <td>{p.role ?? '—'}</td>
                      <td>{p.foot ?? '—'}</td>
                      <td>
                        <Pill tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Pill>
                      </td>
                      <td className="num">{s.apps}</td>
                      <td className="num">{s.goals}</td>
                      <td className="num">{s.rating ? s.rating.toFixed(1) : '—'}</td>
                      <td className="muted small">{p.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {edit && <PlayerModal player={edit} onClose={() => setEdit(null)} />}
      {importing && (
        <Modal title="Kadroyu CSV’den aktar" onClose={() => setImporting(false)}>
          <Importer
            id="imp-players"
            template={PLAYERS_TEMPLATE}
            help={<p className="muted">Sütunlar: forma_no, ad_soyad, mevki (KL, STP, SĞB, DOS, MO, FV…), ayak. Aynı forma numarası varsa oyuncu güncellenir.</p>}
            onImport={async (text) => {
              const list = importPlayers(text);
              for (const p of list) {
                const existing = data.players.find((x) => x.number === p.number);
                await save('players', existing ? { ...existing, name: p.name, role: p.role, group: p.group, foot: p.foot } : p);
              }
              toast(`${list.length} oyuncu aktarıldı`);
              setImporting(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function PlayerModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const { save, remove, data } = useStore();
  const [p, setP] = useState(player);
  const isNew = !data.players.some((x) => x.id === p.id);
  const set = (patch: Partial<Player>) => setP((x) => ({ ...x, ...patch }));
  return (
    <Modal
      title={isNew ? 'Yeni oyuncu' : p.name}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <ConfirmBtn
              variant="ghost"
              icon="trash"
              onConfirm={() => {
                remove('players', p.id);
                onClose();
              }}
            >
              Sil
            </ConfirmBtn>
          )}
          <span className="spacer" />
          <Btn onClick={onClose}>Vazgeç</Btn>
          <Btn
            variant="primary"
            disabled={!p.name.trim()}
            onClick={() => {
              save('players', p);
              onClose();
            }}
          >
            Kaydet
          </Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Forma no">
          <input id="pl-no" type="number" min={1} max={99} value={p.number || ''} onChange={(e) => set({ number: +e.target.value })} />
        </Field>
        <Field label="Ad soyad">
          <input id="pl-name" value={p.name} onChange={(e) => set({ name: e.target.value })} autoFocus={isNew} />
        </Field>
        <Field label="Mevki">
          <select
            id="pl-role"
            value={p.role ?? ''}
            onChange={(e) => {
              const role = e.target.value;
              const group: PosGroup = role === 'KL' ? 'KL' : ['SĞB', 'SLB', 'STP', 'SĞKB', 'SLKB'].includes(role) ? 'DEF' : ['DOS', 'MO', 'OOS'].includes(role) ? 'OS' : 'FV';
              set({ role, group });
            }}
          >
            <option value="">—</option>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Kullandığı ayak">
          <select id="pl-foot" value={p.foot ?? 'Sağ'} onChange={(e) => set({ foot: e.target.value as Player['foot'] })}>
            <option>Sağ</option>
            <option>Sol</option>
            <option>Çift</option>
          </select>
        </Field>
        <Field label="Durum">
          <select id="pl-status" value={p.status} onChange={(e) => set({ status: e.target.value as Availability })}>
            {(Object.keys(STATUS_META) as Availability[]).map((k) => (
              <option key={k} value={k}>
                {STATUS_META[k].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Not (sakatlık, gelişim hedefi…)" wide>
          <textarea id="pl-note" rows={3} value={p.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
