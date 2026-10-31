import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

/**
 * @fontsource 글꼴 CSS 는 woff2 와 옛 woff 를 함께 적어 두어, 빌드하면 한글 글꼴 조각이 두 벌씩 들어간다.
 * 게임은 Chromium(Electron)에서만 돌아 woff2 로 충분하므로 woff 파일과 CSS 의 woff 대체 경로를 뺀다 (설치 파일 약 11MB 절약).
 */
function woff2Only(): Plugin {
  return {
    name: 'woff2-only',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [name, file] of Object.entries(bundle)) {
        if (name.endsWith('.woff')) delete bundle[name];
        else if (name.endsWith('.css') && file.type === 'asset' && typeof file.source === 'string') {
          file.source = file.source.replace(/,\s*url\([^)]*?\.woff\)\s*format\(["']?woff["']?\)/g, '');
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), woff2Only()],
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5173, strictPort: true },
  test: { environment: 'node' },
} as never);
