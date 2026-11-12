import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

test('production PWA precaches hashed application assets and supports controlled updates', async () => {
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
  assert.match(worker, /tidebound-v1\.6\.0/);
  assert.match(worker, /assets\/audio\/kulakovka-action-game-620581\.mp3/);
  assert.match(worker, /assets\/characters\/wayfarer-female\.png/);
  const appBundle = await readFile(new URL('../dist/assets/' + worker.match(/assets\/(index-[^"']+\.js)/)[1], import.meta.url), 'utf8');
  assert.match(appBundle, /sk_01_01_01/);
  assert.match(appBundle, /wa_01_001/);
  assert.match(worker, /assets\/index-[^"']+\.js/);
  assert.match(worker, /SKIP_WAITING/);
  assert.match(worker, /index\.html/);
  const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'landscape');
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
  await stat(new URL('../dist/assets/tidebound-icon-512.png', import.meta.url));
});

test('mobile build disables page zoom and includes short-landscape menu sizing', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /maximum-scale=1/);
  assert.match(html, /user-scalable=no/);
  assert.match(html, /viewport-fit=cover/);

  const assetNames = [...html.matchAll(/href="([^"]+\.css)"/g)].map((match) => match[1]);
  assert.equal(assetNames.length, 1);
  const css = await readFile(new URL(assetNames[0], new URL('../dist/', import.meta.url)), 'utf8');
  assert.match(css, /pointer:coarse/);
  assert.match(css, /height(?:<=|:)430px/);
  assert.match(css, /100dvh/);
});
