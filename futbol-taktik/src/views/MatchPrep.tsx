import { useEffect, useMemo, useRef, useState } from 'react';
import { InstructionsPitch } from '../components/InstructionsPitch';
import { LineupBoard } from '../components/LineupBoard';
import { clientToPitch, MiniPitch, Pitch } from '../components/Pitch';
import { TacticPlayer } from '../components/TacticPlayer';
import { FORMATION_NAMES, FORMATIONS, mirror, STATUS_META } from '../football';
import {
  adaptTactic,
  applyFormation,
  autoLineup,
  benchOf,
  classifyRoles,
  DEFAULT_INSTRUCTIONS,
  detectFormation,
  fitFor,
  INSTRUCTION_GROUPS,
  matchSlots,
  ROLE_NAMES,
  slotRoles,
  surname,
  tacticFromMatch,
} from '../lineup';
import { PresentActions } from '../present/Actions';
import { usePlayer, useStore } from '../store';
import type { Duties, Match, Player, Pt, TacticCategory, TeamInstructions, Token } from '../types';
import { Btn, ConfirmBtn, Empty, Field, Icon, Modal, Pill, Segmented } from '../ui';

type Sub = 'dizilis' | 'talimat' | 'taktik' | 'rakip';
type SetPre = (p: Partial<Match['pre']>) => void;

// Taktik tahtasından maça dönüldüğünde kalınan alt sekme hatırlanır
const lastSub: Record<string, Sub> = {};

export function MatchPrep({ m, setPre, onOpenTactic }: { m: Match; setPre: SetPre; onOpenTactic: (id: string) => void }) {
  const [sub, setSub] = useState<Sub>(lastSub[m.id] ?? 'dizilis');
  useEffect(() => {
    lastSub[m.id] = sub;
  }, [m.id, sub]);
  return (
    <div className="stack">
      <div className="row between">
        <Segmented
          id="prep-sub"
          value={sub}
          onChange={setSub}
          options={[
            { value: 'dizilis', label: 'Kadro ve diziliş' },
            { value: 'talimat', label: 'Takım talimatları' },
            { value: 'taktik', label: `Maç taktikleri (${m.pre.tacticIds.length})` },
            { value: 'rakip', label: 'Rakip ve oyun planı' },
          ]}
        />
        <div className="row">
          <PresentActions target={{ kind: 'mac', id: m.id }} label="Soyunma odası sunumu" />
        </div>
      </div>
      {sub === 'dizilis' && <LineupEditor m={m} setPre={setPre} />}
      {sub === 'talimat' && <InstructionsEditor m={m} setPre={setPre} />}
      {sub === 'taktik' && <MatchTactics m={m} setPre={setPre} onOpenTactic={onOpenTactic} />}
      {sub === 'rakip' && <OpponentPlan m={m} setPre={setPre} />}
    </div>
  );
}

/* ================= Kadro ve diziliş ================= */

const ROLE_ORDER = ['KL', 'SĞB', 'SĞKB', 'STP', 'SLB', 'SLKB', 'DOS', 'MO', 'SĞK', 'OOS', 'SLK', 'FV'];

type Snapshot = Pick<Match['pre'], 'formation' | 'lineup' | 'positions' | 'bench' | 'duties'>;

