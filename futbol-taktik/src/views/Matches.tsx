import { useMemo, useRef, useState } from 'react';
import { CompareRow } from '../components/Charts';
import { Importer } from '../components/Importer';
import { Pitch, TokenShape } from '../components/Pitch';
import { TacticPlayer } from '../components/TacticPlayer';
import { EVENTS_TEMPLATE, EVENT_KEYS, importEvents, importStats, STATS_TEMPLATE } from '../csv';
import { addDays, EVENT_META, EVENT_TYPES, fmtDate, FORMATION_NAMES, FORMATIONS, MANUAL_STATS, mirror, PITCH, STATUS_META, todayISO, uid } from '../football';
import { autoLineup, surname } from '../lineup';
import { usePlayer, useStore } from '../store';
import { countEvents, isPlayed, result, RESULT_LABEL } from '../stats';
import type { EventType, Match, MatchEvent, Player, Pt, Token } from '../types';
import { Btn, ConfirmBtn, Empty, Field, Icon, lines, Pill, Segmented, toggleFullscreen } from '../ui';
import { ShareModal } from './Share';

type Tab = 'once' | 'devre' | 'sonra' | 'veri';

export function newMatch(players: Player[]): Match {
  const lineup = autoLineup('4-3-3', players);
  return {
    id: uid('m'),
    date: addDays(todayISO(), 7),
    time: '15:00',
    opponent: '',
    venue: 'İç Saha',
    competition: 'Lig',
    pre: {
      formation: '4-3-3',
      lineup: Object.fromEntries(lineup.map((id, i) => [String(i), id]).filter(([, id]) => id)),
      bench: [],
      oppFormation: '4-4-2',
      oppStrengths: '',
      oppWeaknesses: '',
      oppKeyPlayers: '',
      planAttack: '',
      planDefence: '',
      planTransition: '',
      tacticIds: [],
      tasks: {},
    },
    half: { us: null, them: null, good: [], bad: [], subs: [], message: '' },
    post: { us: null, them: null, events: [], manual: {}, ratings: {}, summary: '', focusNext: [] },
  };
}

export function Matches({ openId, onOpen }: { openId?: string; onOpen: (id: string | null) => void }) {
  const { data, canEdit, save } = useStore();
  const match = data.matches.find((m) => m.id === openId);
  if (openId && match) return <MatchDetail key={match.id} match={match} onBack={() => onOpen(null)} />;
  const sorted = [...data.matches].sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = sorted.filter((m) => !isPlayed(m)).reverse();
  const played = sorted.filter(isPlayed);
  const card = (m: Match) => {
    const r = result(m);
    return (
      <button key={m.id} type="button" className="mcard" onClick={() => onOpen(m.id)}>
        <div className="mcard-date">
          <span className="tabnum">{fmtDate(m.date, { day: 'numeric' })}</span>
          <small>{fmtDate(m.date, { month: 'short' })}</small>
        </div>
        <div className="mcard-body">
          <strong>{m.opponent || 'Rakip belirlenmedi'}</strong>
          <small>
            {m.venue} · {m.competition}
            {m.time && !r ? ` · ${m.time}` : ''}
          </small>
        </div>
        {r ? (
          <div className={'score res-' + r}>
            <span className="tabnum">
              {m.post.us}–{m.post.them}
            </span>
            <small>{RESULT_LABEL[r]}</small>
          </div>
        ) : (
          <Pill tone="accent">Planlandı</Pill>
        )}
      </button>
    );
  };
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Öncesi · devre arası · sonrası</p>
          <h1>Maçlar</h1>
        </div>
        {canEdit && (
          <Btn
            variant="primary"
            icon="plus"
            size="lg"
            onClick={async () => {
              const m = newMatch(data.players);
              await save('matches', m);
              onOpen(m.id);
            }}
          >
            Yeni maç
          </Btn>
        )}
      </header>
      {data.matches.length === 0 && <Empty title="Henüz maç yok">Yeni maç ekleyip rakip analizi ve ilk 11 ile başlayın.</Empty>}
      {upcoming.length > 0 && (
        <section>
          <h2 className="section-title">Yaklaşan</h2>
          <div className="mlist">{upcoming.map(card)}</div>
        </section>
      )}
      {played.length > 0 && (
        <section>
          <h2 className="section-title">Oynanan</h2>
          <div className="mlist">{played.map(card)}</div>
        </section>
      )}
    </div>
  );
}

