import type { ReactNode } from 'react';
import type { ApiRequestError } from '../lib/useApi';

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="panel state-block" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorBlock({
  error,
  onRetry,
}: {
  error: ApiRequestError;
  onRetry: () => void;
}) {
  return (
    <div className="panel state-block" role="alert">
      <p>
        <strong>Couldn&rsquo;t load this view.</strong>
      </p>
      <p>
        {error.message} <span aria-hidden="true">(</span>
        <code>{error.code}</code>
        <span aria-hidden="true">)</span>
      </p>
      <button type="button" className="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function EmptyBlock({ children }: { children: ReactNode }) {
  return (
    <div className="panel state-block">
      <p>{children}</p>
    </div>
  );
}
