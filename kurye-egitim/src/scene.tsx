// Senaryo sahnelerinin çizimi: yukarıdan bakış, sade sokak planı.
// Renkler tema token'larından gelir (styles.css → --sc-*).
import { Sign } from './signs';
import type { SceneEl, Spot } from './types';

export const SCENE_W = 360;
export const SCENE_H = 260;
const VAN = { w: 52, h: 22 };

export type SpotState = 'idle' | 'right' | 'picked-wrong' | 'wrong';

function El({ e }: { e: SceneEl }) {
  switch (e.k) {
    case 'road':
      return <rect className="sc-road" x={e.x} y={e.y} width={e.w} height={e.h} />;
    case 'walk':
      return <rect className="sc-walk" x={e.x} y={e.y} width={e.w} height={e.h} />;
    case 'bike':
      return <rect className="sc-bike" x={e.x} y={e.y} width={e.w} height={e.h} />;
    case 'gate':
      return (
        <rect className="sc-gate" x={e.x + 0.5} y={e.y + 0.5} width={e.w - 1} height={e.h - 1} />
      );
    case 'house':
      return (
        <g>
          <rect className={e.target ? 'sc-house target' : 'sc-house'} x={e.x} y={e.y} width={e.w} height={e.h} rx="2" />
          {e.no && (
            <text className={e.target ? 'sc-no target' : 'sc-no'} x={e.x + e.w / 2 + (e.target && e.h < 40 ? 10 : 0)} y={e.y + e.h / 2 + 4} textAnchor="middle">
              {e.no}
            </text>
          )}
          {/* Alçak binada paket simgesi numaranın soluna, yüksekte üstüne */}
          {e.target && (e.h < 40 ? <Parcel x={e.x + e.w / 2 - 12} y={e.y + e.h / 2} /> : <Parcel x={e.x + e.w / 2} y={e.y + e.h / 2 - 14} />)}
        </g>
      );
    case 'dash':
      return <line className="sc-dash" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />;
    case 'line':
      return <line className="sc-line" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />;
    case 'zebra': {
      const vertical = e.h > e.w;
      const n = Math.floor((vertical ? e.h : e.w) / 10);
      return (
        <g className="sc-mark">
          {Array.from({ length: n }, (_, i) =>
            vertical ? (
              <rect key={i} x={e.x} y={e.y + i * 10 + 2} width={e.w} height={6} />
            ) : (
              <rect key={i} x={e.x + i * 10 + 2} y={e.y} width={6} height={e.h} />
            ),
          )}
        </g>
      );
    }
    case 'car': {
      const w = e.v ? 20 : 44;
      const h = e.v ? 44 : 20;
      return (
        <g>
          <rect className={`sc-car c${e.c ?? 0}`} x={e.x} y={e.y} width={w} height={h} rx="5" />
          {e.v ? (
            <rect className="sc-glass" x={e.x + 3} y={e.y + 12} width={14} height={8} rx="2" />
          ) : (
            <rect className="sc-glass" x={e.x + 24} y={e.y + 3} width={8} height={14} rx="2" />
          )}
        </g>
      );
    }
    case 'sign': {
      const size = e.size ?? 22;
      const total = e.ids.length * size + (e.ids.length - 1) * 2;
      return (
        <g>
          <line className="sc-post" x1={e.x} y1={e.y} x2={e.x} y2={e.y - 4} />
          <circle className="sc-post-dot" cx={e.x} cy={e.y} r="2" />
          {e.ids.map((id, i) => (
            <g key={id} transform={`translate(${e.x - size / 2} ${e.y - 4 - total + i * (size + 2)})`}>
              <Sign id={id} size={size} />
            </g>
          ))}
        </g>
      );
    }
    case 'plate': {
      const w = e.text.length * 5.6 + 10;
      return (
        <g>
          <rect className={e.red ? 'sc-plate red' : 'sc-plate'} x={e.x - w / 2} y={e.y - 8} width={w} height={14} rx="2" />
          <text className="sc-plate-text" x={e.x} y={e.y + 2.5} textAnchor="middle">
            {e.text}
          </text>
        </g>
      );
    }
    case 'label':
      return (
        <text className="sc-label" x={e.x} y={e.y} textAnchor={e.anchor ?? 'middle'}>
          {e.text}
        </text>
      );
    case 'arrow': {
      const rot = { r: 0, d: 90, l: 180, u: 270 }[e.dir];
      return <path className="sc-mark" transform={`translate(${e.x} ${e.y}) rotate(${rot})`} d="M-14 -2.5 H4 V-7 L14 0 L4 7 V2.5 H-14 Z" />;
    }
    case 'measure': {
      const vertical = e.x1 === e.x2;
      const mx = (e.x1 + e.x2) / 2;
      const my = (e.y1 + e.y2) / 2;
      return (
        <g className="sc-measure">
          <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
          {vertical ? (
            <>
              <line x1={e.x1 - 3} y1={e.y1} x2={e.x1 + 3} y2={e.y1} />
              <line x1={e.x2 - 3} y1={e.y2} x2={e.x2 + 3} y2={e.y2} />
            </>
          ) : (
            <>
              <line x1={e.x1} y1={e.y1 - 3} x2={e.x1} y2={e.y1 + 3} />
              <line x1={e.x2} y1={e.y2 - 3} x2={e.x2} y2={e.y2 + 3} />
            </>
          )}
          <text x={vertical ? mx + 5 : mx} y={vertical ? my + 3 : my - 4} textAnchor={vertical ? 'start' : 'middle'}>
            {e.text}
          </text>
        </g>
      );
    }
    case 'van': {
      const w = e.v ? VAN.h : VAN.w;
      const h = e.v ? VAN.w : VAN.h;
      return (
        <g>
          <rect className="sc-van" x={e.x} y={e.y} width={w} height={h} rx="4" />
          {e.v ? (
            <rect className="sc-van-glass" x={e.x + 3} y={e.y + 7} width={w - 6} height={8} rx="2" />
          ) : (
            <rect className="sc-van-glass" x={e.x + w - 15} y={e.y + 3} width={8} height={h - 6} rx="2" />
          )}
          {e.label && (
            <text className="sc-van-label" x={e.x + w / 2} y={e.labelY ?? (e.v ? e.y + h + 12 : e.y - 5)} textAnchor="middle">
              {e.label}
            </text>
          )}
        </g>
      );
    }
    case 'rider':
      return e.v ? (
        <g className="sc-person">
          <line x1={e.x} y1={e.y} x2={e.x} y2={e.y + 24} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx={e.x} cy={e.y + 13} rx="6" ry="3.5" />
        </g>
      ) : (
        <g className="sc-person">
          <line x1={e.x} y1={e.y} x2={e.x + 24} y2={e.y} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx={e.x + 11} cy={e.y} rx="3.5" ry="6" />
        </g>
      );
    case 'ped':
      return (
        <g className="sc-person">
          <ellipse cx={e.x} cy={e.y} rx="7" ry="4" />
          <circle cx={e.x} cy={e.y} r="3.2" className="sc-head" />
        </g>
      );
    case 'rail': {
      const n = Math.floor(Math.hypot(e.x2 - e.x1, e.y2 - e.y1) / 18);
      return (
        <g className="sc-rail">
          <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
          {Array.from({ length: n + 1 }, (_, i) => {
            const t = n ? i / n : 0;
            const x = e.x1 + (e.x2 - e.x1) * t;
            const y = e.y1 + (e.y2 - e.y1) * t;
            return <circle key={i} cx={x} cy={y} r="1.8" />;
          })}
        </g>
      );
    }
    case 'bridge':
      return (
        <g>
          <rect className="sc-bridge" x={e.x} y={e.y} width={e.w} height={e.h} />
          {e.label && (
            <text className="sc-bridge-label" x={e.x + 6} y={e.y + e.h / 2 + 3.5}>
              {e.label}
            </text>
          )}
        </g>
      );
  }
}

