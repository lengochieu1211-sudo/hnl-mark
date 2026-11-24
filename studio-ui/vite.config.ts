import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Compile-time metadata: immutable inside each offline APK and Web build.
  // Never use device clock at runtime to represent a build timestamp.
  const packageInfo = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
  const sourceSha = process.env.GITHUB_SHA || (() => {
    try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).trim(); }
    catch { return 'unknown'; }
  })();
  const buildTimestamp = process.env.HNL_BUILD_UTC || new Date().toISOString();
  return {
    define: {
      __HNL_BUILD_INFO__: JSON.stringify({
        version: packageInfo.version,
        createdAtUtc: buildTimestamp,
        sourceSha,
      }),
    },
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
