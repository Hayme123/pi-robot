import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const projectsRoot = await mkdtemp(path.join(tmpdir(), 'pi-projects-'));
process.env.PROJECTS_ROOT = projectsRoot;
process.env.SUPABASE_URL = 'http://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'test-secret';
const setup = { status: 'completed', updated_at: '2026-01-01T00:00:00.000Z' };
const html = { status: 'processing', updated_at: '2026-01-02T00:00:00.000Z' };
const projectRows = [
  {
    id: 'alpha-id', name: 'alpha', preview_status: 'stopped', preview_base_url: null, preview_error: null, updated_at: '2026-01-02T00:00:00.000Z',
    jobs: [{ id: 'alpha-job', kind: 'create', progress: { html }, created_at: '2026-01-02T00:00:00.000Z', updated_at: '2026-01-02T00:00:00.000Z' }],
  },
  {
    id: 'demo-id', name: 'demo', preview_status: 'ready', preview_base_url: 'https://demo.test', preview_error: null, updated_at: '2026-01-01T00:02:00.000Z',
    jobs: [
      { id: 'demo-job', kind: 'create', progress: { setup }, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
      { id: 'revision-1', kind: 'revision', request: { prompt: null, comments: [{ comment: 'Rename it' }] }, status: 'completed', summary: null, error: null, progress: { revision: { status: 'completed', cost: 0.25 } }, created_at: '2026-01-01T00:01:00.000Z', updated_at: '2026-01-01T00:01:00.000Z' },
    ],
  },
];
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  if (url.pathname !== '/rest/v1/projects') return new Response('not found', { status: 404 });
  const name = url.searchParams.get('name')?.replace(/^eq\./, '');
  return Response.json(name ? projectRows.filter((project) => project.name === name) : projectRows);
};
const { buildApp } = await import('../dist/app.js');
const { requiresRevisionHtml } = await import('../dist/routes/project.js');
const { archiveExclusions, cleanupSyncedProjects } = await import('../dist/services/artifacts.js');

test.after(() => rm(projectsRoot, { recursive: true, force: true }));

test('requires HTML before Angular for page, modal, and tab revisions', () => {
  assert.equal(requiresRevisionHtml('new_page'), true);
  assert.equal(requiresRevisionHtml('modal'), true);
  assert.equal(requiresRevisionHtml('tab'), true);
  assert.equal(requiresRevisionHtml('auto'), false);
});

test('excludes generated files and credentials from R2 project archives', () => {
  const patterns = archiveExclusions();
  for (const pattern of ['node_modules/*', '.angular/*', 'dist/*', '.env', '.npmrc', '.pi-agent/*', 'auth.json', '*.log']) {
    assert.ok(patterns.includes(pattern), `missing exclusion: ${pattern}`);
  }
});

test('deletes only R2-synced project folders older than one day', async () => {
  const oldProject = path.join(projectsRoot, 'old-cache');
  const freshProject = path.join(projectsRoot, 'fresh-cache');
  const unsyncedProject = path.join(projectsRoot, 'unsynced-cache');
  await Promise.all([mkdir(oldProject), mkdir(freshProject), mkdir(unsyncedProject)]);
  await Promise.all([
    writeFile(path.join(oldProject, '.r2-synced'), 'synced'),
    writeFile(path.join(freshProject, '.r2-synced'), 'synced'),
  ]);
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
  await utimes(path.join(oldProject, '.r2-synced'), old, old);

  assert.deepEqual(await cleanupSyncedProjects(projectsRoot, new Set(), Date.now()), ['old-cache']);
  await assert.rejects(() => access(oldProject));
  await Promise.all([access(freshProject), access(unsyncedProject)]);
});