function Parcel({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 7} ${y - 6})`}>
      <rect className="sc-parcel" width="14" height="12" rx="1.5" />
      <path className="sc-parcel-tape" d="M7 0 V12 M0 4 H14" />
    </g>
  );
}

function SpotView({ s, state, onPick, disabled }: { s: Spot; state: SpotState; onPick: () => void; disabled: boolean }) {
  const w = s.w ?? (s.v ? VAN.h : VAN.w);
  const h = s.h ?? (s.v ? VAN.w : VAN.h);
  const big = w >= 40 || h >= 40;
  const cx = s.x + w / 2;
  const cy = s.y + h / 2;
  const solid = state === 'right' || state === 'picked-wrong';
  return (
    <g
      className={`sc-spot ${state}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Seçenek ${s.id}: ${s.label}`}
      aria-disabled={disabled}
      onClick={() => !disabled && onPick()}
      onKeyDown={(ev) => {
        if (!disabled && (ev.key === 'Enter' || ev.key === ' ')) {
          ev.preventDefault();
          onPick();
        }
      }}
    >
      {/* Dokunma alanı görünenden biraz büyük */}
      <rect className="sc-hit" x={s.x - 4} y={s.y - 4} width={w + 8} height={h + 8} />
      <rect className="sc-spot-box" x={s.x} y={s.y} width={w} height={h} rx="4" />
      {solid &&
        big &&
        (s.v ? (
          <rect className="sc-spot-glass" x={s.x + 3} y={s.y + 12} width={w - 6} height={8} rx="2" />
        ) : (
          <rect className="sc-spot-glass" x={s.x + w - 20} y={s.y + 3} width={8} height={h - 6} rx="2" />
        ))}
      <circle className="sc-spot-badge" cx={cx} cy={cy} r="8" />
      <text className="sc-spot-letter" x={cx} y={cy + 3.6} textAnchor="middle">
        {state === 'right' ? '✓' : state === 'picked-wrong' || state === 'wrong' ? '✗' : s.id}
      </text>
      {(state === 'wrong' || state === 'picked-wrong' || state === 'right') && (
        <text className="sc-spot-tag" x={cx} y={s.v ? s.y - 4 : s.y - 4} textAnchor="middle">
          {s.id}
        </text>
      )}
    </g>
  );
}

export function Scene({
  els,
  spots,
  states,
  onPick,
  label,
}: {
  els: SceneEl[];
  spots: Spot[];
  states: Record<string, SpotState>;
  onPick: (id: Spot['id']) => void;
  label: string;
}) {
  const answered = Object.values(states).some((s) => s !== 'idle');
  return (
    <svg className="scene" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} role="group" aria-label={label}>
      <rect className="sc-ground" width={SCENE_W} height={SCENE_H} />
      {els.map((e, i) => (
        <El key={i} e={e} />
      ))}
      {spots.map((s) => (
        <SpotView key={s.id} s={s} state={states[s.id] ?? 'idle'} onPick={() => onPick(s.id)} disabled={answered} />
      ))}
    </svg>
  );
}
