import { useMemo } from 'react';
import { splitAtAntimeridian, type TrailPoint } from './trail';
import {
  GRATICULE,
  LANDMASSES,
  MAP_HEIGHT,
  MAP_WIDTH,
  project,
  toPathData,
} from './worldGeometry';
import type { IssPosition } from '../../../shared/types';

// Static geometry never changes; build the path data once at module load.
const LAND_PATHS = LANDMASSES.map(toPathData);

export function WorldMap({
  position,
  trail,
}: {
  position: IssPosition;
  trail: readonly TrailPoint[];
}) {
  const [issX, issY] = project([position.longitude, position.latitude]);

  const trailPaths = useMemo(
    () =>
      splitAtAntimeridian(trail).map((segment) =>
        segment
          .map((p, i) => {
            const [x, y] = project([p.longitude, p.latitude]);
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(''),
      ),
    [trail],
  );

  return (
    <svg
      className="iss-map"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="img"
      aria-label={`World map. The ISS is at latitude ${position.latitude.toFixed(1)}, longitude ${position.longitude.toFixed(1)}.`}
    >
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="var(--bg-2)" rx="8" />
      {GRATICULE.meridians.map((lon) => {
        const [x] = project([lon, 0]);
        return <line key={`m${lon}`} className="graticule" x1={x} x2={x} y1={0} y2={MAP_HEIGHT} />;
      })}
      {GRATICULE.parallels.map((lat) => {
        const [, y] = project([0, lat]);
        return <line key={`p${lat}`} className="graticule" x1={0} x2={MAP_WIDTH} y1={y} y2={y} />;
      })}
      {LAND_PATHS.map((d, i) => (
        <path key={i} className="land" d={d} />
      ))}
      {trailPaths.map((d, i) => (
        <path key={i} className="trail" d={d} />
      ))}
      <circle className="iss-halo" cx={issX} cy={issY} r={10} />
      <circle className="iss-marker" cx={issX} cy={issY} r={4.5} />
    </svg>
  );
}
