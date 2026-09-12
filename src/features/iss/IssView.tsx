import { useEffect, useRef, useState } from 'react';
import { isIssPosition } from '../../../shared/guards';
import { ErrorBlock, LoadingBlock } from '../../components/States';
import { useApi } from '../../lib/useApi';
import { appendToTrail, TRAIL_LENGTH, type TrailPoint } from './trail';
import { WorldMap } from './WorldMap';

const POLL_MS = 5_000;

export function IssView() {
  const { status, data, error, reload } = useApi('/api/iss', isIssPosition, { pollMs: POLL_MS });
  const [trail, setTrail] = useState<readonly TrailPoint[]>([]);
  const lastTimestamp = useRef<number | null>(null);

  useEffect(() => {
    if (!data || data.timestamp === lastTimestamp.current) return;
    lastTimestamp.current = data.timestamp;
    setTrail((current) =>
      appendToTrail(current, {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
      }),
    );
  }, [data]);

  return (
    <div>
      <header className="view-header">
        <h1 className="view-title">ISS</h1>
        <p className="view-subtitle">
          The International Space Station&rsquo;s position, refreshed every five seconds, with a
          ground-track trail of the last {TRAIL_LENGTH} samples.
        </p>
      </header>

      {status === 'loading' && trail.length === 0 && (
        <LoadingBlock label="Acquiring the station…" />
      )}
      {status === 'error' && <ErrorBlock error={error} onRetry={reload} />}
      {status === 'success' && (
        <div className="iss-layout">
          <div className="panel iss-map-panel">
            <WorldMap position={data} trail={trail} />
          </div>
          <dl className="iss-stats">
            <div className="panel stat">
              <dt>
                <span className="live-dot" aria-hidden="true" />
                Updated
              </dt>
              <dd>
                <time dateTime={new Date(data.timestamp * 1000).toISOString()}>
                  {new Date(data.timestamp * 1000).toLocaleTimeString()}
                </time>
              </dd>
            </div>
            <div className="panel stat">
              <dt>Latitude</dt>
              <dd>{data.latitude.toFixed(2)}°</dd>
            </div>
            <div className="panel stat">
              <dt>Longitude</dt>
              <dd>{data.longitude.toFixed(2)}°</dd>
            </div>
            <div className="panel stat">
              <dt>Altitude</dt>
              <dd>{data.altitudeKm.toFixed(0)} km</dd>
            </div>
            <div className="panel stat">
              <dt>Speed</dt>
              <dd>{(data.velocityKmh / 3600).toFixed(2)} km/s</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
