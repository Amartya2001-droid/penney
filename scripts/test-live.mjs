import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, E2E_BASE_URL: process.env.E2E_BASE_URL || 'https://amartya2001-droid.github.io/penney/' },
});
process.exit(result.status ?? 1);
