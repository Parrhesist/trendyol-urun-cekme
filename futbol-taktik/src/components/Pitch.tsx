import { useId, useRef, useState, type ReactNode } from 'react';
import { clamp, DRAW_COLORS, PITCH, simplify, smoothPath, uid, zigzagPath } from '../football';
import type { DrawKind, Drawing, Pt, Token } from '../types';

// Saha çizgileri FIFA ölçülerinde (105 × 68 m). Tüm çizimler metre cinsinden SVG birimidir.

export function PitchLines({ half }: { half?: boolean }) {
  const { w, h } = PITCH;
  const box = (x: number, dir: 1 | -1) => {
    const pa = 16.5 * dir;
    const ga = 5.5 * dir;
    const spot = x + 11 * dir;
    const arcX = x + pa;
    // ceza yayı: 9,15 m yarıçap, penaltı noktasından
    const dy = Math.sqrt(9.15 ** 2 - (16.5 - 11) ** 2);
    return (
      <g>
        <rect x={Math.min(x, x + pa)} y={h / 2 - 20.16} width={16.5} height={40.32} />
        <rect x={Math.min(x, x + ga)} y={h / 2 - 9.16} width={5.5} height={18.32} />
        <circle cx={spot} cy={h / 2} r={0.25} className="pl-dot" />
        <path d={`M${arcX},${h / 2 - dy} A9.15,9.15 0 0 ${dir === 1 ? 1 : 0} ${arcX},${h / 2 + dy}`} />
        <rect x={dir === 1 ? x - 2 : x} y={h / 2 - 3.66} width={2} height={7.32} className="pl-goal" />
      </g>
    );
  };
  return (
    <g className="pitch-lines">
      <rect x={0} y={0} width={w} height={h} />
      {!half && box(0, 1)}
      {box(w, -1)}
      <line x1={w / 2} y1={0} x2={w / 2} y2={h} />
      <circle cx={w / 2} cy={h / 2} r={9.15} />
      <circle cx={w / 2} cy={h / 2} r={0.3} className="pl-dot" />
      {[
        [0, 0, 1, 1],
        [0, h, 1, 0],
        [w, 0, 0, 0],
        [w, h, 0, 1],
      ].map(([x, y, sx, sy], i) => (
        <path key={i} d={`M${x + (sx ? 1 : -1)},${y} A1,1 0 0 ${sx === sy ? 1 : 0} ${x},${y + (sy ? 1 : -1)}`} />
      ))}
    </g>
  );
}

function Stripes({ half }: { half?: boolean }) {
  const n = 12;
  const sw = PITCH.w / n;
  return (
    <g>
      {Array.from({ length: n }, (_, i) =>
        half && i < n / 2 - 1 ? null : <rect key={i} x={i * sw} y={-4} width={sw} height={PITCH.h + 8} className={i % 2 ? 'stripe-b' : 'stripe-a'} />,
      )}
    </g>
  );
}

/** Görünür alan [x, y, genişlik, yükseklik] */
const viewRect = (half?: boolean) => (half ? [PITCH.w / 2 - 3, -3, PITCH.w / 2 + 6, PITCH.h + 6] : [-3, -3, PITCH.w + 6, PITCH.h + 6]);

export function viewBoxFor(half?: boolean) {
  return half ? `${PITCH.w / 2 - 3} -3 ${PITCH.w / 2 + 6} ${PITCH.h + 6}` : `-3 -3 ${PITCH.w + 6} ${PITCH.h + 6}`;
}

export function DrawingShape({ d, faded, onClick }: { d: Drawing; faded?: boolean; onClick?: () => void }) {
  const color = DRAW_COLORS[d.color] ?? DRAW_COLORS.a;
  const marker = `url(#arrow-${d.color})`;
  const common = { onClick, style: { cursor: onClick ? 'pointer' : undefined, opacity: faded ? 0.25 : 1 }, className: 'drawing' };
  if (d.kind === 'zone') {
    const [a, b] = d.pts;
    return <rect {...common} x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} rx={1.2} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={0.25} strokeDasharray="1 0.6" />;
  }
  if (d.kind === 'line') {
    const [a, b] = [d.pts[0], d.pts[d.pts.length - 1]];
    return <line {...common} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={0.45} strokeLinecap="round" />;
  }
  const path = d.kind === 'dribble' ? zigzagPath(d.pts) : smoothPath(d.pts);
  return (
    <g {...common}>
      {onClick && <path d={path} stroke="transparent" strokeWidth={3} fill="none" />}
      <path d={path} fill="none" stroke={color} strokeWidth={d.kind === 'pass' ? 0.42 : 0.36} strokeDasharray={d.kind === 'run' ? '1.1 0.7' : undefined} strokeLinecap="round" strokeLinejoin="round" markerEnd={marker} />
    </g>
  );
}

