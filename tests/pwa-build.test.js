import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

test('production PWA precaches hashed application assets and supports controlled updates', async () => {
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
  assert.match(worker, /tidebound-v1\.3\.0/);
  assert.match(worker, /assets\/index-[^"']+\.js/);
  assert.match(worker, /SKIP_WAITING/);
  assert.match(worker, /index\.html/);
  const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'landscape');
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);
  await stat(new URL('../dist/assets/tidebound-icon-512.png', import.meta.url));
});