function MatchDetail({ match, onBack }: { match: Match; onBack: () => void }) {
  const { save, remove, canEdit } = useStore();
  const [tab, setTab] = useState<Tab>(isPlayed(match) ? 'sonra' : 'once');
  const [presenting, setPresenting] = useState<null | 'once' | 'devre'>(null);
  const [sharing, setSharing] = useState(false);
  const m = match;
  const upd = (fn: (m: Match) => Match) => canEdit && save('matches', fn(m));
  const setPre = (p: Partial<Match['pre']>) => upd((x) => ({ ...x, pre: { ...x.pre, ...p } }));
  const setHalf = (p: Partial<Match['half']>) => upd((x) => ({ ...x, half: { ...x.half, ...p } }));
  const setPost = (p: Partial<Match['post']>) => upd((x) => ({ ...x, post: { ...x.post, ...p } }));

  return (
    <div className="page">
      <header className="match-head">
        <Btn variant="ghost" icon="prev" onClick={onBack} aria-label="Maçlara dön" />
        <div className="match-title">
          {canEdit ? (
            <input id="m-opp" className="title-input" value={m.opponent} placeholder="Rakip takım" onChange={(e) => upd((x) => ({ ...x, opponent: e.target.value }))} />
          ) : (
            <h1>{m.opponent}</h1>
          )}
          <div className="match-meta">
            {canEdit ? (
              <>
                <input id="m-date" type="date" value={m.date} onChange={(e) => upd((x) => ({ ...x, date: e.target.value }))} aria-label="Tarih" />
                <input id="m-time" type="time" value={m.time ?? ''} onChange={(e) => upd((x) => ({ ...x, time: e.target.value }))} aria-label="Saat" />
                <select id="m-venue" value={m.venue} onChange={(e) => upd((x) => ({ ...x, venue: e.target.value as Match['venue'] }))} aria-label="Saha">
                  <option>İç Saha</option>
                  <option>Deplasman</option>
                </select>
                <input id="m-comp" value={m.competition} onChange={(e) => upd((x) => ({ ...x, competition: e.target.value }))} aria-label="Organizasyon" />
              </>
            ) : (
              <span className="muted">
                {fmtDate(m.date, { day: 'numeric', month: 'long', weekday: 'long' })} · {m.time} · {m.venue} · {m.competition}
              </span>
            )}
          </div>
        </div>
        <div className="row">
          <Btn icon="share" onClick={() => setSharing(true)}>
            Paylaş
          </Btn>
          {canEdit && (
            <ConfirmBtn
              variant="ghost"
              icon="trash"
              label="Maçı sil?"
              onConfirm={() => {
                remove('matches', m.id);
                onBack();
              }}
            />
          )}
        </div>
      </header>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'once', label: 'Maç öncesi' },
          { value: 'devre', label: 'Devre arası' },
          { value: 'sonra', label: 'Maç sonrası' },
          { value: 'veri', label: 'Veri aktar' },
        ]}
      />
      {tab === 'once' && <PrePanel m={m} setPre={setPre} onPresent={() => setPresenting('once')} />}
      {tab === 'devre' && <HalfPanel m={m} setHalf={setHalf} onPresent={() => setPresenting('devre')} />}
      {tab === 'sonra' && <PostPanel m={m} setPost={setPost} />}
      {tab === 'veri' && <DataPanel m={m} setPost={setPost} />}
      {presenting && <Presentation m={m} kind={presenting} onClose={() => setPresenting(null)} />}
      {sharing && <ShareModal kind="mac" id={m.id} title={`${m.opponent} maçı`} onClose={() => setSharing(false)} />}
    </div>
  );
}

/* ---------------- Maç öncesi ---------------- */

function LineupPitch({ m, onSlot, selected, big }: { m: Match; onSlot?: (i: number) => void; selected?: number | null; big?: boolean }) {
  const { data } = useStore();
  const player = usePlayer();
  const slots = FORMATIONS[m.pre.formation];
  const oppSlots = FORMATIONS[m.pre.oppFormation];
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  const tokens: Token[] = [];
  const pos: Record<string, Pt> = {};
  slots.forEach(([role, x, y], i) => {
    const p = player(m.pre.lineup[String(i)]);
    tokens.push({ id: 's' + i, kind: 'home', label: p ? String(p.number) : role });
    pos['s' + i] = { x, y };
  });
  if (oppSlots && big)
    oppSlots.forEach(([, x, y], i) => {
      tokens.push({ id: 'o' + i, kind: 'away', label: '' });
      pos['o' + i] = mirror({ x, y });
    });
  const overlay = (
    <g>
      {slots.map(([role, x, y], i) => {
        const p = player(m.pre.lineup[String(i)]);
        return (
          <g key={i} onPointerDown={(e) => (e.stopPropagation(), onSlot?.(i))} style={{ cursor: onSlot ? 'pointer' : undefined }}>
            <TokenShape t={{ id: 's' + i, kind: 'home', label: p ? String(p.number) : role }} p={{ x, y }} colors={colors} selected={selected === i} scale={1.1} />
            <text x={x} y={y + 4.4} textAnchor="middle" className="tok-sub">
              {p ? surname(p.name) : 'Boş'}
            </text>
            {p && p.status !== 'hazir' && <circle cx={x + 1.6} cy={y - 1.6} r={0.7} className={'warn-dot tone-' + STATUS_META[p.status].tone} />}
          </g>
        );
      })}
    </g>
  );
  return <Pitch tokens={tokens.filter((t) => t.kind === 'away')} pos={pos} drawings={[]} colors={colors} overlay={overlay} className={big ? 'board' : 'lineup-pitch'} />;
}

