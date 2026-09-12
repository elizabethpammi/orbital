import { Link, RouterProvider, useRouter } from './lib/router';
import { TonightView } from './features/tonight/TonightView';
import { NeoView } from './features/neo/NeoView';
import { IssView } from './features/iss/IssView';

const ROUTES = [
  { path: '/', label: 'Tonight', View: TonightView },
  { path: '/near-earth', label: 'Near Earth', View: NeoView },
  { path: '/iss', label: 'ISS', View: IssView },
] as const;

function Shell() {
  const { path } = useRouter();
  const route = ROUTES.find((r) => r.path === path) ?? ROUTES[0];
  const { View } = route;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <Link to="/" className="brand">
          <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <circle cx="16" cy="16" r="7" fill="currentColor" opacity="0.9" />
            <ellipse
              cx="16"
              cy="16"
              rx="14"
              ry="5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              transform="rotate(-20 16 16)"
            />
          </svg>
          Orbital
        </Link>
        <nav className="app-nav" aria-label="Primary">
          {ROUTES.map(({ path: to, label }) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main" className="app-main">
        <View />
      </main>
      <footer className="app-footer">
        Data: NASA APOD &amp; NeoWs · wheretheiss.at · Not affiliated with NASA.
      </footer>
    </>
  );
}

export function App() {
  return (
    <RouterProvider>
      <Shell />
    </RouterProvider>
  );
}