function LineupEditor({ m, setPre }: { m: Match; setPre: SetPre }) {
  const { data, canEdit, toast } = useStore();
  const player = usePlayer();
  const [selected, setSelected] = useState<string | null>(null);
  const [placing, setPlacing] = useState<string | null>(null);
  const [showOpp, setShowOpp] = useState(false);
  const [drag, setDrag] = useState<{ pid: string; x: number; y: number; active: boolean; hover: string | null } | null>(null);
  const history = useRef<Snapshot[]>([]);
  const svgEl = useRef<SVGSVGElement | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const pre = m.pre;
  const slots = matchSlots(pre);
  const roles = slotRoles(slots);
  const shape = detectFormation(
    slots.map((s) => ({ id: s.key, p: s.p })),
    roles,
  );
  const xiIds = new Set(slots.map((s) => s.playerId).filter(Boolean) as string[]);
  const bench = benchOf(pre);
  const players = [...data.players].sort((a, b) => a.number - b.number);
  const others = players.filter((p) => !xiIds.has(p.id) && !bench.includes(p.id));
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  const captain = pre.duties?.captain;
  const slotOf = (pid: string) => slots.find((s) => s.playerId === pid);
  const filled = slots.filter((s) => s.playerId).length;

  /** Her değişiklik geri alınabilir: önce mevcut hali sakla */
  const commit = (patch: Partial<Match['pre']>) => {
    if (!canEdit) return;
    history.current = [...history.current.slice(-30), { formation: pre.formation, lineup: pre.lineup, positions: pre.positions, bench: pre.bench, duties: pre.duties }];
    setPre(patch);
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) setPre({ ...prev, positions: prev.positions ?? {} });
  };

  const withoutFromBench = (pid: string, b = pre.bench) => b.filter((x) => x !== pid);

  /** Oyuncuyu bir slota koyar. Oyuncu zaten ilk 11'deyse iki oyuncu yer değiştirir; slottaki eski oyuncu yedeğe geçer. */
  const assign = (key: string, pid: string) => {
    const lineup = { ...pre.lineup };
    const from = slotOf(pid)?.key;
    const prevOcc = lineup[key];
    if (from === key) return;
    if (from != null) {
      if (prevOcc) lineup[from] = prevOcc;
      else delete lineup[from];
      lineup[key] = pid;
      commit({ lineup });
    } else {
      lineup[key] = pid;
      let b = withoutFromBench(pid);
      if (prevOcc && !b.includes(prevOcc)) b = [...b, prevOcc];
      commit({ lineup, bench: b });
      const pl = player(pid);
      if (pl) toast(`${pl.number} ${surname(pl.name)} ilk 11'de${prevOcc ? `, ${surname(player(prevOcc)?.name ?? '')} yedeğe geçti` : ''}`);
    }
    setPlacing(null);
  };

  const swap = (a: string, b: string) => {
    const lineup = { ...pre.lineup };
    const [pa, pb] = [lineup[a], lineup[b]];
    if (pb) lineup[a] = pb;
    else delete lineup[a];
    if (pa) lineup[b] = pa;
    else delete lineup[b];
    commit({ lineup });
  };

  const move = (key: string, p: Pt) => {
    commit({ positions: { ...(pre.positions ?? {}), [key]: p } });
  };

  /** Kadrodan gelen oyuncuyu sahada boş bir yere bırak */
  const placeAt = (pid: string, p: Pt) => {
    const empties = slots.filter((s) => !s.playerId);
    const near = slots.filter((s) => s.playerId).sort((a, b) => Math.hypot(a.p.x - p.x, a.p.y - p.y) - Math.hypot(b.p.x - p.x, b.p.y - p.y))[0];
    if (near && Math.hypot(near.p.x - p.x, near.p.y - p.y) < 4) return assign(near.key, pid);
    if (!empties.length) {
      toast('İlk 11 dolu. Oyuncuyu sahadaki birinin üstüne bırakın ya da önce birini yedeğe alın.', 'err');
      return;
    }
    const target = empties.sort((a, b) => Math.hypot(a.p.x - p.x, a.p.y - p.y) - Math.hypot(b.p.x - p.x, b.p.y - p.y))[0];
    const fromKey = slotOf(pid)?.key;
    const lineup = { ...pre.lineup, [target.key]: pid };
    if (fromKey) delete lineup[fromKey];
    commit({ lineup, positions: { ...(pre.positions ?? {}), [target.key]: p }, bench: withoutFromBench(pid) });
    setPlacing(null);
  };

  const removeFromXI = (key: string, toBench: boolean) => {
    const pid = pre.lineup[key];
    if (!pid) return;
    const lineup = { ...pre.lineup };
    delete lineup[key];
    commit({ lineup, bench: toBench ? [...withoutFromBench(pid), pid] : withoutFromBench(pid) });
  };

  const toggleBench = (pid: string) => commit({ bench: bench.includes(pid) ? withoutFromBench(pid) : [...bench, pid] });

  const setDuty = (k: keyof Duties, pid?: string) => commit({ duties: { ...(pre.duties ?? {}), [k]: pid } });

  const copyLast = () => {
    const prev = [...data.matches].filter((x) => x.id !== m.id && Object.keys(x.pre.lineup).length).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!prev) return toast('Kopyalanacak önceki maç kadrosu yok', 'err');
    const valid = new Set(data.players.map((p) => p.id));
    commit({
      formation: prev.pre.formation,
      lineup: Object.fromEntries(Object.entries(prev.pre.lineup).filter(([, id]) => valid.has(id))),
      positions: prev.pre.positions ?? {},
      bench: prev.pre.bench.filter((id) => valid.has(id)),
      duties: prev.pre.duties,
    });
    toast(`${prev.opponent} maçının kadrosu kopyalandı`);
  };

  // Kadro listesinden sürükle-bırak (dokunmatik ve fare)
  useEffect(() => {
    if (!drag) return;
    const mv = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]');
      setDrag((d) => d && { ...d, x: e.clientX, y: e.clientY, active: d.active || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6, hover: el?.getAttribute('data-slot') ?? null });
    };
    const up = (e: PointerEvent) => {
      const d = drag;
      setDrag(null);
      if (!d.active) {
        startPlacing(d.pid);
        return;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]');
      const key = el?.getAttribute('data-slot');
      if (key) return assign(key, d.pid);
      const p = clientToPitch(svgEl.current, e.clientX, e.clientY);
      if (p) placeAt(d.pid, p);
    };
    const cancel = () => setDrag(null);
    document.body.classList.add('no-select');
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      document.body.classList.remove('no-select');
    };
  });

  const startPlacing = (pid: string) => {
    if (!canEdit) return;
    if (selected) {
      const s = slots.find((x) => x.key === selected);
      if (s) return assign(s.key, pid);
    }
    setPlacing(pid);
    if (window.matchMedia('(max-width: 1100px)').matches) boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const onSlotTap = (key: string) => {
    if (placing) return assign(key, placing);
    setSelected((s) => (s === key ? null : key));
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select')) return;
      if (e.key === 'Escape') {
        setSelected(null);
        setPlacing(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && canEdit) removeFromXI(selected, true);
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') undo();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const oppPts = showOpp && FORMATIONS[pre.oppFormation] ? FORMATIONS[pre.oppFormation].map(([, x, y]) => mirror({ x, y })) : undefined;
  const sel = slots.find((s) => s.key === selected);
  const placingPlayer = player(placing ?? undefined);

  const row = (p: Player, extra?: React.ReactNode, onTap?: () => void) => {
    const s = slotOf(p.id);
    const role = s ? roles[s.key] : undefined;
    const fit = role ? fitFor(p, role) : 2;
    return (
      <li key={p.id} className={'sq-row' + (placing === p.id ? ' placing' : '') + (p.status === 'sakat' || p.status === 'cezali' ? ' unavailable' : '')}>
        {canEdit && (
          <span
            className="grip"
            aria-label={`${p.name} oyuncusunu sahaya sürükle`}
            onPointerDown={(e) => {
              e.preventDefault();
              setDrag({ pid: p.id, x: e.clientX, y: e.clientY, active: false, hover: null });
            }}
          >
            <Icon name="grip" size={16} />
          </span>
        )}
        <button type="button" className="sq-main" onClick={onTap ?? (() => startPlacing(p.id))} disabled={!canEdit && !onTap}>
          <span className="shirt">{p.number}</span>
          <span className="sq-name">
            <strong>{p.name}</strong>
            <small>
              {p.role ? `${p.role} · ${ROLE_NAMES[p.role] ?? ''}` : 'Mevki girilmemiş'}
              {captain === p.id ? ' · Kaptan' : ''}
            </small>
          </span>
          {role && <span className={'role-chip' + (fit === 0 ? ' warn' : '')}>{role}</span>}
          {p.status !== 'hazir' && <Pill tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Pill>}
        </button>
        {extra}
      </li>
    );
  };

  const xiSorted = slots
    .filter((s) => s.playerId)
    .sort((a, b) => ROLE_ORDER.indexOf(roles[a.key]) - ROLE_ORDER.indexOf(roles[b.key]) || a.p.y - b.p.y)
    .map((s) => player(s.playerId))
    .filter((p): p is Player => !!p);

  return (
    <div className={'lineup-editor' + (sel ? ' has-sel' : '')}>
      <div className="lu-board" ref={boardRef}>
        {canEdit && (
          <div className="lu-toolbar">
            <div className="lu-presets" role="group" aria-label="Diziliş şablonu">
              <span className="field-label">Şablon</span>
              {FORMATION_NAMES.map((f) => (
                <button key={f} type="button" className={'chip' + (pre.formation === f && !Object.keys(pre.positions ?? {}).length ? ' on' : '')} onClick={() => commit(applyFormation(pre, f, data.players))} title="Oyuncular korunur, en uygun yerlere taşınır">
                  {f}
                </button>
              ))}
            </div>
            <div className="row">
              <Btn size="sm" variant="ghost" icon="undo" onClick={undo} disabled={!history.current.length}>
                Geri al
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => commit({ positions: {} })} disabled={!Object.keys(pre.positions ?? {}).length}>
                Konumları şablona hizala
              </Btn>
              <Btn size="sm" variant="ghost" onClick={copyLast}>
                Son maçın kadrosu
              </Btn>
              <ConfirmBtn
                size="sm"
                variant="ghost"
                label="Mevcut 11 değişecek — onayla"
                onConfirm={() => {
                  const ids = autoLineup(pre.formation, data.players);
                  commit({ lineup: Object.fromEntries(ids.map((id, i) => [String(i), id]).filter(([, id]) => id)), positions: {}, bench: pre.bench.filter((b) => !ids.includes(b)) });
                }}
              >
                Otomatik diz
              </ConfirmBtn>
              <label className="check small">
                <input id="lu-opp" type="checkbox" checked={showOpp} onChange={(e) => setShowOpp(e.target.checked)} /> Rakibi göster ({pre.oppFormation})
              </label>
            </div>
          </div>
        )}
        <div className="lu-status">
          <span>
            Sahadaki diziliş <strong className="tabnum">{shape}</strong>
          </span>
          <span className={filled < 11 ? 'tone-warn' : 'muted'}>
            İlk 11: <strong className="tabnum">{filled}/11</strong>
          </span>
          <span className="muted">Yedek: {bench.length}</span>
        </div>
        {placingPlayer && (
          <div className="lu-banner" role="status">
            <span>
              <strong>
                {placingPlayer.number} {placingPlayer.name}
              </strong>{' '}
              — sahada bir oyuncuya dokunun (yerine girer) veya boş bir yere dokunun.
            </span>
            <Btn size="sm" onClick={() => setPlacing(null)}>
              Vazgeç
            </Btn>
          </div>
        )}
        <LineupBoard
          slots={slots}
          player={player}
          colors={colors}
          editable={canEdit}
          selected={selected}
          captain={captain}
          opp={oppPts}
          placing={!!placing || !!drag?.active}
          dropHover={drag?.active ? drag.hover : null}
          onSlotTap={onSlotTap}
          onPitchTap={(p) => (placing ? placeAt(placing, p) : setSelected(null))}
          onMove={move}
          onSwap={swap}
          svgRef={(el) => (svgEl.current = el)}
        />
        <p className="legend">
          <span>
            <span className="role-chip">STP</span> konuma göre mevki
          </span>
          <span>
            <span className="role-chip warn">SLK</span> oyuncunun doğal mevkisi dışında
          </span>
          <span>K kaptan</span>
          {canEdit && <span>Sürükle: taşı · başka oyuncunun üstüne bırak: yer değiştir · dokun: seç</span>}
        </p>
      </div>

      <aside className="lu-side panel">
        {sel ? (
          <SlotPanel
            key={sel.key}
            slotKey={sel.key}
            role={roles[sel.key]}
            pid={sel.playerId}
            m={m}
            players={players}
            roleOfPlayer={(pid) => {
              const s = slotOf(pid);
              return s ? roles[s.key] : undefined;
            }}
            bench={bench}
            onClose={() => setSelected(null)}
            onAssign={(pid) => assign(sel.key, pid)}
            onRemove={(toBench) => removeFromXI(sel.key, toBench)}
            onCaptain={(pid) => setDuty('captain', captain === pid ? undefined : pid)}
            onTask={(pid, v) => setPre({ tasks: { ...pre.tasks, [pid]: v } })}
          />
        ) : (
          <>
            <h2 className="section-title">Kadro</h2>
            {canEdit && <p className="hint">Oyuncuyu tutamaçtan (⋮⋮) sürükleyip sahaya bırakın ya da adına dokunup sahada yerini seçin.</p>}
            <h3 className="sq-head">
              İlk 11 <span className="muted tabnum">{filled}/11</span>
            </h3>
            <ul className="sq-list">
              {xiSorted.map((p) =>
                row(p, undefined, () => {
                  const s = slotOf(p.id);
                  if (s) setSelected(s.key);
                }),
              )}
            </ul>
            <h3 className="sq-head">
              Yedekler <span className="muted tabnum">{bench.length}</span>
            </h3>
            {bench.length ? (
              <ul className="sq-list">
                {bench.map((id) => {
                  const p = player(id);
                  return p
                    ? row(
                        p,
                        canEdit && (
                          <Btn size="sm" variant="ghost" onClick={() => toggleBench(p.id)}>
                            Çıkar
                          </Btn>
                        ),
                      )
                    : null;
                })}
              </ul>
            ) : (
              <p className="muted small">Henüz yedek seçilmedi.</p>
            )}
            <h3 className="sq-head">
              Kadroda değil <span className="muted tabnum">{others.length}</span>
            </h3>
            <ul className="sq-list">
              {others.map((p) =>
                row(
                  p,
                  canEdit && (
                    <Btn size="sm" variant="ghost" onClick={() => toggleBench(p.id)}>
                      Yedeğe ekle
                    </Btn>
                  ),
                ),
              )}
            </ul>
          </>
        )}
      </aside>
      {drag?.active && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
          <span className="shirt">{player(drag.pid)?.number}</span> {surname(player(drag.pid)?.name ?? '')}
        </div>
      )}
    </div>
  );
}