function PrePanel({ m, setPre, onPresent }: { m: Match; setPre: (p: Partial<Match['pre']>) => void; onPresent: () => void }) {
  const { data, canEdit } = useStore();
  const player = usePlayer();
  const [slot, setSlot] = useState<number | null>(null);
  const starters = Object.values(m.pre.lineup);
  const players = [...data.players].sort((a, b) => a.number - b.number);
  const assign = (playerId: string) => {
    if (slot == null) return;
    const lineup = { ...m.pre.lineup };
    // oyuncu başka slottaysa yer değiştir
    const prevSlot = Object.entries(lineup).find(([, id]) => id === playerId)?.[0];
    const current = lineup[String(slot)];
    if (prevSlot != null) {
      if (current) lineup[prevSlot] = current;
      else delete lineup[prevSlot];
    }
    lineup[String(slot)] = playerId;
    setPre({ lineup, bench: m.pre.bench.filter((b) => b !== playerId) });
    setSlot(null);
  };
  const tf = (k: keyof Match['pre'], label: string, rows = 4, ph = '') => (
    <Field label={label}>
      <textarea id={'pre-' + k} rows={rows} value={m.pre[k] as string} placeholder={ph} readOnly={!canEdit} onChange={(e) => setPre({ [k]: e.target.value })} />
    </Field>
  );
  return (
    <div className="stack">
      <div className="row between">
        <p className="muted">Kadroyu sahada kurun, rakibi analiz edin, oyun planını yazın. Soyunma odasında “Sunum” ile ekrana yansıtın.</p>
        <Btn variant="primary" icon="present" size="lg" onClick={onPresent}>
          Soyunma odası sunumu
        </Btn>
      </div>
      <div className="two-col wide-left">
        <section className="panel">
          <div className="row between">
            <h2 className="section-title">İlk 11</h2>
            {canEdit && (
              <div className="row">
                <select id="pre-form" value={m.pre.formation} onChange={(e) => setPre({ formation: e.target.value, lineup: Object.fromEntries(autoLineup(e.target.value, data.players).map((id, i) => [String(i), id]).filter(([, id]) => id)) })} aria-label="Diziliş">
                  {FORMATION_NAMES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
                <Btn size="sm" onClick={() => setPre({ lineup: Object.fromEntries(autoLineup(m.pre.formation, data.players).map((id, i) => [String(i), id]).filter(([, id]) => id)) })}>
                  Otomatik diz
                </Btn>
              </div>
            )}
          </div>
          <LineupPitch m={m} onSlot={canEdit ? setSlot : undefined} selected={slot} />
          {canEdit && <p className="hint">Bir oyuncuya dokunun, sonra listeden yerine geçecek oyuncuyu seçin.</p>}
        </section>
        <section className="panel">
          {slot != null ? (
            <>
              <h2 className="section-title">Slot: {FORMATIONS[m.pre.formation][slot][0]}</h2>
              <div className="pick-list">
                {players.map((p) => (
                  <button key={p.id} type="button" className={'pick' + (starters.includes(p.id) ? ' in' : '')} onClick={() => assign(p.id)}>
                    <span className="shirt">{p.number}</span>
                    <span>{p.name}</span>
                    <small>{p.role}</small>
                    {p.status !== 'hazir' && <Pill tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Pill>}
                  </button>
                ))}
              </div>
              <Btn variant="ghost" onClick={() => setSlot(null)}>
                Vazgeç
              </Btn>
            </>
          ) : (
            <>
              <h2 className="section-title">Yedekler ({m.pre.bench.length})</h2>
              <div className="chips">
                {players
                  .filter((p) => !starters.includes(p.id))
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!canEdit}
                      className={'chip' + (m.pre.bench.includes(p.id) ? ' on' : '') + (p.status === 'sakat' || p.status === 'cezali' ? ' off' : '')}
                      onClick={() => setPre({ bench: m.pre.bench.includes(p.id) ? m.pre.bench.filter((x) => x !== p.id) : [...m.pre.bench, p.id] })}
                      title={STATUS_META[p.status].label}
                    >
                      {p.number} {surname(p.name)}
                    </button>
                  ))}
              </div>
              <h2 className="section-title">Oyuncu görevleri</h2>
              <div className="tasks">
                {FORMATIONS[m.pre.formation].map(([role], i) => {
                  const p = player(m.pre.lineup[String(i)]);
                  if (!p) return null;
                  return (
                    <label key={p.id} className="task">
                      <span className="shirt">{p.number}</span>
                      <span className="task-who">
                        {surname(p.name)} <small>{role}</small>
                      </span>
                      <input id={'task-' + p.id} value={m.pre.tasks[p.id] ?? ''} readOnly={!canEdit} placeholder="Görev…" onChange={(e) => setPre({ tasks: { ...m.pre.tasks, [p.id]: e.target.value } })} />
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="row between">
          <h2 className="section-title">Rakip analizi</h2>
          <label className="inline">
            Rakip dizilişi{' '}
            <select id="pre-oppform" value={m.pre.oppFormation} disabled={!canEdit} onChange={(e) => setPre({ oppFormation: e.target.value })}>
              {FORMATION_NAMES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="three-col">
          {tf('oppStrengths', 'Güçlü yönleri', 5, 'Her satır bir madde')}
          {tf('oppWeaknesses', 'Zayıf yönleri', 5, 'Her satır bir madde')}
          {tf('oppKeyPlayers', 'Kilit oyuncular', 5, 'No — özellik')}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Oyun planı</h2>
        <div className="three-col">
          {tf('planAttack', 'Hücumda', 4)}
          {tf('planDefence', 'Savunmada', 4)}
          {tf('planTransition', 'Geçişlerde', 4)}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Bu maçın taktikleri</h2>
        <div className="chips">
          {data.tactics
            .filter((t) => t.category !== 'Antrenman')
            .map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!canEdit}
                className={'chip' + (m.pre.tacticIds.includes(t.id) ? ' on' : '')}
                onClick={() => setPre({ tacticIds: m.pre.tacticIds.includes(t.id) ? m.pre.tacticIds.filter((x) => x !== t.id) : [...m.pre.tacticIds, t.id] })}
              >
                {t.name}
              </button>
            ))}
        </div>
        <p className="hint">Seçilen taktikler soyunma odası sunumunda animasyonlu olarak gösterilir.</p>
      </section>
    </div>
  );
}

/* ---------------- Devre arası ---------------- */

const QUICK_TAGS = ['Önde pres', 'Pres tetikleyicileri', 'Oyun kurma', 'Kanat bindirmeleri', 'Duran top savunması', 'Duran top hücumu', 'İkinci toplar', 'Top kayıpları', 'Geçiş savunması', 'Hat arası mesafe', 'Bitiricilik', 'İletişim', 'Tempo', 'Hava topları'];

function HalfPanel({ m, setHalf, onPresent }: { m: Match; setHalf: (p: Partial<Match['half']>) => void; onPresent: () => void }) {
  const { data, canEdit } = useStore();
  const player = usePlayer();
  const [custom, setCustom] = useState('');
  const us = countEvents(m.post.events, 'biz', 45);
  const them = countEvents(m.post.events, 'rakip', 45);
  const toggle = (k: 'good' | 'bad', tag: string) => {
    const other = k === 'good' ? 'bad' : 'good';
    const has = m.half[k].includes(tag);
    setHalf({ [k]: has ? m.half[k].filter((x) => x !== tag) : [...m.half[k], tag], [other]: m.half[other].filter((x) => x !== tag) } as Partial<Match['half']>);
  };
  const tags = Array.from(new Set([...QUICK_TAGS, ...m.half.good, ...m.half.bad]));
  const starters = Object.values(m.pre.lineup);
  const bench = m.pre.bench.length ? m.pre.bench : data.players.filter((p) => !starters.includes(p.id)).map((p) => p.id);
  return (
    <div className="stack">
      <div className="row between">
        <div className="score-input">
          <span>İlk yarı</span>
          <ScoreBox value={m.half.us} onChange={(v) => setHalf({ us: v })} label={data.settings.shortName} disabled={!canEdit} />
          <span className="score-dash">–</span>
          <ScoreBox value={m.half.them} onChange={(v) => setHalf({ them: v })} label="Rakip" disabled={!canEdit} />
        </div>
        <Btn variant="primary" icon="present" size="lg" onClick={onPresent}>
          Devre arası ekranı
        </Btn>
      </div>
      <div className="two-col">
        <section className="panel">
          <h2 className="section-title">Hızlı değerlendirme</h2>
          <p className="muted small">Bir kez dokun: iyi gidiyor. Uzun basmak yerine sağdaki “düzelt” butonunu kullanın.</p>
          <div className="tag-grid">
            {tags.map((t) => (
              <div key={t} className={'tag' + (m.half.good.includes(t) ? ' good' : m.half.bad.includes(t) ? ' bad' : '')}>
                <button type="button" disabled={!canEdit} onClick={() => toggle('good', t)}>
                  <span aria-hidden="true">{m.half.good.includes(t) ? '✓' : '+'}</span> {t}
                </button>
                <button type="button" disabled={!canEdit} className="tag-bad" onClick={() => toggle('bad', t)} aria-label={`${t}: düzeltilecek`}>
                  {m.half.bad.includes(t) ? '!' : 'düzelt'}
                </button>
              </div>
            ))}
          </div>
          {canEdit && (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) toggle('bad', custom.trim());
                setCustom('');
              }}
            >
              <input id="half-custom" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Başka bir gözlem ekle…" />
              <Btn type="submit">Ekle</Btn>
            </form>
          )}
        </section>
        <section className="panel">
          <h2 className="section-title">İlk yarı verileri</h2>
          {m.post.events.length ? (
            <div className="cmp">
              <div className="cmp-legend">
                <span>
                  <i className="sw-us" /> {data.settings.shortName}
                </span>
                <span>
                  Rakip <i className="sw-them" />
                </span>
              </div>
              <CompareRow label="Şut" us={us.sut} them={them.sut} />
              <CompareRow label="İsabetli şut" us={us.isabetli} them={them.isabetli} />
              <CompareRow label="Korner" us={us.korner} them={them.korner} />
              <CompareRow label="Faul" us={us.faul} them={them.faul} />
            </div>
          ) : (
            <p className="muted">Maç sırasında “Maç sonrası” sekmesinden olay girerseniz ilk yarı özeti burada görünür.</p>
          )}
          <h2 className="section-title">Değişiklik planı</h2>
          {m.half.subs.map((s, i) => (
            <div key={i} className="sub-row">
              <span className="sub-out">↓ {player(s.out)?.number} {surname(player(s.out)?.name ?? '?')}</span>
              <span className="sub-in">↑ {player(s.in)?.number} {surname(player(s.in)?.name ?? '?')}</span>
              {canEdit && <Btn size="sm" variant="ghost" icon="trash" aria-label="Kaldır" onClick={() => setHalf({ subs: m.half.subs.filter((_, j) => j !== i) })} />}
            </div>
          ))}
          {canEdit && <SubForm starters={starters} bench={bench} onAdd={(out, inn) => setHalf({ subs: [...m.half.subs, { out, in: inn }] })} />}
          <Field label="İkinci yarı mesajı (3 madde)">
            <textarea id="half-msg" rows={4} value={m.half.message} readOnly={!canEdit} onChange={(e) => setHalf({ message: e.target.value })} placeholder={'Hat arası mesafeyi 10 m’de tut\nKayıpta 5 saniye pres\nSol kanattan bindirme'} />
          </Field>
        </section>
      </div>
    </div>
  );
}

