import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

import apod from './api/apod';
import iss from './api/iss';
import neo from './api/neo';
import type { Handler } from './api/_lib';

const routes: Record<string, Handler> = {
  '/api/apod': apod,
  '/api/neo': neo,
  '/api/iss': iss,
};

/**
 * Mounts the same plain-Node handlers Vercel deploys as functions onto Vite's
 * dev server, so `npm run dev` exercises the real /api code path — no mocks,
 * no second server, no drift between dev and production.
 */
function devApi(): Plugin {
  return {
    name: 'orbital:dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0] ?? '';
        const handler = routes[path];
        if (!handler) return next();
        void Promise.resolve(handler(req, res)).catch(next);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts'],
    environment: 'node',
  },
});
