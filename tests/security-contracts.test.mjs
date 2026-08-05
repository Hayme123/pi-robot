import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import Fastify from 'fastify';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

const { publicKey, privateKey } = await generateKeyPair('ES256');
const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'ES256', use: 'sig' };
const jwksServer = createServer((request, response) => {
  if (request.url === '/auth/v1/.well-known/jwks.json') {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ keys: [jwk] }));
    return;
  }
  response.writeHead(404).end();
});
await new Promise((resolve) => jwksServer.listen(0, '127.0.0.1', resolve));
const address = jwksServer.address();
const issuerBase = `http://127.0.0.1:${address.port}`;
process.env.SUPABASE_URL = issuerBase;

const { authenticate } = await import('../dist/services/auth.js');
const { artifactKeys } = await import('../dist/services/cloud-contracts.js');

const app = Fastify();
app.get('/public', async () => ({ public: true }));
app.post('/protected', { preHandler: authenticate }, async (request) => ({ owner_id: request.ownerId }));

test.after(async () => {
  await app.close();
  await new Promise((resolve) => jwksServer.close(resolve));
});

test('keeps reads public and derives owner_id from a valid Supabase JWT', async () => {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setIssuer(`${issuerBase}/auth/v1`)
    .setAudience('authenticated')
    .setSubject('user-123')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);

  const publicResponse = await app.inject({ method: 'GET', url: '/public' });
  const unauthorized = await app.inject({ method: 'POST', url: '/protected' });
  const authorized = await app.inject({
    method: 'POST',
    url: '/protected',
    headers: { authorization: `Bearer ${token}` },
  });
  const spoofed = await app.inject({
    method: 'POST',
    url: '/protected',
    headers: { authorization: `Bearer ${token}` },
    payload: { owner_id: 'someone-else' },
  });

  assert.equal(publicResponse.statusCode, 200);
  assert.equal(unauthorized.statusCode, 401);
  assert.deepEqual(authorized.json(), { owner_id: 'user-123' });
  assert.equal(spoofed.statusCode, 400);
});

test('stores each complete project under its project-name prefix', () => {
  assert.deepEqual(artifactKeys('ai-mirror-landing'), {
    workspace: 'projects/ai-mirror-landing/workspace.zip',
    files: 'projects/ai-mirror-landing/files.json',
  });
});
