import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROLE_NAMES, surname, tokenRoles } from '../lineup';
import { usePlayer, useStore } from '../store';
import type { LabelMode, Pt, Tactic, Token } from '../types';
import { Btn } from '../ui';
import { Pitch } from './Pitch';

const STEP_MS = 1500;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Kareler arası animasyon: konumları yumuşak geçişle hesaplar */
export function useTacticAnimation(tactic: Tactic | undefined) {
  const [fi, setFi] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(1); // 1 = kareye varıldı
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const n = tactic?.frames.length ?? 0;
  const stepMs = tactic?.stepMs ?? STEP_MS;

  useEffect(() => {
    if (fi >= n) setFi(Math.max(0, n - 1));
  }, [n, fi]);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    clearTimeout(timer.current);
    setPlaying(false);
    setProgress(1);
  }, []);

  const animateTo = useCallback(
    (target: number, chain: boolean) => {
      cancelAnimationFrame(raf.current);
      clearTimeout(timer.current);
      setFi(target);
      setProgress(0);
      const t0 = performance.now();
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const tick = (now: number) => {
        const p = reduce ? 1 : Math.min(1, (now - t0) / stepMs);
        setProgress(p);
        if (p < 1) raf.current = requestAnimationFrame(tick);
        else if (chain && target + 1 < n) {
          timer.current = setTimeout(() => animateTo(target + 1, true), 450);
        } else setPlaying(false);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [n, stepMs],
  );

  const play = useCallback(() => {
    if (n < 2) return;
    setPlaying(true);
    setFi(0);
    setProgress(1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => animateTo(1, true), 350);
  }, [n, animateTo]);

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i >= n) return;
      setPlaying(false);
      if (i === fi + 1) animateTo(i, false);
      else {
        cancelAnimationFrame(raf.current);
        clearTimeout(timer.current);
        setFi(i);
        setProgress(1);
      }
    },
    [fi, n, animateTo],
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(timer.current);
    },
    [],
  );

  let pos: Record<string, Pt> = {};
  if (tactic && n) {
    const cur = tactic.frames[Math.min(fi, n - 1)];
    const prev = tactic.frames[Math.max(0, Math.min(fi, n - 1) - 1)];
    if (progress >= 1 || fi === 0) pos = cur.pos;
    else {
      const e = ease(progress);
      pos = Object.fromEntries(
        Object.entries(cur.pos).map(([k, p]) => {
          const a = prev.pos[k] ?? p;
          return [k, { x: a.x + (p.x - a.x) * e, y: a.y + (p.y - a.y) * e }];
        }),
      );
    }
  }
  return { fi, setFi: go, playing, play, stop, pos, progress, n };
}

export const labelModeOf = (s: { labels?: LabelMode; showNames: boolean }): LabelMode => s.labels ?? (s.showNames ? 'name' : 'role');

/** Oyuncu etiketleri: altta soyad, üstte konuma göre mevki (ayara göre) */
export function useTokenLabels(tactic: Tactic | undefined, mode?: LabelMode, fi = 0) {
  const { data } = useStore();
  const player = usePlayer();
  const m = mode ?? labelModeOf(data.settings);
  const frame = tactic?.frames[fi]?.pos;
  const roles = useMemo(() => (tactic ? tokenRoles(tactic, fi) : {}), [tactic?.tokens, frame, tactic?.category, fi]); // eslint-disable-line react-hooks/exhaustive-deps
  const subFor = useCallback(
    (t: Token) => {
      if ((m !== 'name' && m !== 'both') || t.kind !== 'home') return undefined;
      const p = player(t.playerId);
      return p ? surname(p.name) : undefined;
    },
    [m, player],
  );
  const roleFor = useCallback((t: Token) => (m === 'role' || m === 'both' ? roles[t.id] : undefined), [m, roles]);
  const roleName = (t: Token) => (roles[t.id] ? `${roles[t.id]} · ${ROLE_NAMES[roles[t.id]] ?? ''}` : undefined);
  return { subFor, roleFor, roleName, mode: m };
}

/** Salt-okunur, oynatılabilir taktik görünümü (sunumlar, antrenman kartları) */
/**
 * Salt-okunur, oynatılabilir taktik görünümü (sunumlar, antrenman kartları).
 * `step`/`play` verilirse dışarıdan yönetilir: TV ekranı tabletteki adımı ve oynatmayı izler.
 */
export function TacticPlayer({
  tactic,
  big,
  step,
  play,
  onStep,
  onPlay,
  fit,
}: {
  tactic: Tactic;
  big?: boolean;
  /** Saha, kabın kalan alanını doldurur (yatay tek ekran düzenleri) */
  fit?: boolean;
  step?: number;
  play?: number;
  onStep?: (n: number) => void;
  onPlay?: () => void;
}) {
  const { data } = useStore();
  const a = useTacticAnimation(tactic);
  const labels = useTokenLabels(tactic, undefined, Math.min(a.fi, Math.max(0, a.n - 1)));
  const prevStep = useRef(step);
  const prevPlay = useRef(play);
  useEffect(() => {
    if (step) a.setFi(step); // ortadan katılan ekran doğrudan o adıma geçer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (step != null && step !== prevStep.current) {
      prevStep.current = step;
      a.setFi(step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  useEffect(() => {
    if (play != null && play !== prevPlay.current) {
      prevPlay.current = play;
      if (play > 0) a.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);
  const goStep = (n: number) => {
    const i = Math.max(0, Math.min(a.n - 1, n));
    if (onStep) onStep(i);
    else a.setFi(i);
  };
  const togglePlay = () => {
    if (a.playing) a.stop();
    else if (onPlay) onPlay();
    else a.play();
  };
  const frame = tactic.frames[Math.min(a.fi, a.n - 1)];
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  return (
    <div className={'tplayer' + (big ? ' big' : '') + (fit ? ' fit' : '')}>
      {a.n > 1 && (
        <div className="tplayer-bar">
          <Btn icon={a.playing ? 'pause' : 'play'} variant="primary" size={big ? 'lg' : 'sm'} onClick={togglePlay} aria-label={a.playing ? 'Durdur' : 'Oynat'}>
            {a.playing ? 'Durdur' : 'Oynat'}
          </Btn>
          <Btn icon="prev" size={big ? 'lg' : 'sm'} variant="ghost" onClick={() => goStep(a.fi - 1)} disabled={a.fi === 0} aria-label="Önceki adım" />
          <ol className="tp-steps" aria-label="Adımlar">
            {tactic.frames.map((_, i) => (
              <li key={i}>
                <button type="button" className={i === a.fi ? 'on' : ''} onClick={() => goStep(i)} aria-label={`Adım ${i + 1}`} aria-current={i === a.fi ? 'step' : undefined}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
          <Btn icon="next" size={big ? 'lg' : 'sm'} variant="ghost" onClick={() => goStep(a.fi + 1)} disabled={a.fi >= a.n - 1} aria-label="Sonraki adım" />
          <span className="tplayer-step">
            Adım {a.fi + 1}/{a.n}
          </span>
        </div>
      )}
      <div className="pitch-fit" style={{ '--fit-ar': tactic.half ? 58.5 / 74 : 1.5 } as React.CSSProperties}>
        <Pitch tokens={tactic.tokens} pos={a.pos} drawings={frame?.drawings ?? []} half={tactic.half} colors={colors} subFor={labels.subFor} roleFor={labels.roleFor} tokenScale={tactic.tokenScale} />
      </div>
      {frame?.note && <p className="tplayer-note">{frame.note}</p>}
    </div>
  );
}
