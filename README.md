# Orbital

A space-data dashboard. Three views, three public data sources:

- **Tonight** — NASA's Astronomy Picture of the Day, rendered over a canvas starfield generated from a seeded PRNG (the sky is stable for a given date and changes tomorrow).
- **Near Earth** — every asteroid making a close approach in the next seven days, from NASA's NeoWs feed: a sortable, filterable table plus a hand-built SVG scatter plot of miss distance vs. estimated diameter on log scales.
- **ISS** — the International Space Station's live position, polled every five seconds and plotted on a hand-drawn equirectangular world map with a 30-sample ground-track trail.

No UI framework, no chart library, no map library. React 18 + TypeScript (strict) on Vite, with a small serverless API layer in `/api`.

## Screenshots

| Tonight | Near Earth | ISS |
| --- | --- | --- |
| ![Tonight view](docs/screenshots/tonight.png) | ![Near Earth view](docs/screenshots/near-earth.png) | ![ISS view](docs/screenshots/iss.png) |

## Running it

```sh
npm install
npm run dev        # Vite dev server; /api/* is served by the same handlers Vercel deploys
npm test           # vitest
npm run build      # typecheck + production build to dist/
npm run preview    # production-like server: dist/ + the real /api handlers
```

Works with no configuration using NASA's `DEMO_KEY` (rate-limited). Set `NASA_API_KEY` to use your own key. Deploys to Vercel with zero extra setup: the static build goes to `dist/`, each file in `api/` becomes a serverless function, and `vercel.json` adds the SPA rewrite.

## Architecture notes

**Why a BFF proxy.** The browser never talks to NASA directly. Each `/api/*` handler proxies one upstream, which buys three things: the API key stays server-side; responses are normalized and validated with hand-written type guards before the client sees them, so the UI types are guaranteed at runtime, not just asserted; and cache headers can differ per endpoint (an hour of shared cache for APOD, 30 minutes for the asteroid feed, `no-store` for the ISS). Every response — success or failure — is a typed envelope (`{ ok: true, data } | { ok: false, error: { code, message } }`), so the client always parses JSON and can render a specific error, never a stack trace or an HTML error page.

**Normalization is forgiving where the data is.** A malformed APOD payload fails the whole request (there is no partial picture-of-the-day), but the NeoWs normalizer drops individually malformed asteroids and keeps the rest — feed quality varies day to day and one bad row shouldn't blank the view.

**Stale-response guard.** The fetch hook pairs an `AbortController` with a monotonically increasing request id. Abort cancels what it can, but it can't stop a response that's already mid-parse when a newer request starts; the id check guarantees the newest request is the only one allowed to write state. This matters most on the ISS view, where a 5-second poll over a slow connection can otherwise deliver positions out of order. Background polls also keep the last good frame on screen instead of flashing a spinner.

**Hand-rolled SVG over a chart/map library.** Both visualizations are small, fixed, and specific: a log-log scatter with decade ticks, and an equirectangular map where projection is two lines of arithmetic. Writing them directly keeps the bundle lean and makes the interesting details explicit — the scatter picks log scales because the data spans several orders of magnitude, and the ground-track trail splits at the antimeridian so the ISS crossing ±180° doesn't draw a line across the whole map. The world outline is hand-simplified from public-domain coastline data to a few dozen vertices per landmass.

**Determinism where it helps.** The starfield uses mulberry32 seeded by the UTC date, so it doesn't reshuffle on re-render and its output is exactly assertable in tests.

**Accessibility.** Semantic landmarks and a skip link; the table announces sort state with `aria-sort`; charts are labelled `role="img"` with a text description; the live position uses real `<time>` elements; focus is always visible; `prefers-reduced-motion` disables the twinkle, spinner, and halo animations.

## Layout

```
api/            serverless handlers (plain Node req/res — run on Vercel, in Vite dev, and in scripts/serve.mjs unchanged)
shared/         wire types, type guards, normalizers — imported by both api/ and src/
src/lib/        router, typed fetch hook, debounce, PRNG
src/features/   one folder per view; pure logic (sort/filter, trail) split from components for testing
scripts/        production-like local preview server
```

## Data sources

[NASA APOD](https://api.nasa.gov) · [NASA NeoWs](https://api.nasa.gov) · [wheretheiss.at](https://wheretheiss.at/w/developer). Not affiliated with NASA.
