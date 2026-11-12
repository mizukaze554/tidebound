import { defineConfig } from 'vite';

function livingDuelPWA() {
  return {
    name: 'tidebound-pwa',
    apply: 'build',
    generateBundle(_, bundle) {
      const generated = Object.values(bundle).map((item) => `./${item.fileName}`);
      const precache = [...new Set([
        './', './index.html', './manifest.webmanifest',
        './assets/tidebound-icon-192.png', './assets/tidebound-icon-512.png',
        './assets/characters/wayfarer-male.png', './assets/characters/wayfarer-female.png',
        ...['menu', 'exploration', 'combat', 'victory', 'defeat', 'draw'].map((name) => `./assets/audio/${name}-music.mp3`),
        ...generated,
      ])];
      const source = `const VERSION = 'tidebound-v1.5.1';
const PRECACHE = ${JSON.stringify(precache)};
self.addEventListener('install', event => event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(PRECACHE))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tidebound-') && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { const copy = response.clone(); caches.open(VERSION).then(cache => cache.put('./index.html', copy)); return response; }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const type = response.headers.get('content-type') || '';
    if (response.ok && !type.includes('text/html')) caches.open(VERSION).then(cache => cache.put(event.request, response.clone()));
    return response;
  })));
});`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  // Relative assets let the production build run from any static folder as well
  // as through the Vite development server.
  base: './',
  plugins: [livingDuelPWA()],
});
