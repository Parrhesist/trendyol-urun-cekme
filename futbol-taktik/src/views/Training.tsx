import { useMemo, useState } from 'react';
import { LoadChart } from '../components/Charts';
import { MiniPitch } from '../components/Pitch';
import { TacticPlayer } from '../components/TacticPlayer';
import { addDays, fmtDate, makeTactic, todayISO, uid, weekStart } from '../football';
import { useStore } from '../store';
import { acwr, acwrText, acwrTone, loadSeries, sessionLoad, sessionMinutes } from '../stats';
import type { Drill, Session } from '../types';
import { Btn, ConfirmBtn, Empty, Field, Modal, Pill, Segmented, lines } from '../ui';

const RPE_LABEL = ['', 'Çok çok hafif', 'Çok hafif', 'Hafif', 'Orta', 'Biraz zor', 'Zor', 'Zor+', 'Çok zor', 'Çok çok zor', 'Maksimum'];
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function Training({ onOpenTactic }: { onOpenTactic: (id: string) => void }) {
  const { data, canEdit } = useStore();
  const [tab, setTab] = useState<'plan' | 'drills'>('plan');
  const [week, setWeek] = useState(weekStart(todayISO()));
  const [edit, setEdit] = useState<Session | null>(null);
  const [editDrill, setEditDrill] = useState<Drill | null>(null);
  const series = useMemo(() => loadSeries(data.sessions), [data.sessions]);
  const ratio = useMemo(() => acwr(data.sessions), [data.sessions]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const matchOn = (d: string) => data.matches.find((m) => m.date === d);
  const weekLoad = data.sessions.filter((s) => s.date >= week && s.date <= addDays(week, 6)).reduce((a, s) => a + sessionLoad(s), 0);

  const newSession = (date: string): Session => ({ id: uid('s'), date, title: 'Antrenman', focus: '', rpe: 5, blocks: [], absent: [], notes: '' });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Planlama ve yük takibi</p>
          <h1>Antrenman</h1>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'plan', label: 'Haftalık plan' },
            { value: 'drills', label: `Drill kütüphanesi (${data.drills.length})` },
          ]}
        />
      </header>

      {tab === 'plan' ? (
        <>
          <div className="week-nav">
            <Btn icon="prev" variant="ghost" onClick={() => setWeek(addDays(week, -7))} aria-label="Önceki hafta" />
            <strong>
              {fmtDate(week, { day: 'numeric', month: 'long' })} – {fmtDate(addDays(week, 6), { day: 'numeric', month: 'long' })}
            </strong>
            <Btn icon="next" variant="ghost" onClick={() => setWeek(addDays(week, 7))} aria-label="Sonraki hafta" />
            <Btn variant="ghost" size="sm" onClick={() => setWeek(weekStart(todayISO()))}>
              Bu hafta
            </Btn>
            <span className="spacer" />
            <span className="muted">
              Hafta yükü <strong className="tabnum">{weekLoad.toLocaleString('tr-TR')} AU</strong>
            </span>
          </div>
          <div className="week-grid">
            {days.map((d, i) => {
              const ss = data.sessions.filter((s) => s.date === d);
              const m = matchOn(d);
              const today = d === todayISO();
              return (
                <div key={d} className={'day' + (today ? ' today' : '')}>
                  <div className="day-head">
                    <span>{DAYS[i]}</span>
                    <span className="tabnum">{fmtDate(d, { day: 'numeric' })}</span>
                  </div>
                  {m && (
                    <div className="day-match">
                      <span className="pill pill-accent">MAÇ</span> {m.opponent}
                    </div>
                  )}
                  {ss.map((s) => (
                    <button key={s.id} type="button" className={'sess rpe-' + Math.ceil(s.rpe / 3.4)} onClick={() => setEdit(s)}>
                      <strong>{s.title}</strong>
                      <small>
                        {sessionMinutes(s)} dk · RPE {s.rpe}
                      </small>
                      {s.focus && <small className="sess-focus">{s.focus}</small>}
                    </button>
                  ))}
                  {canEdit && (
                    <button type="button" className="day-add" onClick={() => setEdit(newSession(d))} aria-label={`${fmtDate(d)} için seans ekle`}>
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="two-col">
            <section className="panel">
              <h2 className="section-title">Haftalık yük (sRPE)</h2>
              <p className="muted small">Seans süresi × zorluk algısı (RPE). Son 8 hafta, birim AU.</p>
              <LoadChart series={series} />
            </section>
            <section className="panel">
              <h2 className="section-title">Akut : kronik yük oranı</h2>
              <div className="kpi">
                <span className="kpi-num tabnum">{ratio.ratio ? ratio.ratio.toFixed(2).replace('.', ',') : '—'}</span>
                <Pill tone={acwrTone(ratio.ratio)}>{acwrText(ratio.ratio)}</Pill>
              </div>
              <dl className="dl">
                <dt>Son 7 gün</dt>
                <dd className="tabnum">{ratio.acute.toLocaleString('tr-TR')} AU</dd>
                <dt>28 gün haftalık ortalama</dt>
                <dd className="tabnum">{Math.round(ratio.chronic).toLocaleString('tr-TR')} AU</dd>
              </dl>
              <p className="hint">0,8–1,3 arası güvenli bölge kabul edilir. 1,5 üzerinde yükü azaltın, rotasyon yapın.</p>
            </section>
          </div>
        </>
      ) : (
        <DrillLibrary onEdit={setEditDrill} onOpenTactic={onOpenTactic} />
      )}

      {edit && <SessionModal session={edit} onClose={() => setEdit(null)} />}
      {editDrill && <DrillModal drill={editDrill} onClose={() => setEditDrill(null)} onOpenTactic={onOpenTactic} />}
    </div>
  );
}

function DrillLibrary({ onEdit, onOpenTactic }: { onEdit: (d: Drill) => void; onOpenTactic: (id: string) => void }) {
  const { data, canEdit } = useStore();
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  return (
    <>
      {canEdit && (
        <div className="row end">
          <Btn variant="primary" icon="plus" onClick={() => onEdit({ id: uid('dr'), name: '', category: 'Taktik', minutes: 15, players: '', equipment: '', objective: '', coachingPoints: '' })}>
            Yeni drill
          </Btn>
        </div>
      )}
      {data.drills.length === 0 && <Empty title="Henüz drill yok">Drill ekleyip saha diyagramı çizin, sonra seanslara yerleştirin.</Empty>}
      <div className="card-grid drills">
        {data.drills.map((d) => {
          const t = data.tactics.find((x) => x.id === d.tacticId);
          return (
            <article key={d.id} className="drill">
              {t ? (
                <button type="button" className="drill-diag" onClick={() => onOpenTactic(t.id)} aria-label="Diyagramı aç">
                  <MiniPitch tokens={t.tokens} pos={t.frames[0].pos} drawings={t.frames[0].drawings} half={t.half} colors={colors} />
                </button>
              ) : (
                <div className="drill-diag none">Diyagram yok</div>
              )}
              <div className="drill-body">
                <div className="row between">
                  <span className="cat">{d.category}</span>
                  <span className="tabnum muted">{d.minutes} dk</span>
                </div>
                <h3>{d.name}</h3>
                <p className="muted small">
                  {d.players} · {d.equipment}
                </p>
                <p>{d.objective}</p>
                {d.coachingPoints && (
                  <ul className="points">
                    {lines(d.coachingPoints).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
                {canEdit && (
                  <Btn size="sm" onClick={() => onEdit(d)}>
                    Düzenle
                  </Btn>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function DrillModal({ drill, onClose, onOpenTactic }: { drill: Drill; onClose: () => void; onOpenTactic: (id: string) => void }) {
  const { data, save, remove } = useStore();
  const [d, setD] = useState(drill);
  const set = (p: Partial<Drill>) => setD((x) => ({ ...x, ...p }));
  const isNew = !data.drills.some((x) => x.id === d.id);
  const diagram = data.tactics.find((t) => t.id === d.tacticId);
  const createDiagram = async () => {
    const t = makeTactic(d.name || 'Drill diyagramı', '4-3-3', { category: 'Antrenman' });
    t.tokens = t.tokens.filter((k) => k.kind === 'ball');
    t.half = true;
    t.frames[0].pos = { [t.tokens[0].id]: { x: 78, y: 34 } };
    await save('tactics', t);
    const next = { ...d, tacticId: t.id };
    await save('drills', next);
    onClose();
    onOpenTactic(t.id);
  };
  return (
    <Modal
      title={isNew ? 'Yeni drill' : d.name}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && (
            <ConfirmBtn
              variant="ghost"
              icon="trash"
              onConfirm={() => {
                remove('drills', d.id);
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
            disabled={!d.name.trim()}
            onClick={() => {
              save('drills', d);
              onClose();
            }}
          >
            Kaydet
          </Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Ad" wide>
          <input id="dr-name" value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Kategori">
          <select id="dr-cat" value={d.category} onChange={(e) => set({ category: e.target.value })}>
            {['Isınma', 'Teknik', 'Taktik', 'Bitiricilik', 'Kondisyon', 'Duran Top', 'Toparlanma'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Süre (dk)">
          <input id="dr-min" type="number" min={1} value={d.minutes} onChange={(e) => set({ minutes: +e.target.value })} />
        </Field>
        <Field label="Oyuncu sayısı">
          <input id="dr-pl" value={d.players} onChange={(e) => set({ players: e.target.value })} placeholder="Ör. 4v4+3" />
        </Field>
        <Field label="Malzeme">
          <input id="dr-eq" value={d.equipment} onChange={(e) => set({ equipment: e.target.value })} placeholder="Huni, yelek, mini kale" />
        </Field>
        <Field label="Amaç" wide>
          <textarea id="dr-obj" rows={2} value={d.objective} onChange={(e) => set({ objective: e.target.value })} />
        </Field>
        <Field label="Koçluk noktaları (her satır bir madde)" wide>
          <textarea id="dr-cp" rows={4} value={d.coachingPoints} onChange={(e) => set({ coachingPoints: e.target.value })} />
        </Field>
        <div className="wide">
          <span className="field-label">Saha diyagramı</span>
          {diagram ? (
            <div className="drill-preview">
              <TacticPlayer tactic={diagram} />
              <Btn
                onClick={() => {
                  save('drills', d);
                  onClose();
                  onOpenTactic(diagram.id);
                }}
              >
                Taktik tahtasında düzenle
              </Btn>
            </div>
          ) : (
            <div className="row">
              <Btn onClick={createDiagram} disabled={!d.name.trim()}>
                Boş diyagram oluştur ve çiz
              </Btn>
              <select id="dr-link" value="" onChange={(e) => set({ tacticId: e.target.value || undefined })}>
                <option value="">Var olan taktiği bağla…</option>
                {data.tactics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function SessionModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const { data, save, remove, canEdit } = useStore();
  const [s, setS] = useState(session);
  const set = (p: Partial<Session>) => setS((x) => ({ ...x, ...p }));
  const isNew = !data.sessions.some((x) => x.id === s.id);
  const drill = (id: string) => data.drills.find((d) => d.id === id);
  const players = [...data.players].sort((a, b) => a.number - b.number);
  return (
    <Modal
      title={isNew ? 'Yeni seans' : s.title}
      onClose={onClose}
      wide
      footer={
        canEdit ? (
          <>
            {!isNew && (
              <ConfirmBtn
                variant="ghost"
                icon="trash"
                onConfirm={() => {
                  remove('sessions', s.id);
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
              onClick={() => {
                save('sessions', s);
                onClose();
              }}
            >
              Kaydet
            </Btn>
          </>
        ) : undefined
      }
    >
      <fieldset disabled={!canEdit} className="form-grid">
        <Field label="Başlık">
          <input id="se-title" value={s.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Tarih">
          <input id="se-date" type="date" value={s.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <Field label="Odak">
          <input id="se-focus" value={s.focus} onChange={(e) => set({ focus: e.target.value })} placeholder="Ör. Geçiş savunması" />
        </Field>
        <Field label={`Zorluk (RPE): ${s.rpe} — ${RPE_LABEL[s.rpe]}`}>
          <input id="se-rpe" type="range" min={1} max={10} value={s.rpe} onChange={(e) => set({ rpe: +e.target.value })} />
        </Field>
        <div className="wide">
          <div className="row between">
            <span className="field-label">Seans akışı</span>
            <span className="muted tabnum">
              Toplam {sessionMinutes(s)} dk · Yük {sessionLoad(s).toLocaleString('tr-TR')} AU
            </span>
          </div>
          <ol className="blocks">
            {s.blocks.map((b, i) => (
              <li key={i}>
                <span className="block-name">{drill(b.drillId)?.name ?? 'Silinmiş drill'}</span>
                <input
                  id={`se-b-${i}`}
                  type="number"
                  min={1}
                  value={b.minutes}
                  aria-label="Dakika"
                  onChange={(e) => set({ blocks: s.blocks.map((x, j) => (j === i ? { ...x, minutes: +e.target.value } : x)) })}
                />
                <span className="muted">dk</span>
                <Btn size="sm" variant="ghost" icon="prev" aria-label="Yukarı taşı" disabled={i === 0} onClick={() => set({ blocks: swap(s.blocks, i, i - 1) })} />
                <Btn size="sm" variant="ghost" icon="trash" aria-label="Çıkar" onClick={() => set({ blocks: s.blocks.filter((_, j) => j !== i) })} />
              </li>
            ))}
          </ol>
          <select
            id="se-add"
            value=""
            onChange={(e) => {
              const d = drill(e.target.value);
              if (d) set({ blocks: [...s.blocks, { drillId: d.id, minutes: d.minutes }] });
            }}
          >
            <option value="">+ Drill ekle…</option>
            {data.drills.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.minutes} dk)
              </option>
            ))}
          </select>
        </div>
        <div className="wide">
          <span className="field-label">Katılmayanlar ({s.absent.length})</span>
          <div className="chips">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                className={'chip' + (s.absent.includes(p.id) ? ' on-bad' : '')}
                onClick={() => set({ absent: s.absent.includes(p.id) ? s.absent.filter((x) => x !== p.id) : [...s.absent, p.id] })}
              >
                {p.number} {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <Field label="Notlar" wide>
          <textarea id="se-notes" rows={3} value={s.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </fieldset>
    </Modal>
  );
}

function swap<T>(arr: T[], i: number, j: number) {
  const a = [...arr];
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}
