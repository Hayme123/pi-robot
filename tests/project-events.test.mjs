import assert from 'node:assert/strict';
import test from 'node:test';

import { publishProjectEvent, subscribeProjectEvents } from '../dist/services/project-events.js';

test('broadcasts only to subscribers for the matching project', () => {
  const messages = [];
  const unsubscribe = subscribeProjectEvents('alpha', {
    readyState: 1,
    send: (message) => messages.push(JSON.parse(message)),
  });
  const event = {
    type: 'job.status',
    project_name: 'alpha',
    stage: 'html',
    status: 'completed',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  publishProjectEvent(event);
  publishProjectEvent({ ...event, project_name: 'beta' });
  unsubscribe();

  assert.deepEqual(messages, [event]);
});

test('broadcasts a revised project Cloudflare URL', () => {
  const messages = [];
  const unsubscribe = subscribeProjectEvents('alpha', {
    readyState: 1,
    send: (message) => messages.push(JSON.parse(message)),
  });
  const event = {
    type: 'job.status',
    project_name: 'alpha',
    revision_id: 'revision-1',
    stage: 'run',
    status: 'completed',
    url: 'https://new-link.trycloudflare.com',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  publishProjectEvent(event);
  unsubscribe();

  assert.deepEqual(messages, [event]);
});
