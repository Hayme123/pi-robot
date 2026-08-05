import assert from 'node:assert/strict';
import test from 'node:test';
import { extractCloudflareUrl } from '../dist/routes/project.js';

test('extracts a quick tunnel URL from cloudflared output', () => {
  assert.equal(
    extractCloudflareUrl('INF Your quick Tunnel has been created! Visit it at https://quiet-river.trycloudflare.com'),
    'https://quiet-river.trycloudflare.com',
  );
});
