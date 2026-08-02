import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const projectsRoot = await mkdtemp(path.join(tmpdir(), 'pi-projects-'));
process.env.PROJECTS_ROOT = projectsRoot;
const { buildApp } = await import('../dist/app.js');
const { requiresRevisionHtml, writeRevisionStatus } = await import('../dist/routes/project.js');

test.after(() => rm(projectsRoot, { recursive: true, force: true }));

test('requires HTML before Angular for page, modal, and tab revisions', () => {
  assert.equal(requiresRevisionHtml('new_page'), true);
  assert.equal(requiresRevisionHtml('modal'), true);
  assert.equal(requiresRevisionHtml('tab'), true);
  assert.equal(requiresRevisionHtml('auto'), false);
});

test('gets a project with its available statuses', async () => {
  const projectDir = path.join(projectsRoot, 'demo');
  const setup = { status: 'completed', updated_at: '2026-01-01T00:00:00.000Z' };
  const revision = {
    request: [{
      revision_id: 'revision-1',
      prompt: null,
      comments: [{ kind: 'element', comment: 'Rename it', target: { selector: 'h1' } }],
      status: 'completed',
      cost: 0.25,
      updated_at: '2026-01-01T00:01:00.000Z',
    }],
  };
  await mkdir(projectDir);
  await writeFile(path.join(projectDir, 'status_setup.json'), JSON.stringify(setup));
  await writeFile(path.join(projectDir, 'status_revision.json'), JSON.stringify(revision));

  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/project/demo' });
  await app.close();

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { project_name: 'demo', statuses: { setup, revision } });
});

test('appends revision requests and updates each request in place', async () => {
  const projectDir = path.join(projectsRoot, 'revision-history');
  const firstRequest = { prompt: null, comments: [{ comment: 'First' }] };
  await mkdir(projectDir);
  await writeRevisionStatus(projectDir, { revision_id: 'one', request: firstRequest, status: 'processing' });
  await writeRevisionStatus(projectDir, { revision_id: 'one', request: firstRequest, status: 'completed', cost: 0.2, context_percent: 20, summary: 'Changed the heading color.' });
  await writeRevisionStatus(projectDir, { revision_id: 'two', request: { prompt: 'Second', comments: [{ comment: 'Second' }] }, status: 'processing' });

  const saved = JSON.parse(await readFile(path.join(projectDir, 'status_revision.json'), 'utf8'));
  await rm(projectDir, { recursive: true });
  assert.equal(saved.request.length, 2);
  assert.deepEqual(saved.request.map(({ revision_id, status, cost, context_percent, summary }) => ({ revision_id, status, cost, context_percent, summary })), [
    { revision_id: 'one', status: 'completed', cost: 0.2, context_percent: 20, summary: 'Changed the heading color.' },
    { revision_id: 'two', status: 'processing', cost: undefined, context_percent: undefined, summary: undefined },
  ]);
});

test('gets all project directories with their statuses', async () => {
  const projectDir = path.join(projectsRoot, 'alpha');
  const html = { status: 'processing', updated_at: '2026-01-02T00:00:00.000Z' };
  await mkdir(projectDir);
  await writeFile(path.join(projectDir, 'status_html.json'), JSON.stringify(html));
  await writeFile(path.join(projectsRoot, 'not-a-project'), 'ignored');

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

test('rejects a partially populated Figma page revision', async () => {
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

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), { error: 'invalid_revision' });
});

test('accepts a Figma frame with an explicit presentation', async () => {
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

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), { error: 'Project not found' });
});

test('defaults a missing revision thinking level to medium', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/project/missing/revisions',
    payload: { prompt: null, comments: [{ kind: 'element', comment: 'Rename it', target: { selector: 'h1' } }] },
  });
  await app.close();

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), { error: 'Project not found' });
});

test('rejects an unsupported revision thinking level', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/project/demo/revisions',
    payload: { prompt: 'Adjust the page spacing', comments: [], thinking_level: 'maximum' },
  });
  await app.close();

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), { error: 'invalid_revision' });
});

test('rejects an empty prompt-only project request', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'POST', url: '/project/prompt', payload: { prompt: '   ' } });
  await app.close();

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), { error: 'prompt must be a non-empty string' });
});

test('returns 404 for an unknown project', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/project/missing' });
  await app.close();

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), { error: 'Project not found' });
});

test('skips incomplete projects when launching all projects', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'POST', url: '/projects/run' });
  await app.close();

  assert.equal(response.statusCode, 200);
  assert.ok(response.json().projects.length > 0);
  assert.ok(response.json().projects.every((project) => project.status === 'skipped'));
});
