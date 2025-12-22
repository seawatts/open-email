import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

function listResultsPlugin(): Plugin {
  return {
    configureServer(server) {
      server.middlewares.use('/api/results', (_req, res) => {
        const resultsDir = join(
          fileURLToPath(new URL('.', import.meta.url)),
          'results',
        );
        try {
          const files = readdirSync(resultsDir)
            .filter((f) => f.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(files));
        } catch (_err) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: 'Failed to read results directory',
            }),
          );
        }
      });
    },
    name: 'list-results',
  };
}

export default defineConfig({
  plugins: [tsconfigPaths(), react(), listResultsPlugin()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: {
    host: true,
    port: 3010,
  },
});