export function ArrowDefs() {
  return (
    <defs>
      {Object.entries(DRAW_COLORS).map(([k, c]) => (
        <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={c} />
        </marker>
      ))}
      <radialGradient id="ball-g" cx="35%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#c9ced6" />
      </radialGradient>
    </defs>
  );
}

/** Mevki rozeti (oyuncunun üstünde küçük etiket) */
export function RoleBadge({ role, y, tone }: { role: string; y: number; tone?: 'warn' }) {
  const w = role.length * 0.95 + 1.3;
  return (
    <g transform={`translate(0,${y})`} className={'role-badge' + (tone ? ' ' + tone : '')}>
      <rect x={-w / 2} y={-1.05} width={w} height={2.1} rx={1.05} />
      <text y={0.5} textAnchor="middle">
        {role}
      </text>
    </g>
  );
}

export function TokenShape({ t, p, sub, role, selected, colors, scale = 1 }: { t: Token; p: Pt; sub?: string; role?: string; selected?: boolean; colors: { home: string; away: string }; scale?: number }) {
  const r = 1.75 * scale;
  if (t.kind === 'ball')
    return (
      <g transform={`translate(${p.x},${p.y})`} className="tok">
        <circle r={0.95} fill="url(#ball-g)" stroke="#1d2430" strokeWidth={0.18} />
        <path d="M0,-0.4 L0.38,-0.12 L0.24,0.32 L-0.24,0.32 L-0.38,-0.12 Z" fill="#1d2430" />
      </g>
    );
  if (t.kind === 'cone')
    return (
      <g transform={`translate(${p.x},${p.y})`} className="tok">
        <path d="M0,-1.1 L0.9,0.7 L-0.9,0.7 Z" fill="var(--cone)" stroke="rgba(0,0,0,.35)" strokeWidth={0.12} />
      </g>
    );
  if (t.kind === 'goal')
    return (
      <g transform={`translate(${p.x},${p.y})`} className="tok">
        <rect x={-0.9} y={-2.2} width={1.8} height={4.4} fill="none" stroke="#fff" strokeWidth={0.3} />
        <path d="M-0.9,-2.2 L0.9,2.2 M0.9,-2.2 L-0.9,2.2" stroke="rgba(255,255,255,.5)" strokeWidth={0.1} />
      </g>
    );
  const fill = t.kind === 'home' ? colors.home : colors.away;
  return (
    <g transform={`translate(${p.x},${p.y})`} className="tok">
      <circle r={r + 0.35} fill="rgba(0,0,0,.28)" cy={0.35} />
      {selected && <circle r={r + 0.9} fill="none" stroke="var(--ink-draw-c)" strokeWidth={0.35} />}
      <circle r={r} fill={fill} stroke="#fff" strokeWidth={0.32} />
      <text y={0.62 * scale} textAnchor="middle" className="tok-num" style={{ fontSize: (t.label.length > 2 ? 1.25 : 1.75) * scale }}>
        {t.label}
      </text>
      {role && <RoleBadge role={role} y={-r - 1.45} />}
      {sub && (
        <text y={r + 2} textAnchor="middle" className="tok-sub">
          {sub}
        </text>
      )}
    </g>
  );
}

/** Saha zemini: çim şeritleri, çizgiler ve ok uçları. Üstüne çizilecekler children olarak verilir. */
export function PitchSurface({ half, children }: { half?: boolean; children?: ReactNode }) {
  return (
    <>
      <ArrowDefs />
      <rect x={-6} y={-6} width={PITCH.w + 12} height={PITCH.h + 12} className="pitch-bg" />
      <Stripes half={half} />
      <PitchLines half={half} />
      {children}
    </>
  );
}

export type Tool = 'move' | DrawKind | 'erase';

interface Props {
  tokens: Token[];
  pos: Record<string, Pt>;
  drawings: Drawing[];
  ghostDrawings?: Drawing[];
  half?: boolean;
  colors: { home: string; away: string };
  subFor?: (t: Token) => string | undefined;
  roleFor?: (t: Token) => string | undefined;
  tokenScale?: number;
  tool?: Tool;
  color?: string;
  editable?: boolean;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, p: Pt) => void;
  onMoveEnd?: () => void;
  onDraw?: (d: Drawing) => void;
  onErase?: (id: string) => void;
  onPitchTap?: (p: Pt) => void;
  overlay?: ReactNode;
  className?: string;
}

