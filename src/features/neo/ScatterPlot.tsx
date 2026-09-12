/**
 * Hand-built SVG scatter plot: miss distance (x) vs estimated diameter (y),
 * both on log10 scales — the data spans several orders of magnitude in each
 * dimension, so linear axes would pile everything into one corner.
 */

import { useMemo } from 'react';
import { representativeDiameterM } from './derive';
import type { NeoApproach } from '../../../shared/types';

const WIDTH = 320;
const HEIGHT = 260;
const MARGIN = { top: 12, right: 12, bottom: 40, left: 44 };

interface LogScale {
  toPx: (value: number) => number;
  /** Decade tick values within the domain, e.g. 1e5, 1e6, 1e7. */
  ticks: number[];
}

function makeLogScale(values: number[], rangePx: [number, number]): LogScale {
  const positive = values.filter((v) => v > 0);
  const lo = Math.floor(Math.log10(Math.min(...positive)));
  const hi = Math.ceil(Math.log10(Math.max(...positive)));
  const span = Math.max(hi - lo, 1);
  const [r0, r1] = rangePx;
  const toPx = (value: number) => r0 + ((Math.log10(value) - lo) / span) * (r1 - r0);
  const ticks: number[] = [];
  for (let exp = lo; exp <= hi; exp++) ticks.push(10 ** exp);
  return { toPx, ticks };
}

function tickLabel(value: number): string {
  const exp = Math.round(Math.log10(value));
  if (exp >= 4) return `10${superscript(exp)}`;
  return String(value);
}

function superscript(exp: number): string {
  const digits = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return String(exp)
    .split('')
    .map((c) => digits[Number(c)] ?? c)
    .join('');
}

export function ScatterPlot({ approaches }: { approaches: readonly NeoApproach[] }) {
  const scene = useMemo(() => {
    if (approaches.length === 0) return null;
    const xScale = makeLogScale(
      approaches.map((a) => a.missKm),
      [MARGIN.left, WIDTH - MARGIN.right],
    );
    const yScale = makeLogScale(
      approaches.map(representativeDiameterM),
      [HEIGHT - MARGIN.bottom, MARGIN.top],
    );
    const points = approaches.map((a) => ({
      id: a.id,
      cx: xScale.toPx(a.missKm),
      cy: yScale.toPx(representativeDiameterM(a)),
      hazardous: a.hazardous,
      name: a.name,
    }));
    return { xScale, yScale, points };
  }, [approaches]);

  if (!scene) {
    return <p className="hint">No objects to plot for the current filters.</p>;
  }

  return (
    <>
      <svg
        className="scatter-plot"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Scatter plot of ${scene.points.length} close approaches: miss distance versus estimated diameter, log scales. Amber points are potentially hazardous.`}
      >
        {scene.xScale.ticks.map((t) => (
          <g key={`x${t}`}>
            <line
              className="grid-line"
              x1={scene.xScale.toPx(t)}
              x2={scene.xScale.toPx(t)}
              y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom}
            />
            <text
              className="tick-label"
              x={scene.xScale.toPx(t)}
              y={HEIGHT - MARGIN.bottom + 14}
              textAnchor="middle"
            >
              {tickLabel(t)}
            </text>
          </g>
        ))}
        {scene.yScale.ticks.map((t) => (
          <g key={`y${t}`}>
            <line
              className="grid-line"
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={scene.yScale.toPx(t)}
              y2={scene.yScale.toPx(t)}
            />
            <text
              className="tick-label"
              x={MARGIN.left - 6}
              y={scene.yScale.toPx(t) + 3}
              textAnchor="end"
            >
              {tickLabel(t)}
            </text>
          </g>
        ))}
        <line
          className="axis-line"
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={HEIGHT - MARGIN.bottom}
          y2={HEIGHT - MARGIN.bottom}
        />
        <line
          className="axis-line"
          x1={MARGIN.left}
          x2={MARGIN.left}
          y1={MARGIN.top}
          y2={HEIGHT - MARGIN.bottom}
        />
        <text className="axis-label" x={(MARGIN.left + WIDTH - MARGIN.right) / 2} y={HEIGHT - 8} textAnchor="middle">
          miss distance (km)
        </text>
        <text
          className="axis-label"
          transform={`rotate(-90 12 ${(MARGIN.top + HEIGHT - MARGIN.bottom) / 2})`}
          x={12}
          y={(MARGIN.top + HEIGHT - MARGIN.bottom) / 2}
          textAnchor="middle"
        >
          est. diameter (m)
        </text>
        {scene.points.map((p) => (
          <circle
            key={p.id}
            className={p.hazardous ? 'dot dot--hazard' : 'dot'}
            cx={p.cx}
            cy={p.cy}
            r={p.hazardous ? 4 : 3}
          >
            <title>{p.name}</title>
          </circle>
        ))}
      </svg>
      <div className="legend">
        <span>
          <span className="swatch" style={{ background: 'var(--accent)' }} /> non-hazardous
        </span>
        <span>
          <span className="swatch" style={{ background: 'var(--amber)' }} /> potentially hazardous
        </span>
      </div>
    </>
  );
}
