import type { ReactNode } from 'react';
import { CompareRow } from '../components/Charts';
import { InstructionsPitch } from '../components/InstructionsPitch';
import { LineupBoard } from '../components/LineupBoard';
import { TacticPlayer } from '../components/TacticPlayer';
import { addDays, fmtDate } from '../football';
import { libItem } from '../library';
import { benchOf, DEFAULT_INSTRUCTIONS, detectFormation, INSTRUCTION_LABEL, matchSlots, slotRoles, surname } from '../lineup';
import { usePlayer, useStore } from '../store';
import { countEvents, sessionLoad, sessionMinutes } from '../stats';
import type { Match, Player, Session, Tactic, TeamData } from '../types';
import { lines } from '../ui';
import type { DeckTarget } from './links';

export interface SlideCtx {
  step: number;
  play: number;
  onStep: (n: number) => void;
  onPlay: () => void;
}

export interface Slide {
  title: string;
  kicker?: string;
  timerMs?: number; // geri sayım (antrenman bloğu süresi)
  render: (ctx: SlideCtx) => ReactNode;
}

export interface Deck {
  title: string;
  subtitle: string;
  slides: Slide[];
}

const RPE_LABEL = ['', 'Çok çok hafif', 'Çok hafif', 'Hafif', 'Orta', 'Biraz zor', 'Zor', 'Zor+', 'Çok zor', 'Çok çok zor', 'Maksimum'];
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const bullet = (s: string) => lines(s).map((x) => <li key={x}>{x}</li>);

function tacticSlide(t: Tactic, kicker?: string): Slide {
  return {
    title: t.name,
    kicker: kicker ?? `${t.category} · ${t.frames.length} adım`,
    render: (c) => (
      <div className="slide-tactic">
        <TacticPlayer key={t.id} tactic={t} big step={c.step} play={c.play} onStep={c.onStep} onPlay={c.onPlay} />
        {t.description && <p className="slide-desc">{t.description}</p>}
        {t.points && <ul className="slide-points compact">{bullet(t.points)}</ul>}
      </div>
    ),
  };
}

/** Sunumu (slaytları) hedefe göre kurar; bulunamazsa null */
export function useDeck(target: DeckTarget | null): Deck | null {
  const { data } = useStore();
  const player = usePlayer();
  if (!target) return null;
  switch (target.kind) {
    case 'mac':
    case 'devre': {
      const m = data.matches.find((x) => x.id === target.id);
      if (!m) return null;
      return target.kind === 'mac' ? matchDeck(m, data, player) : halfDeck(m, data, player);
    }
    case 'taktik': {
      const t = data.tactics.find((x) => x.id === target.id);
      if (!t) return null;
      return { title: t.name, subtitle: `Taktik · ${t.category}`, slides: [tacticSlide(t)] };
    }
    case 'antrenman': {
      const s = data.sessions.find((x) => x.id === target.id);
      return s ? sessionDeck(s, data, player) : null;
    }
    case 'hafta':
      return /^\d{4}-\d{2}-\d{2}$/.test(target.id) ? weekDeck(target.id, data) : null;
    case 'kutup': {
      const it = libItem(target.id);
      return it ? { title: it.def.name, subtitle: `Hazır taktik · ${it.def.group}`, slides: [tacticSlide(it.tactic, `${it.def.group} · ${it.tactic.frames.length} adım`)] } : null;
    }
  }
}

type PlayerFn = (id?: string) => Player | undefined;

