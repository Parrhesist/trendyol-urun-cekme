import { useRef, useState, type ReactNode } from 'react';
import { clamp, PITCH, STATUS_META } from '../football';
import { classifyRoles, fitFor, ROLE_NAMES, surname, type Slot } from '../lineup';
import type { Player, Pt } from '../types';
import { clientToPitch, PitchSurface, RoleBadge } from './Pitch';

const SWAP_RADIUS = 3.6; // m: bir oyuncu diğerinin üstüne bu kadar yaklaşırsa yer değiştirir

interface Props {
  slots: Slot[];
  player: (id?: string) => Player | undefined;
  colors: { home: string; away: string };
  editable?: boolean;
  selected?: string | null;
  captain?: string;
  opp?: Pt[];
  underlay?: ReactNode;
  dropHover?: string | null;
  placing?: boolean; // kadrodan oyuncu yerleştiriliyor: boş slotlar vurgulanır
  onSlotTap?: (key: string) => void;
  onPitchTap?: (p: Pt) => void;
  onMove?: (key: string, p: Pt) => void;
  onSwap?: (a: string, b: string) => void;
  svgRef?: (el: SVGSVGElement | null) => void;
  className?: string;
}

/** Maç kadrosu tahtası: oyuncular serbestçe sürüklenir, mevki etiketi konuma göre anında güncellenir. */
export function LineupBoard(props: Props) {
  const { slots, player, colors, editable } = props;
  const svg = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ key: string; dx: number; dy: number; start: Pt; moved: boolean } | null>(null);
  const bgDown = useRef<Pt | null>(null);
  const [live, setLive] = useState<{ key: string; p: Pt } | null>(null);

  const shown = slots.map((s) => (live && live.key === s.key ? { ...s, p: live.p } : s));
  const roles = classifyRoles(shown.map((s) => ({ id: s.key, p: s.p })));
  const swapTarget = live ? shown.find((s) => s.key !== live.key && Math.hypot(s.p.x - live.p.x, s.p.y - live.p.y) < SWAP_RADIUS)?.key : undefined;

  const toPt = (e: { clientX: number; clientY: number }) => clientToPitch(svg.current, e.clientX, e.clientY, 50) ?? { x: 0, y: 0 };

  const onSlotDown = (e: React.PointerEvent, s: Slot) => {
    e.stopPropagation();
    if (!editable) {
      props.onSlotTap?.(s.key);
      return;
    }
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = toPt(e);
    drag.current = { key: s.key, dx: s.p.x - p.x, dy: s.p.y - p.y, start: p, moved: false };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toPt(e);
    if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) < 0.9) return;
    d.moved = true;
    setLive({ key: d.key, p: { x: clamp(p.x + d.dx, 1, PITCH.w - 1), y: clamp(p.y + d.dy, 1, PITCH.h - 1) } });
  };

  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d) {
      if (!d.moved) props.onSlotTap?.(d.key);
      else if (live) {
        if (swapTarget) props.onSwap?.(d.key, swapTarget);
        else props.onMove?.(d.key, { x: +live.p.x.toFixed(1), y: +live.p.y.toFixed(1) });
      }
      setLive(null);
      return;
    }
    if (bgDown.current) {
      const p = toPt(e);
      if (Math.hypot(p.x - bgDown.current.x, p.y - bgDown.current.y) < 1.5) props.onPitchTap?.(p);
      bgDown.current = null;
    }
  };

  return (
    <svg
      ref={(el) => {
        svg.current = el;
        props.svgRef?.(el);
      }}
      viewBox={`-3 -3 ${PITCH.w + 6} ${PITCH.h + 6}`}
      className={'pitch lineup-board ' + (props.className ?? '') + (editable ? ' editable' : '') + (props.placing ? ' placing' : '')}
      onPointerDown={(e) => (bgDown.current = toPt(e))}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => {
        drag.current = null;
        bgDown.current = null;
        setLive(null);
      }}
      role="img"
      aria-label="Maç kadrosu ve dizilişi"
    >
      <PitchSurface />
      <text x={PITCH.w - 1.5} y={PITCH.h + 2.2} textAnchor="end" className="pitch-dir">
        hücum yönü →
      </text>
      {props.underlay}
      {props.opp?.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.5} className="opp-ghost" style={{ fill: colors.away }} />
      ))}
      {shown.map((s) => {
        const pl = player(s.playerId);
        const role = roles[s.key];
        const fit = pl ? fitFor(pl, role) : 2;
        const dragging = live?.key === s.key;
        return (
          <g
            key={s.key}
            data-slot={s.key}
            transform={`translate(${s.p.x},${s.p.y})`}
            className={'xi-slot' + (dragging ? ' dragging' : '') + (pl ? '' : ' empty')}
            onPointerDown={(e) => onSlotDown(e, s)}
          >
            <title>{pl ? `${pl.number} ${pl.name} — ${ROLE_NAMES[role] ?? role}${fit === 0 ? ` (doğal mevkisi: ${pl.role ?? '—'})` : ''}` : `Boş: ${ROLE_NAMES[role] ?? role}`}</title>
            <circle r={4} fill="transparent" />
            {(props.selected === s.key || swapTarget === s.key || props.dropHover === s.key) && <circle r={3.2} className={'xi-ring' + (swapTarget === s.key || props.dropHover === s.key ? ' drop' : '')} />}
            {pl ? (
              <>
                <circle r={2.5} cy={0.35} fill="rgba(0,0,0,.28)" />
                <circle r={2.15} fill={colors.home} stroke="#fff" strokeWidth={0.32} />
                <text y={0.75} textAnchor="middle" className="tok-num" style={{ fontSize: 2.1 }}>
                  {pl.number}
                </text>
                <text y={4.75} textAnchor="middle" className="tok-sub xi-name">
                  {surname(pl.name)}
                </text>
                {props.captain === pl.id && (
                  <g transform="translate(1.85,1.65)" className="cap-band">
                    <circle r={0.95} />
                    <text y={0.42} textAnchor="middle">
                      K
                    </text>
                  </g>
                )}
                {pl.status !== 'hazir' && <circle cx={-1.75} cy={-1.6} r={0.72} className={'warn-dot tone-' + STATUS_META[pl.status].tone} />}
              </>
            ) : (
              <>
                <circle r={2.15} className="xi-empty" />
                <text y={0.8} textAnchor="middle" className="xi-plus">
                  +
                </text>
                <text y={4.75} textAnchor="middle" className="tok-sub xi-name">
                  Boş
                </text>
              </>
            )}
            <RoleBadge role={role} y={-3.75} tone={fit === 0 ? 'warn' : undefined} />
          </g>
        );
      })}
    </svg>
  );
}
