import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror the @/* alias from jsconfig.json so test files can use the
    // same import paths as production code. We also stub `server-only`
    // (which throws outside React Server Components) so Vitest can
    // load server-only modules under plain Node.
    alias: [
      { find: 'server-only', replacement: path.resolve(__dirname, 'tests/server-only-stub.js') },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, '$1') },
    ],
  },
  test: {
    // Co-located *.test.js files under each module. Keeps tests next to
    // the code they exercise so refactors notice them.
    include: ['**/*.test.js', 'tests/**/*.test.js'],
    exclude: ['node_modules', '.next', 'out', 'scripts'],
    environment: 'node',
    // Most tests don't need globals; opt-in via explicit imports keeps
    // the surface clean and works with checkJs out of the box.
    globals: false,
    // Reset module state between tests so request-id counters etc don't
    // bleed across cases.
    isolate: true,
  },
});
