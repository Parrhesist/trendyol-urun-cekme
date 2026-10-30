import { useEffect, useState } from 'react';
import { fmtDate, todayISO } from '../football';
import { useStore } from '../store';
import { isPlayed, sessionMinutes } from '../stats';
import { Btn, toggleFullscreen } from '../ui';
import { useDeck } from './decks';
import type { DeckTarget } from './links';
import { useLive, type DeckState } from './live';
import { Presenter, useNow, useWakeLock } from './Presenter';

/**
 * TV ekranı (#ekran): bir kez açılıp bırakılır. Antrenör "TV'ye gönder" deyince sunum gelir,
 * slayt/adım/süre tabletle eşzamanlı ilerler. Kumandayla da gezinilebilir; tabletten gelen bir
 * sonraki değişiklik ekranı yeniden eşitler.
 */
export function ScreenView() {
  const { mode } = useStore();
  const live = useLive();
  const announce = live.announceScreen;
  useEffect(() => announce(), [announce]);
  useWakeLock(true);
  const remote = live.live;
  const target: DeckTarget | null = remote?.active && remote.kind && remote.id ? { kind: remote.kind, id: remote.id } : null;
  const deck = useDeck(target);
  const [local, setLocal] = useState<{ at: number; st: DeckState } | null>(null);
  if (mode === 'loading')
    return (
      <div className="tv-root tv-idle">
        <div className="spinner" aria-hidden="true" />
        <p className="muted">Bağlanıyor…</p>
      </div>
    );
  if (deck && remote) {
    const base: DeckState = { slide: remote.slide, step: remote.step, play: remote.play, timer: remote.timer ?? null };
    const st = local && local.at === remote.at ? local.st : base;
    return <Presenter deck={deck} state={st} mode="tv" onChange={(p) => setLocal({ at: remote.at, st: { ...st, ...p } })} />;
  }
  return <Idle />;
}

function Idle() {
  const { data, mode } = useStore();
  const now = useNow(true, 10000);
  const today = todayISO();
  const next = [...data.matches].filter((m) => !isPlayed(m) && m.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextSession = [...data.sessions].filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const days = next ? Math.round((+new Date(next.date + 'T12:00:00') - +new Date(today + 'T12:00:00')) / 864e5) : 0;
  const d = new Date(now);
  return (
    <div className="tv-root tv-idle">
      <header className="tv-top">
        <span className="crest" style={{ background: data.settings.homeColor }}>
          {data.settings.shortName.slice(0, 3)}
        </span>
        <h1>{data.settings.teamName}</h1>
        <div className="tv-clock">
          <span className="tabnum">{d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          <small>{d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
        </div>
      </header>
      <div className="tv-cards">
        {next && (
          <section className="tv-card match">
            <p className="eyebrow">Sıradaki maç · {days === 0 ? 'bugün' : `${days} gün sonra`}</p>
            <h2>
              {data.settings.shortName} {next.venue === 'İç Saha' ? 'vs' : '@'} {next.opponent}
            </h2>
            <p>
              {fmtDate(next.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {next.time} · {next.competition}
            </p>
          </section>
        )}
        {nextSession && (
          <section className="tv-card">
            <p className="eyebrow">{nextSession.date === today ? 'Bugünkü antrenman' : 'Sıradaki antrenman'}</p>
            <h2>{nextSession.title}</h2>
            <p>
              {fmtDate(nextSession.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {sessionMinutes(nextSession)} dk
              {nextSession.focus ? ` · ${nextSession.focus}` : ''}
            </p>
          </section>
        )}
      </div>
      <footer className="tv-wait">
        <span className="live-dot idle" aria-hidden="true" />
        <p>
          Ekran hazır. Tabletten bir sunumu <strong>Ekrana yansıt → TV'ye gönder</strong> ile gönderin.
          {mode === 'local' && ' (Bu ekran aynı bilgisayardaki diğer pencereyi izler.)'}
        </p>
        <Btn size="lg" icon="expand" autoFocus onClick={() => toggleFullscreen()}>
          Tam ekran
        </Btn>
      </footer>
    </div>
  );
}

/** Doğrudan sunum bağlantısı (#sunum-…): tek başına, tam ekran, yerel kontrol */
export function DeckPage({ target, onExit }: { target: DeckTarget; onExit: () => void }) {
  const { mode } = useStore();
  const deck = useDeck(target);
  const [st, setSt] = useState<DeckState>({ slide: 0, step: 0, play: 0, timer: null });
  if (mode === 'loading')
    return (
      <div className="tv-root tv-idle">
        <div className="spinner" aria-hidden="true" />
      </div>
    );
  if (!deck)
    return (
      <div className="tv-root tv-idle">
        <h1>Sunum bulunamadı</h1>
        <p className="muted">Bağlantı eski olabilir ya da içerik silinmiş.</p>
        <Btn onClick={onExit}>Uygulamaya git</Btn>
      </div>
    );
  return <Presenter deck={deck} state={st} onChange={(p) => setSt((s) => ({ ...s, ...p }))} mode="page" onClose={onExit} />;
}
