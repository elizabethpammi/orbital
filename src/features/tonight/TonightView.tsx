import { isApod } from '../../../shared/guards';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/States';
import { useApi } from '../../lib/useApi';
import { Starfield } from './Starfield';
import type { Apod } from '../../../shared/types';

function ApodMedia({ apod }: { apod: Apod }) {
  if (apod.mediaType === 'image') {
    return (
      <a href={apod.hdUrl ?? apod.url} target="_blank" rel="noreferrer">
        <img src={apod.url} alt={apod.title} loading="lazy" />
      </a>
    );
  }
  if (apod.mediaType === 'video') {
    return <iframe src={apod.url} title={apod.title} allowFullScreen />;
  }
  return (
    <p className="apod-body">
      Today&rsquo;s picture is a media type this page can&rsquo;t embed.{' '}
      <a href={apod.url} target="_blank" rel="noreferrer">
        View it on NASA&rsquo;s site.
      </a>
    </p>
  );
}

export function TonightView() {
  const { status, data, error, reload } = useApi('/api/apod', isApod);

  return (
    <div className="tonight">
      <Starfield />
      <header className="view-header">
        <h1 className="view-title">Tonight</h1>
        <p className="view-subtitle">
          NASA&rsquo;s Astronomy Picture of the Day, over a starfield seeded by today&rsquo;s date.
        </p>
      </header>

      {status === 'loading' && <LoadingBlock label="Fetching the picture of the day…" />}
      {status === 'error' && <ErrorBlock error={error} onRetry={reload} />}
      {status === 'success' && data.title === '' && (
        <EmptyBlock>NASA hasn&rsquo;t published today&rsquo;s picture yet. Check back soon.</EmptyBlock>
      )}
      {status === 'success' && data.title !== '' && (
        <article className="panel apod-card">
          <div className="apod-media">
            <ApodMedia apod={data} />
          </div>
          <div className="apod-body">
            <div className="apod-meta">
              <span>{data.date}</span>
              {data.copyright && <span>© {data.copyright}</span>}
              <span>{data.mediaType}</span>
            </div>
            <h2>{data.title}</h2>
            <p className="apod-explanation">{data.explanation}</p>
          </div>
        </article>
      )}
    </div>
  );
}