function SlotPanel(props: {
  slotKey: string;
  role: string;
  pid?: string;
  m: Match;
  players: Player[];
  bench: string[];
  roleOfPlayer: (pid: string) => string | undefined;
  onClose: () => void;
  onAssign: (pid: string) => void;
  onRemove: (toBench: boolean) => void;
  onCaptain: (pid: string) => void;
  onTask: (pid: string, v: string) => void;
}) {
  const { canEdit } = useStore();
  const { role, m } = props;
  const p = props.players.find((x) => x.id === props.pid);
  const fit = fitFor(p, role);
  const [showAll, setShowAll] = useState(false);
  const candidates = useMemo(() => {
    const rank = (x: Player) => fitFor(x, role) * 10 + (x.status === 'hazir' ? 3 : x.status === 'supheli' ? 2 : 0) + (props.bench.includes(x.id) ? 1 : 0);
    return props.players.filter((x) => x.id !== props.pid).sort((a, b) => rank(b) - rank(a) || a.number - b.number);
  }, [props.players, props.pid, props.bench, role]);
  const list = showAll ? candidates : candidates.filter((x) => fitFor(x, role) > 0).slice(0, 8);
  return (
    <div className="slot-panel">
      <header className="row between">
        <div>
          <p className="eyebrow">Konuma göre mevki</p>
          <h2>
            {role} · {ROLE_NAMES[role] ?? role}
          </h2>
        </div>
        <Btn variant="ghost" icon="close" onClick={props.onClose} aria-label="Kapat" />
      </header>
      {p ? (
        <>
          <div className="slot-player">
            <span className="shirt big">{p.number}</span>
            <div>
              <strong>{p.name}</strong>
              <div className="row">
                <Pill tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Pill>
                {fit === 2 && <Pill tone="good">Doğal mevkisi</Pill>}
                {fit === 1 && <Pill tone="neutral">Aynı hat · doğal mevkisi {p.role}</Pill>}
                {fit === 0 && <Pill tone="warn">Mevki dışı · doğal mevkisi {p.role ?? '—'}</Pill>}
              </div>
              {p.note && <p className="muted small">{p.note}</p>}
            </div>
          </div>
          {canEdit && (
            <div className="row">
              <Btn size="sm" onClick={() => props.onCaptain(p.id)} variant={m.pre.duties?.captain === p.id ? 'primary' : 'plain'}>
                {m.pre.duties?.captain === p.id ? 'Kaptan ✓' : 'Kaptan yap'}
              </Btn>
              <Btn size="sm" onClick={() => props.onRemove(true)}>
                Yedeğe al
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => props.onRemove(false)}>
                Kadro dışı bırak
              </Btn>
            </div>
          )}
          <Field label="Bu maçtaki görevi">
            <textarea id={'slot-task-' + p.id} rows={3} readOnly={!canEdit} value={m.pre.tasks[p.id] ?? ''} placeholder="Ör. Stoperler arasına in, 9 numaranın sırtında kal." onChange={(e) => props.onTask(p.id, e.target.value)} />
          </Field>
        </>
      ) : (
        <p className="muted">Bu mevki boş. Aşağıdan bir oyuncu seçin.</p>
      )}
      {canEdit && (
        <>
          <div className="row between">
            <h3 className="sq-head">{p ? 'Yerine oyuncu seç' : 'Oyuncu seç'}</h3>
            <button type="button" className="link-btn" onClick={() => setShowAll((x) => !x)}>
              {showAll ? 'Uygun olanlar' : 'Tüm kadro'}
            </button>
          </div>
          <ul className="sq-list">
            {list.map((x) => {
              const where = props.roleOfPlayer(x.id);
              const f = fitFor(x, role);
              return (
                <li key={x.id} className={'sq-row' + (x.status === 'sakat' || x.status === 'cezali' ? ' unavailable' : '')}>
                  <button type="button" className="sq-main" onClick={() => props.onAssign(x.id)}>
                    <span className="shirt">{x.number}</span>
                    <span className="sq-name">
                      <strong>{x.name}</strong>
                      <small>
                        {x.role ?? '—'}
                        {where ? ` · şu an ${where} (yer değiştirir)` : props.bench.includes(x.id) ? ' · yedek' : ''}
                      </small>
                    </span>
                    {f === 2 && <Pill tone="good">Uygun</Pill>}
                    {x.status !== 'hazir' && <Pill tone={STATUS_META[x.status].tone}>{STATUS_META[x.status].label}</Pill>}
                  </button>
                </li>
              );
            })}
            {!list.length && <li className="muted small">Bu mevkide doğal oyuncu yok. “Tüm kadro”ya bakın.</li>}
          </ul>
        </>
      )}
    </div>
  );
}

