import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'test-secret';
const patches = [];
const posts = [];
let activeRevision = false;
let queuedRevisions = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (init.method === 'POST') {
    const body = JSON.parse(init.body);
    posts.push({ path: url.pathname, body });
    return Response.json([{
      ...body,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }], { status: 201 });
  }
  if (init.method === 'PATCH') {
    const body = JSON.parse(init.body);
    patches.push({ path: url.pathname, body });
    if (url.pathname === '/rest/v1/jobs' && url.searchParams.get('status') === 'eq.queued') {
      return Response.json([{ id: 'queued-revision', project_id: 'project-id', request: { prompt: 'Queued revision', comments: [] } }]);
    }
    return new Response(null, { status: 204 });
  }
  if (url.pathname === '/rest/v1/projects') {
    return Response.json([{ id: 'project-id', name: 'demo' }]);
  }
  if (url.pathname === '/rest/v1/profiles') {
    return Response.json([{ id: 'user-a', first_name: 'Jane', last_name: 'Doe', department: 'Design' }, { id: 'user-b', first_name: 'John', last_name: 'Smith', department: 'Engineering' }]);
  }
  if (url.pathname === '/rest/v1/jobs') {
    if (url.searchParams.get('status')?.includes('processing')) return Response.json(activeRevision ? [{ id: 'active-revision' }] : []);
    if (url.searchParams.get('status') === 'eq.queued') return Response.json(queuedRevisions);
    return Response.json([{ id: 'job-id', progress: { setup: { status: 'completed' } } }]);
  }
  return new Response('not found', { status: 404 });
};

const { claimQueuedRevision, createRevisionJob, updateJobStatus, updatePreview } = await import('../dist/services/supabase.js');

test('stores stage progress on jobs and preview state on projects', async () => {
  const start = patches.length;
  await updateJobStatus('demo', 'html', { status: 'processing', cost: 0.2 });
  await updatePreview('demo', { status: 'completed', url: 'https://demo.test' });

  assert.equal(patches[start].path, '/rest/v1/jobs');
  assert.equal(patches[start].body.stage, 'html');
  assert.equal(patches[start].body.status, 'processing');
  assert.deepEqual(patches[start].body.progress.setup, { status: 'completed' });
  assert.equal(patches[start].body.progress.html.cost, 0.2);
  assert.equal('usage' in patches[start].body, false);
  assert.equal(patches[start + 1].path, '/rest/v1/projects');
  assert.equal(patches[start + 1].body.preview_status, 'ready');
  assert.equal(patches[start + 1].body.preview_base_url, 'https://demo.test');
});

test('queues concurrent revisions and conditionally claims the oldest queued revision', async () => {
  activeRevision = false;
  const first = await createRevisionJob('demo', 'revision-1', { prompt: 'First', comments: [] }, 'user-a');
  activeRevision = true;
  const second = await createRevisionJob('demo', 'revision-2', { prompt: 'Second', comments: [] }, 'user-b');
  assert.deepEqual(first, {
    projectId: 'project-id',
    status: 'processing',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: { id: 'user-a', name: 'Jane Doe', department: 'Design' },
  });
  assert.deepEqual(second, {
    projectId: 'project-id',
    status: 'queued',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: { id: 'user-b', name: 'John Smith', department: 'Engineering' },
  });
  assert.equal(posts.at(-2).body.status, 'processing');
  assert.deepEqual(posts.at(-2).body.progress.revision.created_by, { id: 'user-a', name: 'Jane Doe', department: 'Design' });
  assert.equal(posts.at(-1).body.status, 'queued');
  assert.deepEqual(posts.at(-1).body.progress.revision.created_by, { id: 'user-b', name: 'John Smith', department: 'Engineering' });

  activeRevision = false;
  queuedRevisions = [{ id: 'queued-revision', project_id: 'project-id', request: { prompt: 'Queued revision', comments: [] } }];
  const claimed = await claimQueuedRevision('project-id');
  assert.equal(claimed.id, 'queued-revision');
  assert.equal(patches.at(-1).body.status, 'processing');
  queuedRevisions = [];
});
