import { fmtDate } from '../football';

/** Haftalık yük sütun grafiği (tek seri, büyüklük) */
export function LoadChart({ series }: { series: { start: string; load: number }[] }) {
  const W = 520;
  const H = 190;
  const m = { l: 44, r: 8, t: 12, b: 28 };
  const max = Math.max(1000, ...series.map((s) => s.load));
  const step = max > 3000 ? 1000 : 500;
  const top = Math.ceil(max / step) * step;
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / top);
  const bw = (W - m.l - m.r) / series.length;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Haftalık antrenman yükü">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="axis">
              {t.toLocaleString('tr-TR')}
            </text>
          </g>
        ))}
        {series.map((s, i) => {
          const x = m.l + i * bw + 3;
          const h = y(0) - y(s.load);
          const last = i === series.length - 1;
          return (
            <g key={s.start} className="bar-g">
              <title>{`${fmtDate(s.start)} haftası: ${s.load.toLocaleString('tr-TR')} AU`}</title>
              <rect x={m.l + i * bw} y={m.t} width={bw} height={H - m.t - m.b} fill="transparent" />
              {s.load > 0 && <path d={roundTop(x, y(s.load), bw - 6, h, 4)} className={last ? 'bar bar-now' : 'bar'} />}
              {last && s.load > 0 && (
                <text x={x + (bw - 6) / 2} y={y(s.load) - 5} textAnchor="middle" className="axis strong">
                  {s.load.toLocaleString('tr-TR')}
                </text>
              )}
              <text x={x + (bw - 6) / 2} y={H - 9} textAnchor="middle" className="axis">
                {fmtDate(s.start)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function roundTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** Biz – rakip karşılaştırma çubuğu */
export function CompareRow({ label, us, them, unit = '' }: { label: string; us: number; them: number; unit?: string }) {
  const total = us + them || 1;
  const fmt = (v: number) => (Number.isInteger(v) ? v : v.toFixed(2)) + unit;
  return (
    <div className="cmp-row">
      <span className="cmp-val">{fmt(us)}</span>
      <div className="cmp-mid">
        <span className="cmp-label">{label}</span>
        <div className="cmp-bars" title={`${label}: biz ${fmt(us)}, rakip ${fmt(them)}`}>
          <div className="cmp-us" style={{ width: `${(us / total) * 100}%` }} />
          <div className="cmp-them" style={{ width: `${(them / total) * 100}%` }} />
        </div>
      </div>
      <span className="cmp-val">{fmt(them)}</span>
    </div>
  );
}
