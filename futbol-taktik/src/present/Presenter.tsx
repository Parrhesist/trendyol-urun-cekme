import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { Btn, toggleFullscreen } from '../ui';
import type { Deck } from './decks';
import type { DeckState, TimerState } from './live';

export type PresentMode = 'overlay' | 'tv' | 'page';

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const timerRemaining = (t: TimerState | null | undefined, slide: number, total: number) => {
  if (!t || t.slide !== slide) return total;
  return t.running && t.endsAt ? Math.max(0, t.endsAt - Date.now()) : t.remainingMs;
};

/** Ekran açıkken uyku moduna geçmesin (tarayıcı izin verirse) */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let lock: { release(): Promise<void> } | null = null;
    const req = async () => {
      try {
        lock = await (navigator as unknown as { wakeLock?: { request(t: string): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen') ?? null;
      } catch {
        /* izin yok */
      }
    };
    req();
    const vis = () => document.visibilityState === 'visible' && req();
    document.addEventListener('visibilitychange', vis);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      lock?.release().catch(() => undefined);
    };
  }, [on]);
}

/** Saat: her saniye yenilenir (geri sayım ve TV saati için) */
export function useNow(active: boolean, every = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [active, every]);
  return now;
}

interface Props {
  deck: Deck;
  state: DeckState;
  onChange: (patch: Partial<DeckState>) => void;
  mode: PresentMode;
  onClose?: () => void;
  castBar?: ReactNode;
}

export function Presenter({ deck, state, onChange, mode, onClose, castBar }: Props) {
  const { data } = useStore();
  const root = useRef<HTMLDivElement>(null);
  const [idle, setIdle] = useState(false);
  const n = deck.slides.length;
  const i = Math.min(state.slide, n - 1);
  const slide = deck.slides[i];
  const total = slide.timerMs ?? 0;
  const timer = state.timer && state.timer.slide === i ? state.timer : null;
  const now = useNow(!!slide.timerMs);
  const remaining = timerRemaining(timer, i, total);
  void now;
  useWakeLock(mode !== 'overlay');

  const go = (to: number) => {
    const s = Math.max(0, Math.min(n - 1, to));
    if (s !== i) onChange({ slide: s, step: 0, play: 0 });
  };
  const toggleTimer = () => {
    if (!slide.timerMs) return;
    if (timer?.running) onChange({ timer: { slide: i, running: false, remainingMs: remaining } });
    else {
      const left = remaining > 0 ? remaining : total;
      onChange({ timer: { slide: i, running: true, endsAt: Date.now() + left, remainingMs: left } });
    }
  };
  const resetTimer = () => onChange({ timer: { slide: i, running: false, remainingMs: total } });
  const addMinute = () => {
    const left = remaining + 60000;
    onChange({ timer: timer?.running ? { slide: i, running: true, endsAt: Date.now() + left, remainingMs: left } : { slide: i, running: false, remainingMs: left } });
  };
  const ctx = {
    step: state.step,
    play: state.play,
    onStep: (s: number) => onChange({ step: s }),
    onPlay: () => onChange({ play: state.play + 1, step: 0 }),
  };

  // Kumanda ve klavye: ← → slayt, ↑ ↓ taktik adımı, OK/Enter oynat veya süreyi başlat
  const handler = useRef<(e: KeyboardEvent) => void>(() => undefined);
  handler.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest?.('input,textarea,select')) return;
    const onButton = !!t.closest?.('button,a');
    let used = true;
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        go(i + 1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        go(i - 1);
        break;
      case 'ArrowDown':
        ctx.onStep(state.step + 1);
        break;
      case 'ArrowUp':
        ctx.onStep(Math.max(0, state.step - 1));
        break;
      case 'Enter':
      case ' ':
      case 'MediaPlayPause':
        if (onButton) used = false;
        else if (slide.timerMs) toggleTimer();
        else ctx.onPlay();
        break;
      case 'f':
      case 'F':
        toggleFullscreen(root.current);
        break;
      case 'Escape':
        if (mode === 'overlay' && !document.fullscreenElement) onClose?.();
        else used = false;
        break;
      default:
        used = false;
    }
    if (used) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIdle(false);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => handler.current(e);
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);

  // TV'de kontroller birkaç saniye sonra gizlenir
  useEffect(() => {
    if (mode !== 'tv' || idle) return;
    const t = setTimeout(() => setIdle(true), 4500);
    return () => clearTimeout(t);
  }, [mode, idle, state]);

  const done = !!slide.timerMs && remaining <= 0;
  return (
    <div
      ref={root}
      className={`present present-${mode}${mode === 'tv' ? ' tv-root' : ''}${idle ? ' idle' : ''}`}
      onPointerMove={() => idle && setIdle(false)}
      onPointerDown={() => setIdle(false)}
      role="dialog"
      aria-label={deck.title}
    >
      <header className="present-head">
        {mode === 'tv' && (
          <span className="crest small" style={{ background: data.settings.homeColor }}>
            {data.settings.shortName.slice(0, 3)}
          </span>
        )}
        <span className="present-count tabnum">
          {i + 1}/{n}
        </span>
        <div className="present-titles">
          {slide.kicker && <p className="slide-kicker">{slide.kicker}</p>}
          <h1>{slide.title}</h1>
        </div>
        {slide.timerMs ? (
          <div className={'timer' + (timer?.running ? ' running' : '') + (done ? ' done' : '')} aria-live="polite">
            <span className="timer-val tabnum">{done ? 'SÜRE' : fmtClock(remaining)}</span>
            <div className="timer-ctrl">
              <Btn size="sm" variant={timer?.running ? 'plain' : 'primary'} onClick={toggleTimer}>
                {timer?.running ? 'Durdur' : remaining < total && remaining > 0 ? 'Devam' : 'Başlat'}
              </Btn>
              <Btn size="sm" variant="ghost" onClick={addMinute}>
                +1 dk
              </Btn>
              <Btn size="sm" variant="ghost" onClick={resetTimer}>
                Sıfırla
              </Btn>
            </div>
          </div>
        ) : null}
        <div className="present-tools">
          {castBar}
          <Btn icon="expand" variant="ghost" onClick={() => toggleFullscreen(root.current)} aria-label="Tam ekran" />
          {onClose && (
            <Btn
              icon="close"
              variant="ghost"
              onClick={() => {
                if (document.fullscreenElement) toggleFullscreen();
                onClose();
              }}
              aria-label="Kapat"
            />
          )}
        </div>
      </header>
      <div className="present-body" key={i}>
        {slide.render(ctx)}
      </div>
      <footer className="present-foot">
        <Btn icon="prev" size="lg" onClick={() => go(i - 1)} disabled={i === 0}>
          Geri
        </Btn>
        <div className="dots">
          {deck.slides.map((s, j) => (
            <button key={j} type="button" className={j === i ? 'on' : ''} onClick={() => go(j)} aria-label={`${j + 1}. slayt: ${s.title}`} />
          ))}
        </div>
        <Btn icon="next" size="lg" variant="primary" onClick={() => go(i + 1)} disabled={i === n - 1}>
          İleri
        </Btn>
      </footer>
    </div>
  );
}