/* ================= Takım talimatları ================= */

const STYLES: { name: string; desc: string; ins: TeamInstructions }[] = [
  { name: 'Dengeli', desc: 'Orta blok, karışık oyun', ins: DEFAULT_INSTRUCTIONS },
  { name: 'Topa sahip olma', desc: 'Kısa pas, geniş saha, sabırlı', ins: { ...DEFAULT_INSTRUCTIONS, line: 'yuksek', width: 'genis', tempo: 'yavas', passing: 'kisa', buildUp: 'kisa', onWin: 'sakin' } },
  { name: 'Yoğun pres', desc: 'Yüksek blok, kayıpta anında baskı', ins: { ...DEFAULT_INSTRUCTIONS, block: 'yuksek', line: 'yuksek', press: 'yogun', tempo: 'hizli', onLose: 'karsi_pres', onWin: 'hizli', offside: true } },
  { name: 'Kontra atak', desc: 'Alçak blok, kazanınca hızlı ve direkt', ins: { ...DEFAULT_INSTRUCTIONS, block: 'alcak', line: 'derin', press: 'az', tempo: 'hizli', passing: 'direkt', buildUp: 'uzun', onWin: 'hizli', onLose: 'geri_cekil' } },
];

function InstructionsEditor({ m, setPre }: { m: Match; setPre: SetPre }) {
  const { data, canEdit } = useStore();
  const player = usePlayer();
  const ins = { ...DEFAULT_INSTRUCTIONS, ...m.pre.instructions };
  const set = (patch: Partial<TeamInstructions>) => canEdit && setPre({ instructions: { ...ins, ...patch } });
  const slots = matchSlots(m.pre);
  const xi = slots.map((s) => player(s.playerId)).filter((p): p is Player => !!p);
  const duties = m.pre.duties ?? {};
  const activeStyle = STYLES.find((s) => JSON.stringify(s.ins) === JSON.stringify(ins))?.name;
  const dutySelect = (k: keyof Duties, label: string) => (
    <Field label={label}>
      <select id={'duty-' + k} value={duties[k] ?? ''} disabled={!canEdit} onChange={(e) => setPre({ duties: { ...duties, [k]: e.target.value || undefined } })}>
        <option value="">—</option>
        {xi.map((p) => (
          <option key={p.id} value={p.id}>
            {p.number} {p.name}
          </option>
        ))}
        {duties[k] && !xi.some((p) => p.id === duties[k]) && player(duties[k]) && (
          <option value={duties[k]}>
            {player(duties[k])!.number} {player(duties[k])!.name} (ilk 11'de değil)
          </option>
        )}
      </select>
    </Field>
  );
  return (
    <div className="two-col ins-layout">
      <section className="panel">
        <h2 className="section-title">Oyun stili</h2>
        <div className="style-grid">
          {STYLES.map((s) => (
            <button key={s.name} type="button" disabled={!canEdit} className={'style-card' + (activeStyle === s.name ? ' on' : '')} onClick={() => setPre({ instructions: s.ins })}>
              <strong>{s.name}</strong>
              <small>{s.desc}</small>
            </button>
          ))}
        </div>
        <p className="muted small">Bir stil seçip aşağıdan ince ayar yapabilirsiniz.</p>
        {INSTRUCTION_GROUPS.map((g) => (
          <div key={g.title} className="ins-group">
            <h3 className="sq-head">{g.title}</h3>
            {g.items.map((it) => (
              <div key={it.key} className="ins-row">
                <div>
                  <strong>{it.label}</strong>
                  {it.help && <small className="muted">{it.help}</small>}
                </div>
                <div className="seg ins-seg">
                  {it.options.map(([v, l]) => (
                    <button key={v} type="button" disabled={!canEdit} className={ins[it.key] === v ? 'on' : ''} onClick={() => set({ [it.key]: v } as Partial<TeamInstructions>)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {g.title === 'Savunma' && (
              <label className="check">
                <input id="ins-offside" type="checkbox" checked={ins.offside} disabled={!canEdit} onChange={(e) => set({ offside: e.target.checked })} /> Ofsayt taktiği uygula
              </label>
            )}
          </div>
        ))}
      </section>
      <section className="panel ins-visual">
        <h2 className="section-title">Sahada görünümü</h2>
        <InstructionsPitch ins={ins} slots={slots} color={data.settings.homeColor} />
        <p className="muted small">Sarı alan presin başladığı bölge, kesikli çizgi savunma hattı. Takım boyu iki hat arasındaki mesafedir; 35 m altı kompakt sayılır.</p>
        <h2 className="section-title">Görevliler</h2>
        <div className="form-grid">
          {dutySelect('captain', 'Kaptan')}
          {dutySelect('penalty', 'Penaltı')}
          {dutySelect('corner', 'Korner')}
          {dutySelect('freeKick', 'Serbest vuruş')}
        </div>
      </section>
    </div>
  );
}

/* ================= Maç taktikleri ================= */

const CATS: TacticCategory[] = ['Hücum', 'Savunma', 'Geçiş', 'Duran Top'];

function MatchTactics({ m, setPre, onOpenTactic }: { m: Match; setPre: SetPre; onOpenTactic: (id: string) => void }) {
  const { data, save, canEdit, toast } = useStore();
  const [creating, setCreating] = useState(false);
  const [picking, setPicking] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  const linked = m.pre.tacticIds.map((id) => data.tactics.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  const move = (i: number, d: number) => {
    const ids = [...m.pre.tacticIds];
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setPre({ tacticIds: ids });
  };
  return (
    <div className="stack">
      {canEdit && (
        <div className="row">
          <Btn variant="primary" icon="plus" onClick={() => setCreating(true)}>
            Bu kadroyla yeni taktik
          </Btn>
          <Btn icon="board" onClick={() => setPicking(true)}>
            Kütüphaneden ekle
          </Btn>
          <span className="muted small">Taktikler sunumda bu sırayla gösterilir.</span>
        </div>
      )}
      {!linked.length && <Empty title="Bu maç için taktik yok">Maç kadronuzla yeni bir taktik çizin ya da kütüphanedeki bir taktiği bu kadroya uyarlayın.</Empty>}
      <ol className="mt-list">
        {linked.map((t, i) => (
          <li key={t.id} className="mt-item panel">
            <div className="mt-row">
              <span className="mt-num tabnum">{i + 1}</span>
              <button type="button" className="mt-thumb" onClick={() => setPreview(preview === t.id ? null : t.id)} aria-label="Önizle">
                <MiniPitch tokens={t.tokens} pos={t.frames[0].pos} drawings={t.frames[Math.min(1, t.frames.length - 1)].drawings} half={t.half} colors={colors} />
              </button>
              <div className="mt-body">
                <span className="cat">{t.category}</span>
                <strong>{t.name}</strong>
                <small className="muted">
                  {t.frames.length} adım{t.matchId === m.id ? ' · bu maç için hazırlandı' : ' · kütüphaneden'}
                </small>
              </div>
              <div className="row">
                <Btn size="sm" icon="play" onClick={() => setPreview(preview === t.id ? null : t.id)}>
                  {preview === t.id ? 'Kapat' : 'Önizle'}
                </Btn>
                <Btn size="sm" variant="primary" onClick={() => onOpenTactic(t.id)}>
                  {canEdit ? 'Düzenle' : 'Aç'}
                </Btn>
                {canEdit && (
                  <>
                    <Btn size="sm" variant="ghost" icon="up" aria-label="Yukarı" disabled={i === 0} onClick={() => move(i, -1)} />
                    <Btn size="sm" variant="ghost" icon="down" aria-label="Aşağı" disabled={i === linked.length - 1} onClick={() => move(i, 1)} />
                    <Btn size="sm" variant="ghost" icon="close" aria-label="Maçtan çıkar" onClick={() => setPre({ tacticIds: m.pre.tacticIds.filter((x) => x !== t.id) })} />
                  </>
                )}
              </div>
            </div>
            {preview === t.id && <TacticPlayer tactic={t} />}
          </li>
        ))}
      </ol>
      {creating && (
        <NewMatchTactic
          m={m}
          onClose={() => setCreating(false)}
          onCreate={async (opts) => {
            const t = tacticFromMatch(m, data.players, opts);
            await save('tactics', t);
            setPre({ tacticIds: [...m.pre.tacticIds, t.id] });
            setCreating(false);
            onOpenTactic(t.id);
          }}
        />
      )}
      {picking && (
        <Modal title="Kütüphaneden taktik ekle" onClose={() => setPicking(false)} wide>
          <p className="muted">
            <strong>Uyarla</strong> taktiğin bir kopyasını oluşturur ve oyuncuları bu maçın kadrosuyla, sahadaki konumlarına göre eşleştirir. <strong>Bağla</strong> taktiği olduğu gibi ekler.
          </p>
          <div className="pick-tactics">
            {data.tactics
              .filter((t) => t.category !== 'Antrenman' && !m.pre.tacticIds.includes(t.id))
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((t) => (
                <div key={t.id} className="pick-t">
                  <MiniPitch tokens={t.tokens} pos={t.frames[0].pos} drawings={[]} half={t.half} colors={colors} />
                  <div className="mt-body">
                    <span className="cat">{t.category}</span>
                    <strong>{t.name}</strong>
                  </div>
                  <div className="row">
                    <Btn
                      size="sm"
                      variant="primary"
                      onClick={async () => {
                        const c = adaptTactic(t, m, data.players);
                        await save('tactics', c);
                        setPre({ tacticIds: [...m.pre.tacticIds, c.id] });
                        toast('Taktik bu kadroya uyarlandı');
                        setPicking(false);
                      }}
                    >
                      Uyarla
                    </Btn>
                    <Btn
                      size="sm"
                      onClick={() => {
                        setPre({ tacticIds: [...m.pre.tacticIds, t.id] });
                        setPicking(false);
                      }}
                    >
                      Bağla
                    </Btn>
                  </div>
                </div>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewMatchTactic({ m, onClose, onCreate }: { m: Match; onClose: () => void; onCreate: (o: { name: string; category: TacticCategory; withOpponent: boolean; half: boolean }) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TacticCategory>('Hücum');
  const [withOpponent, setWithOpponent] = useState(true);
  const [half, setHalf] = useState(false);
  return (
    <Modal
      title="Bu kadroyla yeni taktik"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Vazgeç</Btn>
          <Btn variant="primary" onClick={() => onCreate({ name: name.trim() || `${category} — ${m.opponent || 'maç'}`, category, withOpponent, half })}>
            Oluştur ve çiz
          </Btn>
        </>
      }
    >
      <p className="muted">Oyuncular maç kadrosundaki yerleriyle sahaya gelir. Sonra okları çizip adımları ekleyin.</p>
      <div className="form-grid">
        <Field label="Ad" wide>
          <input id="mt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Ör. ${m.opponent || 'Rakip'} karşısında pres`} autoFocus />
        </Field>
        <Field label="Kategori">
          <select id="mt-cat" value={category} onChange={(e) => setCategory(e.target.value as TacticCategory)}>
            {CATS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Görünüm">
          <select id="mt-half" value={half ? 'yari' : 'tam'} onChange={(e) => setHalf(e.target.value === 'yari')}>
            <option value="tam">Tam saha</option>
            <option value="yari">Yarı saha</option>
          </select>
        </Field>
        <label className="check wide">
          <input id="mt-opp" type="checkbox" checked={withOpponent} onChange={(e) => setWithOpponent(e.target.checked)} /> Rakibi {m.pre.oppFormation} dizilişiyle ekle
        </label>
      </div>
    </Modal>
  );
}

/* ================= Rakip ve oyun planı ================= */

function OpponentPlan({ m, setPre }: { m: Match; setPre: SetPre }) {
  const { data, canEdit } = useStore();
  const opp = FORMATIONS[m.pre.oppFormation] ?? [];
  const tokens: Token[] = opp.map((_, i) => ({ id: 'o' + i, kind: 'away', label: String(i + 1) }));
  const pos: Record<string, Pt> = Object.fromEntries(opp.map(([, x, y], i) => ['o' + i, mirror({ x, y })]));
  const roles = classifyRoles(opp.map(([, x, y], i) => ({ id: 'o' + i, p: { x, y } })));
  const tf = (k: keyof Match['pre'], label: string, rows = 4, ph = '') => (
    <Field label={label}>
      <textarea id={'pre-' + k} rows={rows} value={m.pre[k] as string} placeholder={ph} readOnly={!canEdit} onChange={(e) => setPre({ [k]: e.target.value })} />
    </Field>
  );
  return (
    <div className="stack">
      <div className="two-col wide-left">
        <section className="panel">
          <div className="row between">
            <h2 className="section-title">Rakip: {m.opponent || '—'}</h2>
            <label className="inline">
              Diziliş{' '}
              <select id="pre-oppform" value={m.pre.oppFormation} disabled={!canEdit} onChange={(e) => setPre({ oppFormation: e.target.value })}>
                {FORMATION_NAMES.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
          <Pitch tokens={tokens} pos={pos} drawings={[]} colors={{ home: data.settings.homeColor, away: data.settings.awayColor }} roleFor={(t) => roles[t.id]} />
          <p className="muted small">Rakip sağdan sola hücum eder. Mevkiler rakibin kendi bakış açısından yazılır.</p>
        </section>
        <section className="panel">
          {tf('oppStrengths', 'Güçlü yönleri', 5, 'Her satır bir madde')}
          {tf('oppWeaknesses', 'Zayıf yönleri', 5, 'Her satır bir madde')}
          {tf('oppKeyPlayers', 'Kilit oyuncular', 4, 'No — özellik')}
        </section>
      </div>
      <section className="panel">
        <h2 className="section-title">Oyun planı</h2>
        <div className="three-col">
          {tf('planAttack', 'Hücumda', 4)}
          {tf('planDefence', 'Savunmada', 4)}
          {tf('planTransition', 'Geçişlerde', 4)}
        </div>
      </section>
    </div>
  );
}