function SubForm({ starters, bench, onAdd }: { starters: string[]; bench: string[]; onAdd: (out: string, inn: string) => void }) {
  const player = usePlayer();
  const [out, setOut] = useState('');
  const [inn, setIn] = useState('');
  return (
    <div className="row">
      <select id="sub-out" value={out} onChange={(e) => setOut(e.target.value)} aria-label="Çıkan">
        <option value="">Çıkan…</option>
        {starters.map((id) => (
          <option key={id} value={id}>
            {player(id)?.number} {player(id)?.name}
          </option>
        ))}
      </select>
      <select id="sub-in" value={inn} onChange={(e) => setIn(e.target.value)} aria-label="Giren">
        <option value="">Giren…</option>
        {bench.map((id) => (
          <option key={id} value={id}>
            {player(id)?.number} {player(id)?.name}
          </option>
        ))}
      </select>
      <Btn
        disabled={!out || !inn}
        onClick={() => {
          onAdd(out, inn);
          setOut('');
          setIn('');
        }}
      >
        Ekle
      </Btn>
    </div>
  );
}

function ScoreBox({ value, onChange, label, disabled }: { value: number | null; onChange: (v: number | null) => void; label: string; disabled?: boolean }) {
  return (
    <div className="scorebox">
      <small>{label}</small>
      <div className="row">
        <button type="button" disabled={disabled || !value} onClick={() => onChange(Math.max(0, (value ?? 0) - 1))} aria-label={`${label} skor azalt`}>
          −
        </button>
        <span className="tabnum">{value ?? '–'}</span>
        <button type="button" disabled={disabled} onClick={() => onChange((value ?? 0) + 1)} aria-label={`${label} skor artır`}>
          +
        </button>
      </div>
    </div>
  );
}

