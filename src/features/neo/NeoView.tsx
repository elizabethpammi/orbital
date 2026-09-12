import { useMemo, useState } from 'react';
import { isNeoFeed } from '../../../shared/guards';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/States';
import { useApi } from '../../lib/useApi';
import { useDebounce } from '../../lib/useDebounce';
import {
  DEFAULT_SORT,
  filterApproaches,
  formatApproachDate,
  formatDiameterRange,
  formatMissDistance,
  formatVelocity,
  nextSort,
  sortApproaches,
  type SortKey,
  type SortSpec,
} from './derive';
import { ScatterPlot } from './ScatterPlot';
import type { NeoApproach } from '../../../shared/types';

const COLUMNS: Array<{ key: SortKey; label: string; numeric: boolean }> = [
  { key: 'name', label: 'Object', numeric: false },
  { key: 'date', label: 'Closest (UTC)', numeric: false },
  { key: 'missKm', label: 'Miss distance', numeric: true },
  { key: 'diameter', label: 'Est. diameter', numeric: true },
  { key: 'velocityKps', label: 'Velocity', numeric: true },
];

function SortHeader({
  column,
  sort,
  onSort,
}: {
  column: (typeof COLUMNS)[number];
  sort: SortSpec;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === column.key;
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined;
  return (
    <th scope="col" className={column.numeric ? 'num' : undefined} aria-sort={ariaSort}>
      <button type="button" onClick={() => onSort(column.key)}>
        {column.label}
        <span aria-hidden="true">{active ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</span>
      </button>
    </th>
  );
}

function NeoTable({ rows }: { rows: readonly NeoApproach[] }) {
  return (
    <tbody>
      {/* An object can approach more than once in the window, so id alone is not a unique key. */}
      {rows.map((row) => (
        <tr key={`${row.id}-${row.epochMs}`}>
          <td>
            {row.name}{' '}
            {row.hazardous && <span className="hazard-badge">PHA</span>}
          </td>
          <td>{formatApproachDate(row.epochMs)}</td>
          <td className="num">{formatMissDistance(row.missKm)}</td>
          <td className="num">{formatDiameterRange(row)}</td>
          <td className="num">{formatVelocity(row.velocityKps)}</td>
        </tr>
      ))}
    </tbody>
  );
}

export function NeoView() {
  const { status, data, error, reload } = useApi('/api/neo', isNeoFeed);
  const [query, setQuery] = useState('');
  const [hazardousOnly, setHazardousOnly] = useState(false);
  const [sort, setSort] = useState<SortSpec>(DEFAULT_SORT);
  const debouncedQuery = useDebounce(query, 200);

  const rows = useMemo(() => {
    if (!data) return [];
    return sortApproaches(
      filterApproaches(data.approaches, { query: debouncedQuery, hazardousOnly }),
      sort,
    );
  }, [data, debouncedQuery, hazardousOnly, sort]);

  return (
    <div>
      <header className="view-header">
        <h1 className="view-title">Near Earth</h1>
        <p className="view-subtitle">
          Asteroids making their closest approach to Earth over the next seven days, from NASA&rsquo;s
          Near Earth Object Web Service. &ldquo;PHA&rdquo; marks objects NASA classifies as
          potentially hazardous.
        </p>
      </header>

      {status === 'loading' && <LoadingBlock label="Fetching the 7-day close-approach feed…" />}
      {status === 'error' && <ErrorBlock error={error} onRetry={reload} />}
      {status === 'success' && (
        <>
          <div className="neo-controls">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by designation, e.g. 2024…"
              aria-label="Filter asteroids by name"
            />
            <label className="checkbox">
              <input
                type="checkbox"
                checked={hazardousOnly}
                onChange={(e) => setHazardousOnly(e.target.checked)}
              />
              Hazardous only
            </label>
            <span className="result-count" role="status">
              {rows.length} of {data.approaches.length} objects
            </span>
          </div>

          {rows.length === 0 ? (
            <EmptyBlock>
              No objects match the current filters. Clear the search or include non-hazardous
              objects.
            </EmptyBlock>
          ) : (
            <div className="neo-layout">
              <div className="panel table-scroll">
                <table className="neo-table">
                  <caption>
                    Close approaches {data.startDate} → {data.endDate}
                  </caption>
                  <thead>
                    <tr>
                      {COLUMNS.map((column) => (
                        <SortHeader
                          key={column.key}
                          column={column}
                          sort={sort}
                          onSort={(key) => setSort((s) => nextSort(s, key))}
                        />
                      ))}
                    </tr>
                  </thead>
                  <NeoTable rows={rows} />
                </table>
              </div>
              <aside className="panel scatter-panel">
                <h2>Distance vs. size</h2>
                <p className="hint">Log scales. Lower-right is close and large — the corner worth watching.</p>
                <ScatterPlot approaches={rows} />
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
