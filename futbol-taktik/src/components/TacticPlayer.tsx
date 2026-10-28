import { useCallback, useEffect, useRef, useState } from 'react';
import { surname } from '../lineup';
import { usePlayer, useStore } from '../store';
import type { Pt, Tactic, Token } from '../types';
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
        const p = reduce ? 1 : Math.min(1, (now - t0) / STEP_MS);
        setProgress(p);
        if (p < 1) raf.current = requestAnimationFrame(tick);
        else if (chain && target + 1 < n) {
          timer.current = setTimeout(() => animateTo(target + 1, true), 450);
        } else setPlaying(false);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [n],
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

export function useTokenSub() {
  const { data } = useStore();
  const player = usePlayer();
  return useCallback(
    (t: Token) => {
      if (!data.settings.showNames || t.kind !== 'home') return undefined;
      const p = player(t.playerId);
      return p ? surname(p.name) : undefined;
    },
    [data.settings.showNames, player],
  );
}

/** Salt-okunur, oynatılabilir taktik görünümü (sunumlar, antrenman kartları) */
export function TacticPlayer({ tactic, big }: { tactic: Tactic; big?: boolean }) {
  const { data } = useStore();
  const a = useTacticAnimation(tactic);
  const sub = useTokenSub();
  const frame = tactic.frames[Math.min(a.fi, a.n - 1)];
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  return (
    <div className={'tplayer' + (big ? ' big' : '')}>
      <Pitch tokens={tactic.tokens} pos={a.pos} drawings={frame?.drawings ?? []} half={tactic.half} colors={colors} subFor={sub} />
      {a.n > 1 && (
        <div className="tplayer-bar">
          <Btn icon={a.playing ? 'pause' : 'play'} variant="primary" size={big ? 'lg' : 'sm'} onClick={a.playing ? a.stop : a.play} aria-label={a.playing ? 'Durdur' : 'Oynat'} />
          <Btn icon="prev" size={big ? 'lg' : 'sm'} variant="ghost" onClick={() => a.setFi(a.fi - 1)} aria-label="Önceki adım" />
          <span className="tplayer-step">
            Adım {a.fi + 1}/{a.n}
          </span>
          <Btn icon="next" size={big ? 'lg' : 'sm'} variant="ghost" onClick={() => a.setFi(a.fi + 1)} aria-label="Sonraki adım" />
        </div>
      )}
      {frame?.note && <p className="tplayer-note">{frame.note}</p>}
    </div>
  );
}