export function Pitch(props: Props) {
  const { tokens, pos, drawings, half, colors, editable, tool = 'move', color = 'a' } = props;
  const svg = useRef<SVGSVGElement>(null);
  const clipId = 'vb' + useId().replace(/:/g, '');
  const [vx, vy, vw, vh] = viewRect(half);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [draft, setDraft] = useState<Drawing | null>(null);

  const toPt = (e: { clientX: number; clientY: number }): Pt => {
    const s = svg.current!;
    const m = s.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: +pt.x.toFixed(2), y: +pt.y.toFixed(2) };
  };

  const startToken = (e: React.PointerEvent, id: string) => {
    if (!editable || tool !== 'move') return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toPt(e);
    const cur = pos[id];
    drag.current = { id, dx: cur.x - p.x, dy: cur.y - p.y };
    props.onSelect?.(id);
  };

  const onDown = (e: React.PointerEvent) => {
    const p = toPt(e);
    if (props.onPitchTap) {
      props.onPitchTap(p);
      return;
    }
    if (!editable) return;
    if (tool === 'move') {
      props.onSelect?.(null);
      return;
    }
    if (tool === 'erase') return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDraft({ id: uid('d'), kind: tool, pts: [p, p], color });
  };

  const onMove = (e: React.PointerEvent) => {
    if (drag.current) {
      const p = toPt(e);
      props.onMove?.(drag.current.id, { x: clamp(p.x + drag.current.dx, -2, PITCH.w + 2), y: clamp(p.y + drag.current.dy, -2, PITCH.h + 2) });
      return;
    }
    if (draft) {
      const p = toPt(e);
      if (draft.kind === 'zone' || draft.kind === 'line') setDraft({ ...draft, pts: [draft.pts[0], p] });
      else {
        const last = draft.pts[draft.pts.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) > 0.5) setDraft({ ...draft, pts: [...draft.pts.slice(0, draft.pts.length === 2 && draft.pts[0] === draft.pts[1] ? 1 : undefined), p] });
      }
    }
  };

  const onUp = () => {
    if (drag.current) {
      drag.current = null;
      props.onMoveEnd?.();
    }
    if (draft) {
      const pts = draft.kind === 'zone' || draft.kind === 'line' ? draft.pts : simplify(draft.pts, 0.5);
      const a = pts[0];
      const b = pts[pts.length - 1];
      if (Math.hypot(b.x - a.x, b.y - a.y) > 2) props.onDraw?.({ ...draft, pts });
      setDraft(null);
    }
  };

  const order = [...tokens].sort((a, b) => (a.kind === 'ball' ? 1 : 0) - (b.kind === 'ball' ? 1 : 0));

  return (
    <svg
      ref={svg}
      viewBox={viewBoxFor(half)}
      style={{ '--ar': vw / vh } as React.CSSProperties}
      className={'pitch ' + (props.className ?? '') + (editable ? ` tool-${tool}` : '')}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="img"
      aria-label="Taktik tahtası"
    >
      <clipPath id={clipId}>
        <rect x={vx} y={vy} width={vw} height={vh} rx={1.5} />
      </clipPath>
      {/* geniş kutularda (ör. yarı saha) görünür alanın dışı çizilmesin */}
      <g clipPath={`url(#${clipId})`}>
      <PitchSurface half={half} />
      {props.ghostDrawings?.map((d) => <DrawingShape key={'g' + d.id} d={d} faded />)}
      {drawings.map((d) => (
        <DrawingShape key={d.id} d={d} onClick={editable && tool === 'erase' ? () => props.onErase?.(d.id) : undefined} />
      ))}
      {draft && <DrawingShape d={draft} />}
      {order.map((t) =>
        pos[t.id] ? (
          <g key={t.id} onPointerDown={(e) => startToken(e, t.id)} style={{ cursor: editable && tool === 'move' ? 'grab' : undefined }}>
            <TokenShape t={t} p={pos[t.id]} sub={props.subFor?.(t)} role={props.roleFor?.(t)} selected={props.selected === t.id} colors={colors} scale={props.tokenScale} />
          </g>
        ) : null,
      )}
      {props.overlay}
      </g>
    </svg>
  );
}

/** Küçük, etkileşimsiz önizleme */
export function MiniPitch({ tokens, pos, drawings, half, colors, tokenScale }: { tokens: Token[]; pos: Record<string, Pt>; drawings: Drawing[]; half?: boolean; colors: { home: string; away: string }; tokenScale?: number }) {
  return <Pitch tokens={tokens} pos={pos} drawings={drawings} half={half} colors={colors} className="mini" tokenScale={tokenScale} />;
}

/** SVG içinde ekran koordinatını saha metresine çevirir; saha dışındaysa null */
export function clientToPitch(svg: SVGSVGElement | null, clientX: number, clientY: number, margin = 3): Pt | null {
  const m = svg?.getScreenCTM();
  if (!svg || !m) return null;
  const pt = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  if (pt.x < -margin || pt.y < -margin || pt.x > PITCH.w + margin || pt.y > PITCH.h + margin) return null;
  return { x: +pt.x.toFixed(2), y: +pt.y.toFixed(2) };
}