/* ---------------- Maç sonrası ---------------- */

function PostPanel({ m, setPost }: { m: Match; setPost: (p: Partial<Match['post']>) => void }) {
  const { data, canEdit, save, toast } = useStore();
  const player = usePlayer();
  const [etype, setEtype] = useState<EventType>('isabetli_sut');
  const [team, setTeam] = useState<'biz' | 'rakip'>('biz');
  const [who, setWho] = useState('');
  const [minute, setMinute] = useState(1);
  const [view, setView] = useState<'sut' | 'isi' | 'hepsi'>('sut');
  const [focus, setFocus] = useState('');
  const us = countEvents(m.post.events, 'biz');
  const them = countEvents(m.post.events, 'rakip');
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  const playedIds = Array.from(new Set([...Object.values(m.pre.lineup), ...m.half.subs.map((s) => s.in)]));

  const addEvent = (p: Pt) => {
    if (!canEdit) return;
    const e: MatchEvent = { id: uid('e'), minute, team, type: etype, playerId: team === 'biz' ? who || undefined : undefined, x: +p.x.toFixed(1), y: +p.y.toFixed(1) };
    const events = [...m.post.events, e].sort((a, b) => a.minute - b.minute);
    const patch: Partial<Match['post']> = { events };
    if (etype === 'gol') {
      if (team === 'biz') patch.us = (m.post.us ?? 0) + 1;
      else patch.them = (m.post.them ?? 0) + 1;
      if (m.post[team === 'biz' ? 'them' : 'us'] == null) patch[team === 'biz' ? 'them' : 'us'] = 0;
    }
    setPost(patch);
    toast(`${minute}' ${EVENT_META[etype].label} eklendi`);
  };

  const shown = m.post.events.filter((e) => e.x != null && (view === 'hepsi' || (view === 'sut' ? EVENT_META[e.type].shot : e.team === 'biz' && e.type !== 'gol')));

  const heat = useMemo(() => {
    if (view !== 'isi') return null;
    const cols = 12;
    const rows = 8;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0) as number[]);
    m.post.events
      .filter((e) => e.team === 'biz' && e.x != null && ['top_kazanma', 'top_kaybi', 'faul'].includes(e.type))
      .forEach((e) => {
        const c = Math.min(cols - 1, Math.max(0, Math.floor((e.x! / PITCH.w) * cols)));
        const r = Math.min(rows - 1, Math.max(0, Math.floor((e.y! / PITCH.h) * rows)));
        grid[r][c]++;
      });
    const max = Math.max(1, ...grid.flat());
    return { grid, cols, rows, max };
  }, [m.post.events, view]);

  const overlay = (
    <g>
      {heat &&
        heat.grid.map((row, r) =>
          row.map((v, c) =>
            v ? (
              <rect key={r + '-' + c} x={(c * PITCH.w) / heat.cols} y={(r * PITCH.h) / heat.rows} width={PITCH.w / heat.cols} height={PITCH.h / heat.rows} className="heat" style={{ opacity: 0.15 + 0.7 * (v / heat.max) }}>
                <title>{v} olay</title>
              </rect>
            ) : null,
          ),
        )}
      {!heat &&
        shown.map((e) => {
          const fill = e.team === 'biz' ? colors.home : colors.away;
          const isGoal = e.type === 'gol';
          const meta = EVENT_META[e.type];
          return (
            <g key={e.id} transform={`translate(${e.x},${e.y})`}>
              <title>{`${e.minute}' ${meta.label}${e.playerId ? ' — ' + (player(e.playerId)?.name ?? '') : ''}`}</title>
              {meta.shot ? (
                <circle r={isGoal ? 1.5 : 1.05} fill={e.type === 'sut' ? 'none' : fill} stroke={isGoal ? '#fff' : fill} strokeWidth={isGoal ? 0.45 : 0.35} />
              ) : (
                <rect x={-0.8} y={-0.8} width={1.6} height={1.6} rx={0.3} fill={fill} transform="rotate(45)" stroke="var(--pitch-line)" strokeWidth={0.15} />
              )}
              {isGoal && <text y={0.55} textAnchor="middle" className="ev-goal">G</text>}
            </g>
          );
        })}
    </g>
  );

  return (
    <div className="stack">
      <div className="score-input">
        <span>Maç sonucu</span>
        <ScoreBox value={m.post.us} onChange={(v) => setPost({ us: v, them: m.post.them ?? 0 })} label={data.settings.shortName} disabled={!canEdit} />
        <span className="score-dash">–</span>
        <ScoreBox value={m.post.them} onChange={(v) => setPost({ them: v, us: m.post.us ?? 0 })} label="Rakip" disabled={!canEdit} />
        {m.half.us != null && (
          <span className="muted">
            (İY {m.half.us}–{m.half.them})
          </span>
        )}
      </div>

      <div className="two-col wide-left">
        <section className="panel">
          <div className="row between">
            <h2 className="section-title">Olay haritası</h2>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'sut', label: 'Şutlar' },
                { value: 'isi', label: 'Isı haritası' },
                { value: 'hepsi', label: 'Tümü' },
              ]}
            />
          </div>
          {canEdit && (
            <div className="logger">
              <Segmented
                value={team}
                onChange={setTeam}
                options={[
                  { value: 'biz', label: data.settings.shortName },
                  { value: 'rakip', label: 'Rakip' },
                ]}
              />
              <select id="ev-type" value={etype} onChange={(e) => setEtype(e.target.value as EventType)} aria-label="Olay türü">
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EVENT_META[t].label}
                  </option>
                ))}
              </select>
              {team === 'biz' && (
                <select id="ev-who" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Oyuncu">
                  <option value="">Oyuncu…</option>
                  {playedIds.map((id) => (
                    <option key={id} value={id}>
                      {player(id)?.number} {player(id)?.name}
                    </option>
                  ))}
                </select>
              )}
              <label className="inline">
                Dk{' '}
                <input id="ev-min" type="number" min={1} max={130} value={minute} onChange={(e) => setMinute(+e.target.value)} className="num-input" />
              </label>
            </div>
          )}
          <Pitch tokens={[]} pos={{}} drawings={[]} colors={colors} overlay={overlay} onPitchTap={canEdit && view !== 'isi' ? addEvent : undefined} className="event-pitch" />
          <div className="legend">
            <span>
              <i className="lg-dot" style={{ background: colors.home }} /> {data.settings.shortName}
            </span>
            <span>
              <i className="lg-dot" style={{ background: colors.away }} /> Rakip
            </span>
            <span>● isabetli · ○ isabetsiz · G gol · ◆ diğer olay</span>
            {view === 'isi' && <span>Isı: top kazanma, kayıp ve faul yoğunluğu ({data.settings.shortName})</span>}
          </div>
          {canEdit && <p className="hint">Olay türünü ve oyuncuyu seçip sahada olayın olduğu yere dokunun. {data.settings.shortName} soldan sağa hücum eder.</p>}
        </section>

        <section className="panel">
          <h2 className="section-title">Maç istatistikleri</h2>
          <div className="cmp">
            <div className="cmp-legend">
              <span>
                <i className="sw-us" /> {data.settings.shortName}
              </span>
              <span>
                {m.opponent || 'Rakip'} <i className="sw-them" />
              </span>
            </div>
            {MANUAL_STATS.map((s) => {
              const v = m.post.manual[s.key];
              return v && v.us != null && v.them != null ? <CompareRow key={s.key} label={s.label} us={v.us} them={v.them} unit={s.unit === '%' ? '%' : ''} /> : null;
            })}
            <CompareRow label="Şut" us={us.sut} them={them.sut} />
            <CompareRow label="İsabetli şut" us={us.isabetli} them={them.isabetli} />
            <CompareRow label="Korner" us={us.korner} them={them.korner} />
            <CompareRow label="Faul" us={us.faul} them={them.faul} />
            <CompareRow label="Ofsayt" us={us.ofsayt} them={them.ofsayt} />
            <CompareRow label="Sarı kart" us={us.sari} them={them.sari} />
          </div>
          <dl className="dl">
            <dt>Top kazanma / kayıp</dt>
            <dd className="tabnum">
              {us.kazanma} / {us.kayip}
            </dd>
          </dl>
          {canEdit && (
            <details className="manual">
              <summary>Elle istatistik gir</summary>
              <table className="table compact">
                <thead>
                  <tr>
                    <th>İstatistik</th>
                    <th className="num">Biz</th>
                    <th className="num">Rakip</th>
                  </tr>
                </thead>
                <tbody>
                  {MANUAL_STATS.map((s) => {
                    const v = m.post.manual[s.key] ?? { us: null, them: null };
                    const setV = (side: 'us' | 'them', val: string) => setPost({ manual: { ...m.post.manual, [s.key]: { ...v, [side]: val === '' ? null : +val } } });
                    return (
                      <tr key={s.key}>
                        <td>
                          {s.label} {s.unit && <small className="muted">({s.unit})</small>}
                        </td>
                        <td className="num">
                          <input id={`ms-${s.key}-us`} type="number" step="any" className="num-input" value={v.us ?? ''} onChange={(e) => setV('us', e.target.value)} />
                        </td>
                        <td className="num">
                          <input id={`ms-${s.key}-them`} type="number" step="any" className="num-input" value={v.them ?? ''} onChange={(e) => setV('them', e.target.value)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </details>
          )}
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2 className="section-title">Oyuncu puanları</h2>
          <div className="ratings">
            {playedIds.map((id) => {
              const p = player(id);
              if (!p) return null;
              const r = m.post.ratings[id] ?? 0;
              const goals = m.post.events.filter((e) => e.type === 'gol' && e.playerId === id).length;
              const shots = m.post.events.filter((e) => EVENT_META[e.type].shot && e.playerId === id).length;
              return (
                <div key={id} className="rating">
                  <span className="shirt">{p.number}</span>
                  <span className="rating-name">
                    {p.name}
                    <small className="muted">
                      {goals ? ` ${goals} gol ·` : ''} {shots} şut
                    </small>
                  </span>
                  <input id={'rt-' + id} type="range" min={0} max={10} step={0.5} value={r} disabled={!canEdit} onChange={(e) => setPost({ ratings: { ...m.post.ratings, [id]: +e.target.value } })} aria-label={`${p.name} puanı`} />
                  <span className={'rating-val tabnum ' + (r >= 7.5 ? 'tone-good' : r && r < 6 ? 'tone-bad' : '')}>{r ? r.toFixed(1) : '–'}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <h2 className="section-title">Değerlendirme</h2>
          <Field label="Maç özeti">
            <textarea id="post-sum" rows={4} value={m.post.summary} readOnly={!canEdit} onChange={(e) => setPost({ summary: e.target.value })} />
          </Field>
          <span className="field-label">Sonraki antrenman odakları</span>
          <ul className="focus-list">
            {m.post.focusNext.map((f, i) => (
              <li key={i}>
                <Icon name="flag" size={15} /> {f}
                {canEdit && <Btn size="sm" variant="ghost" icon="close" aria-label="Kaldır" onClick={() => setPost({ focusNext: m.post.focusNext.filter((_, j) => j !== i) })} />}
              </li>
            ))}
          </ul>
          {canEdit && (
            <>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (focus.trim()) setPost({ focusNext: [...m.post.focusNext, focus.trim()] });
                  setFocus('');
                }}
              >
                <input id="post-focus" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Ör. Duran top savunması" />
                <Btn type="submit">Ekle</Btn>
              </form>
              <Btn
                variant="primary"
                icon="calendar"
                disabled={!m.post.focusNext.length}
                onClick={async () => {
                  const date = addDays(m.date > todayISO() ? m.date : todayISO(), 2);
                  await save('sessions', { id: uid('s'), date, title: 'Maç sonrası odak', focus: m.post.focusNext.join(', '), rpe: 6, blocks: [], absent: [], notes: `${m.opponent} maçından: ${m.post.focusNext.join('; ')}` });
                  toast(`${fmtDate(date)} tarihine antrenman taslağı eklendi`);
                }}
              >
                Odakları antrenman planına ekle
              </Btn>
            </>
          )}
        </section>
      </div>

      <section className="panel">
        <h2 className="section-title">Olay listesi ({m.post.events.length})</h2>
        <div className="table-wrap ev-table">
          <table className="table compact">
            <thead>
              <tr>
                <th className="num">Dk</th>
                <th>Takım</th>
                <th>Olay</th>
                <th>Oyuncu</th>
                <th className="num">Konum (m)</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {m.post.events.map((e) => (
                <tr key={e.id}>
                  <td className="num">{e.minute}'</td>
                  <td>{e.team === 'biz' ? data.settings.shortName : 'Rakip'}</td>
                  <td>{EVENT_META[e.type].label}</td>
                  <td>{e.playerId ? `${player(e.playerId)?.number ?? ''} ${player(e.playerId)?.name ?? ''}` : '—'}</td>
                  <td className="num muted">{e.x != null ? `${e.x}, ${e.y}` : '—'}</td>
                  {canEdit && (
                    <td>
                      <Btn size="sm" variant="ghost" icon="trash" aria-label="Sil" onClick={() => setPost({ events: m.post.events.filter((x) => x.id !== e.id) })} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Veri aktarımı ---------------- */

function DataPanel({ m, setPost }: { m: Match; setPost: (p: Partial<Match['post']>) => void }) {
  const { data, canEdit, toast } = useStore();
  const [replace, setReplace] = useState(false);
  if (!canEdit) return <Empty title="Veri aktarımı yalnızca antrenör içindir" />;
  return (
    <div className="two-col">
      <section className="panel">
        <h2 className="section-title">Olayları içe aktar</h2>
        <Importer
          id="imp-ev"
          template={EVENTS_TEMPLATE}
          help={
            <p className="muted small">
              Sütunlar: dakika, takim (biz/rakip), olay, forma_no, x (0–105 m), y (0–68 m). Olay türleri: {EVENT_KEYS}. Wyscout/InStat dışa aktarımlarında İngilizce adlar (goal, shot, foul…) da tanınır.
            </p>
          }
          onImport={(text) => {
            const { events, skipped } = importEvents(text, data.players);
            const all = [...(replace ? [] : m.post.events), ...events].sort((a, b) => a.minute - b.minute);
            const goals = (t: 'biz' | 'rakip') => all.filter((e) => e.team === t && e.type === 'gol').length;
            setPost({ events: all, us: goals('biz'), them: goals('rakip') });
            toast(`${events.length} olay aktarıldı${skipped ? `, ${skipped} satır atlandı` : ''}`, skipped && !events.length ? 'err' : 'ok');
          }}
        />
        <label className="check">
          <input id="imp-replace" type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Mevcut olayları sil ve yerine yaz
        </label>
      </section>
      <section className="panel">
        <h2 className="section-title">Takım istatistiklerini içe aktar</h2>
        <Importer
          id="imp-st"
          template={STATS_TEMPLATE}
          help={<p className="muted small">Sütunlar: istatistik, biz, rakip. Anahtarlar: topa_sahip_olma, pas, isabetli_pas_yuzde, xg, kosu_km.</p>}
          onImport={(text) => {
            const st = importStats(text);
            const n = Object.keys(st).length;
            setPost({ manual: { ...m.post.manual, ...st } });
            toast(n ? `${n} istatistik aktarıldı` : 'Tanınan istatistik bulunamadı', n ? 'ok' : 'err');
          }}
        />
      </section>
    </div>
  );
}

/* ---------------- Sunum (ekrana yansıtma) ---------------- */

function Presentation({ m, kind, onClose }: { m: Match; kind: 'once' | 'devre'; onClose: () => void }) {
  const { data } = useStore();
  const player = usePlayer();
  const root = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const bullet = (s: string) => lines(s).map((x) => <li key={x}>{x}</li>);
  const tactics = m.pre.tacticIds.map((id) => data.tactics.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);

  const slides: { title: string; body: React.ReactNode }[] =
    kind === 'once'
      ? [
          {
            title: `${data.settings.teamName} – ${m.opponent}`,
            body: (
              <div className="slide-cover">
                <p className="slide-kicker">
                  {fmtDate(m.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {m.time} · {m.venue}
                </p>
                <div className="slide-lineup">
                  <LineupPitch m={m} big />
                </div>
                <p className="muted">
                  Yedekler: {m.pre.bench.map((id) => `${player(id)?.number} ${surname(player(id)?.name ?? '')}`).join(' · ') || '—'}
                </p>
              </div>
            ),
          },
          {
            title: `Rakip: ${m.opponent} (${m.pre.oppFormation})`,
            body: (
              <div className="slide-cols">
                <div>
                  <h3 className="tone-bad">Dikkat</h3>
                  <ul>{bullet(m.pre.oppStrengths)}</ul>
                </div>
                <div>
                  <h3 className="tone-good">Fırsat</h3>
                  <ul>{bullet(m.pre.oppWeaknesses)}</ul>
                </div>
                <div>
                  <h3>Kilit oyuncular</h3>
                  <ul>{bullet(m.pre.oppKeyPlayers)}</ul>
                </div>
              </div>
            ),
          },
          {
            title: 'Oyun planı',
            body: (
              <div className="slide-cols">
                <div>
                  <h3>Hücumda</h3>
                  <ul>{bullet(m.pre.planAttack)}</ul>
                </div>
                <div>
                  <h3>Savunmada</h3>
                  <ul>{bullet(m.pre.planDefence)}</ul>
                </div>
                <div>
                  <h3>Geçişlerde</h3>
                  <ul>{bullet(m.pre.planTransition)}</ul>
                </div>
              </div>
            ),
          },
          ...tactics.map((t) => ({ title: t.name, body: <TacticPlayer key={t.id} tactic={t} big /> })),
          {
            title: 'Görevler',
            body: (
              <ul className="slide-tasks">
                {Object.entries(m.pre.tasks)
                  .filter(([, v]) => v)
                  .map(([id, v]) => (
                    <li key={id}>
                      <span className="shirt big">{player(id)?.number}</span>
                      <span>
                        <strong>{player(id)?.name}</strong>
                        <br />
                        {v}
                      </span>
                    </li>
                  ))}
              </ul>
            ),
          },
        ]
      : [
          {
            title: `Devre arası  ${m.half.us ?? 0} – ${m.half.them ?? 0}`,
            body: (
              <div className="slide-cols">
                <div>
                  <h3 className="tone-good">Devam</h3>
                  <ul>{m.half.good.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div>
                  <h3 className="tone-bad">Düzelt</h3>
                  <ul>{m.half.bad.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div>
                  <h3>Değişiklikler</h3>
                  <ul>
                    {m.half.subs.map((s, j) => (
                      <li key={j}>
                        ↓ {player(s.out)?.number} {surname(player(s.out)?.name ?? '')} · ↑ {player(s.in)?.number} {surname(player(s.in)?.name ?? '')}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ),
          },
          { title: 'İkinci yarı', body: <ol className="slide-message">{bullet(m.half.message)}</ol> },
        ];

  const go = (d: number) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d)));
  const s = slides[i];
  return (
    <div
      className="present"
      ref={root}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
        if (e.key === 'Escape') onClose();
      }}
    >
      <header className="present-head">
        <span className="present-count tabnum">
          {i + 1} / {slides.length}
        </span>
        <h1>{s.title}</h1>
        <div className="row">
          <Btn icon="expand" variant="ghost" onClick={() => toggleFullscreen(root.current)} aria-label="Tam ekran" />
          <Btn
            icon="close"
            variant="ghost"
            onClick={() => {
              if (document.fullscreenElement) toggleFullscreen();
              onClose();
            }}
            aria-label="Kapat"
          />
        </div>
      </header>
      <div className="present-body">{s.body}</div>
      <footer className="present-foot">
        <Btn icon="prev" size="lg" onClick={() => go(-1)} disabled={i === 0}>
          Geri
        </Btn>
        <div className="dots">
          {slides.map((_, j) => (
            <button key={j} type="button" className={j === i ? 'on' : ''} onClick={() => setI(j)} aria-label={`Slayt ${j + 1}`} />
          ))}
        </div>
        <Btn icon="next" size="lg" variant="primary" onClick={() => go(1)} disabled={i === slides.length - 1}>
          İleri
        </Btn>
      </footer>
    </div>
  );
}