function matchDeck(m: Match, data: TeamData, player: PlayerFn): Deck {
  const slots = matchSlots(m.pre);
  const shape = detectFormation(
    slots.map((s) => ({ id: s.key, p: s.p })),
    slotRoles(slots),
  );
  const ins = { ...DEFAULT_INSTRUCTIONS, ...m.pre.instructions };
  const duties = m.pre.duties ?? {};
  const pn = (id?: string) => (id && player(id) ? `${player(id)!.number} ${surname(player(id)!.name)}` : '—');
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  const tactics = m.pre.tacticIds.map((id) => data.tactics.find((t) => t.id === id)).filter((t): t is Tactic => !!t);
  const when = `${fmtDate(m.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${m.time ?? ''} · ${m.venue}`;
  const slides: Slide[] = [
    {
      title: `${data.settings.teamName} – ${m.opponent}`,
      kicker: `${when} · Diziliş ${shape}`,
      render: () => (
        <div className="slide-cover">
          <div className="slide-lineup">
            <LineupBoard slots={slots} player={player} colors={colors} captain={duties.captain} />
          </div>
          <p className="muted">Yedekler: {benchOf(m.pre).map((id) => pn(id)).join(' · ') || '—'}</p>
        </div>
      ),
    },
    {
      title: `Rakip: ${m.opponent}`,
      kicker: `Diziliş ${m.pre.oppFormation}`,
      render: () => (
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
      render: () => (
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
    {
      title: 'Takım talimatları',
      render: () => (
        <div className="slide-ins">
          <InstructionsPitch ins={ins} slots={slots} color={data.settings.homeColor} />
          <dl className="slide-dl">
            {INSTRUCTION_LABEL(ins).map((x) => (
              <div key={x.label}>
                <dt>{x.label}</dt>
                <dd>{x.value}</dd>
              </div>
            ))}
            {ins.offside && (
              <div>
                <dt>Ofsayt taktiği</dt>
                <dd>Evet</dd>
              </div>
            )}
            <div>
              <dt>Kaptan</dt>
              <dd>{pn(duties.captain)}</dd>
            </div>
            <div>
              <dt>Penaltı · Korner · Serbest vuruş</dt>
              <dd>
                {pn(duties.penalty)} · {pn(duties.corner)} · {pn(duties.freeKick)}
              </dd>
            </div>
          </dl>
        </div>
      ),
    },
    ...tactics.map((t, i) => tacticSlide(t, `Taktik ${i + 1}/${tactics.length} · ${t.category}`)),
    {
      title: 'Görevler',
      render: () => (
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
  ];
  return { title: `${m.opponent || 'Maç'} — maç öncesi`, subtitle: when, slides };
}

function halfDeck(m: Match, data: TeamData, player: PlayerFn): Deck {
  const us = countEvents(m.post.events, 'biz', 45);
  const them = countEvents(m.post.events, 'rakip', 45);
  const hasStats = m.post.events.some((e) => e.minute <= 45);
  const slides: Slide[] = [
    {
      title: `Devre arası  ${m.half.us ?? 0} – ${m.half.them ?? 0}`,
      kicker: `${data.settings.shortName} – ${m.opponent}`,
      render: () => (
        <div className="slide-cols">
          <div>
            <h3 className="tone-good">Devam</h3>
            <ul>
              {m.half.good.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="tone-bad">Düzelt</h3>
            <ul>
              {m.half.bad.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
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
  ];
  if (hasStats)
    slides.push({
      title: 'İlk yarı verileri',
      render: () => (
        <div className="cmp slide-cmp">
          <div className="cmp-legend">
            <span>
              <i className="sw-us" /> {data.settings.shortName}
            </span>
            <span>
              {m.opponent} <i className="sw-them" />
            </span>
          </div>
          <CompareRow label="Şut" us={us.sut} them={them.sut} />
          <CompareRow label="İsabetli şut" us={us.isabetli} them={them.isabetli} />
          <CompareRow label="Korner" us={us.korner} them={them.korner} />
          <CompareRow label="Faul" us={us.faul} them={them.faul} />
          <CompareRow label="Top kazanma" us={us.kazanma} them={them.kazanma} />
        </div>
      ),
    });
  slides.push({ title: 'İkinci yarı', render: () => <ol className="slide-message">{bullet(m.half.message)}</ol> });
  return { title: `${m.opponent || 'Maç'} — devre arası`, subtitle: fmtDate(m.date, { day: 'numeric', month: 'long' }), slides };
}

function sessionDeck(s: Session, data: TeamData, player: PlayerFn): Deck {
  const total = sessionMinutes(s);
  const blocks = s.blocks.map((b) => ({ ...b, drill: data.drills.find((d) => d.id === b.drillId) }));
  const present = data.players.length - s.absent.length;
  const when = fmtDate(s.date, { weekday: 'long', day: 'numeric', month: 'long' });
  let clock = 0;
  const cover: Slide = {
    title: s.title,
    kicker: `${when}${s.focus ? ' · Odak: ' + s.focus : ''}`,
    render: () => (
      <div className="slide-session">
        <div className="slide-kpis">
          <div>
            <span className="kpi-num tabnum">{total}</span>
            <small>dakika</small>
          </div>
          <div>
            <span className="kpi-num tabnum">{s.rpe}</span>
            <small>RPE · {RPE_LABEL[s.rpe]}</small>
          </div>
          <div>
            <span className="kpi-num tabnum">{sessionLoad(s).toLocaleString('tr-TR')}</span>
            <small>yük (AU)</small>
          </div>
          <div>
            <span className="kpi-num tabnum">
              {present}/{data.players.length}
            </span>
            <small>katılım</small>
          </div>
        </div>
        <ol className="timeline">
          {blocks.map((b, i) => {
            const start = clock;
            clock += b.minutes;
            return (
              <li key={i} style={{ flexGrow: b.minutes }} className={'tl-' + (i % 5)}>
                <span className="tl-time tabnum">{start}′</span>
                <strong>{b.drill?.name ?? 'Drill'}</strong>
                <small className="tabnum">{b.minutes} dk</small>
              </li>
            );
          })}
        </ol>
        {s.absent.length > 0 && <p className="muted">Katılmayanlar: {s.absent.map((id) => `${player(id)?.number ?? ''} ${surname(player(id)?.name ?? '')}`).join(' · ')}</p>}
        {s.notes && <p className="slide-desc">{s.notes}</p>}
      </div>
    ),
  };
  const blockSlides: Slide[] = blocks.map((b, i) => {
    const d = b.drill;
    const t = data.tactics.find((x) => x.id === d?.tacticId);
    return {
      title: d?.name ?? 'Drill',
      kicker: `Blok ${i + 1}/${blocks.length} · ${d?.category ?? ''} · ${b.minutes} dk`,
      timerMs: b.minutes * 60000,
      render: (c) => (
        <div className={'slide-drill' + (t ? '' : ' no-diagram')}>
          {t && <TacticPlayer key={t.id} tactic={t} big step={c.step} play={c.play} onStep={c.onStep} onPlay={c.onPlay} />}
          <div className="drill-info">
            {d?.objective && <p className="slide-objective">{d.objective}</p>}
            <div className="chips">
              {d?.players && <span className="chip">Oyuncu: {d.players}</span>}
              {d?.equipment && <span className="chip">Malzeme: {d.equipment}</span>}
            </div>
            {d?.coachingPoints && (
              <>
                <h3>Koçluk noktaları</h3>
                <ul className="slide-points">{bullet(d.coachingPoints)}</ul>
              </>
            )}
          </div>
        </div>
      ),
    };
  });
  return { title: `${s.title} — antrenman`, subtitle: when, slides: [cover, ...blockSlides] };
}

function weekDeck(start: string, data: TeamData): Deck {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = addDays(start, 6);
  const sessions = data.sessions.filter((s) => s.date >= start && s.date <= end);
  const load = sessions.reduce((a, s) => a + sessionLoad(s), 0);
  const range = `${fmtDate(start, { day: 'numeric', month: 'long' })} – ${fmtDate(end, { day: 'numeric', month: 'long' })}`;
  return {
    title: 'Haftalık plan',
    subtitle: range,
    slides: [
      {
        title: 'Haftalık plan',
        kicker: `${range} · ${sessions.length} seans · ${load.toLocaleString('tr-TR')} AU`,
        render: () => (
          <div className="slide-week">
            {days.map((d, i) => {
              const ss = sessions.filter((s) => s.date === d);
              const m = data.matches.find((x) => x.date === d);
              return (
                <div key={d} className="sw-day">
                  <div className="sw-head">
                    <strong>{DAYS[i]}</strong>
                    <span className="tabnum">{fmtDate(d, { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {m && (
                    <div className="sw-match">
                      MAÇ · {m.opponent}
                      <small>
                        {m.time} · {m.venue}
                      </small>
                    </div>
                  )}
                  {ss.map((s) => (
                    <div key={s.id} className={'sw-sess rpe-' + Math.ceil(s.rpe / 3.4)}>
                      <strong>{s.title}</strong>
                      <small>
                        {sessionMinutes(s)} dk · RPE {s.rpe}
                      </small>
                      {s.focus && <small>{s.focus}</small>}
                    </div>
                  ))}
                  {!m && !ss.length && <span className="sw-off">İzin</span>}
                </div>
              );
            })}
          </div>
        ),
      },
    ],
  };
}
