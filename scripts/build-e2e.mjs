import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', 'dist-e2e'], {
  stdio: 'inherit', env: { ...process.env, PENNEY_WEB_BASE_URL: '/penney', EXPO_NO_TELEMETRY: '1' },
});
process.exit(result.status ?? 1);
