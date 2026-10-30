import { PITCH } from '../football';
import { DEF_LINE, PRESS_LINE, WIDTH, type Slot } from '../lineup';
import type { TeamInstructions } from '../types';
import { PitchSurface } from './Pitch';

const PRESS_OPACITY = { az: 0.15, dengeli: 0.24, yogun: 0.36 } as const;
const FOCUS_Y = { sol: [12], merkez: [34], sag: [56], dengeli: [12, 34, 56] } as const;

/** Takım talimatlarının sahadaki görünümü: pres alanı, savunma hattı, takım boyu, hücum genişliği ve yönü */
export function InstructionsPitch({ ins, slots, color, className }: { ins: TeamInstructions; slots: Slot[]; color: string; className?: string }) {
  const press = PRESS_LINE[ins.block];
  const def = DEF_LINE[ins.line];
  const w = WIDTH[ins.width];
  const length = Math.round(press - def);
  const lanes = FOCUS_Y[ins.focus];
  return (
    <svg viewBox={`-3 -3 ${PITCH.w + 6} ${PITCH.h + 6}`} className={'pitch ins-pitch ' + (className ?? '')} role="img" aria-label="Takım talimatları sahada">
      <PitchSurface />
      {/* pres alanı */}
      <rect x={press} y={0} width={PITCH.w - press} height={PITCH.h} className="ins-press" style={{ opacity: PRESS_OPACITY[ins.press] }} />
      <line x1={press} y1={0} x2={press} y2={PITCH.h} className="ins-press-line" />
      <text x={press + 1} y={3.2} className="ins-label">
        Pres başlangıcı · {Math.round(press)} m
      </text>
      {/* hücum genişliği */}
      {[w, PITCH.h - w].map((y) => (
        <line key={y} x1={PITCH.w / 2} y1={y} x2={PITCH.w - 1} y2={y} className="ins-width" />
      ))}
      <text x={PITCH.w - 1.5} y={w - 1} textAnchor="end" className="ins-label">
        Hücum genişliği
      </text>
      {/* hücum yönü */}
      {lanes.map((y) => (
        <path key={y} d={`M${PITCH.w / 2 + 6},${y} L${PITCH.w - 14},${y}`} className="ins-arrow" markerEnd="url(#arrow-c)" style={{ strokeWidth: lanes.length > 1 ? 0.9 : 1.8 }} />
      ))}
      {/* takımın oyuncuları */}
      {slots.map((s) => (
        <circle key={s.key} cx={s.p.x} cy={s.p.y} r={1.5} fill={color} stroke="#fff" strokeWidth={0.25} opacity={s.playerId ? 0.9 : 0.35} />
      ))}
      {/* savunma hattı */}
      <line x1={def} y1={1} x2={def} y2={PITCH.h - 1} className={'ins-def' + (ins.offside ? ' offside' : '')} />
      <text x={def + 0.8} y={PITCH.h - 6.5} className="ins-label">
        {ins.offside ? 'Ofsayt çizgisi' : 'Savunma hattı'} · {def} m
      </text>
      {/* takım boyu */}
      <g className="ins-length">
        <line x1={def} y1={PITCH.h - 2.5} x2={press} y2={PITCH.h - 2.5} />
        <line x1={def} y1={PITCH.h - 3.6} x2={def} y2={PITCH.h - 1.4} />
        <line x1={press} y1={PITCH.h - 3.6} x2={press} y2={PITCH.h - 1.4} />
        <text x={(def + press) / 2} y={PITCH.h - 3.4} textAnchor="middle" className="ins-label strong">
          Takım boyu ≈ {length} m
        </text>
      </g>
    </svg>
  );
}
