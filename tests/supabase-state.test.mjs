import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'test-secret';
const patches = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (init.method === 'PATCH') {
    patches.push({ path: url.pathname, body: JSON.parse(init.body) });
    return new Response(null, { status: 204 });
  }
  if (url.pathname === '/rest/v1/jobs') {
    return Response.json([{ id: 'job-id', progress: { setup: { status: 'completed' } } }]);
  }
  return new Response('not found', { status: 404 });
};

const { updateJobStatus, updatePreview } = await import('../dist/services/supabase.js');

test('stores stage progress on jobs and preview state on projects', async () => {
  await updateJobStatus('demo', 'html', { status: 'processing', cost: 0.2 });
  await updatePreview('demo', { status: 'completed', url: 'https://demo.test' });

  assert.equal(patches[0].path, '/rest/v1/jobs');
  assert.equal(patches[0].body.stage, 'html');
  assert.equal(patches[0].body.status, 'processing');
  assert.deepEqual(patches[0].body.progress.setup, { status: 'completed' });
  assert.equal(patches[0].body.progress.html.cost, 0.2);
  assert.equal('usage' in patches[0].body, false);
  assert.equal(patches[1].path, '/rest/v1/projects');
  assert.equal(patches[1].body.preview_status, 'ready');
  assert.equal(patches[1].body.preview_base_url, 'https://demo.test');
});