test('maps Supabase project and job rows to the compatibility response', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/project/demo' });
  await app.close();

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().project_id, 'demo-id');
  assert.deepEqual(response.json().statuses.setup, setup);
  assert.deepEqual(response.json().statuses.revision.request[0], {
    prompt: null,
    comments: [{ comment: 'Rename it' }],
    revision_id: 'revision-1',
    status: 'completed',
    cost: 0.25,
    updated_at: '2026-01-01T00:01:00.000Z',
  });
  assert.deepEqual(response.json().statuses.run, {
    status: 'completed',
    url: 'https://demo.test',
    updated_at: '2026-01-01T00:02:00.000Z',
  });
});

test('gets all projects and their mapped statuses from Supabase', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/projects' });
  await app.close();

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().projects.map((project) => project.project_name), ['alpha', 'demo']);
  assert.deepEqual(response.json().projects[0].statuses, { html });
});

test('gets an Angular project source files', async () => {
  const sourceDir = path.join(projectsRoot, 'viewer', 'viewer', 'src', 'app');
  await mkdir(sourceDir, { recursive: true });
  await mkdir(path.join(projectsRoot, 'viewer', 'viewer', 'node_modules'));
  await writeFile(path.join(projectsRoot, 'viewer', 'viewer', 'angular.json'), '{}');
  await writeFile(path.join(projectsRoot, 'viewer', 'viewer', '.env'), 'SECRET=hidden');
  await writeFile(path.join(projectsRoot, 'viewer', 'viewer', '.npmrc'), 'TOKEN=hidden');
  await writeFile(path.join(projectsRoot, 'viewer', 'viewer', 'debug.log'), 'temporary');
  await writeFile(path.join(sourceDir, 'app.ts'), 'export class App {}');
  await writeFile(path.join(sourceDir, 'logo.png'), Buffer.from([0, 1, 2]));

  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/project/viewer/files' });
  await app.close();

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.project_name, 'viewer');
  assert.deepEqual(body.files.map((entry) => entry.name).sort(), ['angular.json', 'src']);
  assert.deepEqual(body.files.find((entry) => entry.name === 'src').children, [{
    name: 'app',
    path: 'src/app',
    type: 'directory',
    children: [{ name: 'app.ts', path: 'src/app/app.ts', type: 'file', content: 'export class App {}' }],
  }]);
});

test('requires authentication before validating a revision', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/project/demo/revisions',
    payload: {
      prompt: 'Apply the requested changes',
      comments: [{
        id: 1,
        kind: 'element',
        comment: 'Create this page.',
        target: { selector: 'button' },
        figma_page: { project_id: 'file-id', interaction: 'navigate_on_click' },
      }],
    },
  });
  await app.close();

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: 'unauthorized' });
});

test('requires authentication for a Figma frame revision', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/project/missing/revisions',
    payload: {
      prompt: null,
      comments: [{
        kind: 'element',
        comment: 'Open the pricing details.',
        target: { selector: '#pricing-button' },
        figma_frame: { project_id: 'file-id', node_id: 'node-id' },
        interaction: { trigger: 'click', presentation: 'modal' },
      }],
    },
  });
  await app.close();

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: 'unauthorized' });
});

test('requires authentication for revisions without a thinking level', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/project/missing/revisions',
    payload: { prompt: null, comments: [{ kind: 'element', comment: 'Rename it', target: { selector: 'h1' } }] },
  });
  await app.close();

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: 'unauthorized' });
});

test('requires authentication before validating a thinking level', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/project/demo/revisions',
    payload: { prompt: 'Adjust the page spacing', comments: [], thinking_level: 'maximum' },
  });
  await app.close();

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: 'unauthorized' });
});

test('requires authentication before validating a prompt-only project request', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'POST', url: '/project/prompt', payload: { prompt: '   ' } });
  await app.close();

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: 'unauthorized' });
});

test('returns 404 for an unknown project', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/project/missing' });
  await app.close();

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), { error: 'Project not found' });
});

test('requires authentication when launching all projects', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'POST', url: '/projects/run' });
  await app.close();

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: 'unauthorized' });
});
