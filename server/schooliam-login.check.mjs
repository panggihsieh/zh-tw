import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createIamLogin } from './schooliam-login.mjs';

test('exchanges a valid callback and rejects invalid callbacks before exchange', async () => {
  const calls = [];
  const login = createIamLogin({
    issuer: 'https://iam.example.test',
    clientId: 'reading',
    callbackUrl: 'https://reading.example.test/auth/iam/callback',
    exchangeCode: async (request) => {
      calls.push(request);
      return { sub: 'teacher-1' };
    },
  });
  const { url, pending } = login.start();
  const authorize = new URL(url);
  assert.equal(authorize.pathname, '/authorize.html');
  assert.equal(authorize.searchParams.get('code_challenge'),
    createHash('sha256').update(pending.verifier).digest('base64url'));
  const callback = new URLSearchParams({ code: 'test-code', state: pending.state });
  await assert.rejects(login.finish(callback, null));
  await assert.rejects(login.finish(callback, { ...pending, expiresAt: 0 }));
  await assert.rejects(login.finish(new URLSearchParams({ code: 'test-code', state: 'a'.repeat(43) }), pending));
  await assert.rejects(login.finish(new URLSearchParams(callback + '&code=other'), pending));
  assert.equal(calls.length, 0);
  assert.deepEqual(await login.finish(callback, pending), { sub: 'teacher-1' });
  assert.equal(calls[0].verifier, pending.verifier);
  assert.equal(calls[0].nonce, pending.nonce);
});

test('token exchange checks the production request and rejects the wrong nonce', async (t) => {
  const { createTokenExchange } = await import('./schooliam-token-exchange.mjs');
  const secret = 's'.repeat(32);
  let returnedNonce = 'expected';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.href, 'https://broker.example.test/v1/token');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer ' + secret);
    assert.deepEqual(JSON.parse(options.body), {
      client_id: 'reading', redirect_uri: 'https://reading.example.test/auth/iam/callback',
      code: 'test-code', code_verifier: 'test-verifier',
    });
    return Response.json({ sub: 'teacher-1', aud: 'reading', nonce: returnedNonce });
  });
  const exchange = createTokenExchange({ brokerUrl: 'https://broker.example.test', clientSecret: secret });
  const params = {
    clientId: 'reading', redirectUri: 'https://reading.example.test/auth/iam/callback',
    code: 'test-code', verifier: 'test-verifier', nonce: 'expected',
  };
  assert.equal((await exchange(params)).sub, 'teacher-1');
  returnedNonce = 'unexpected';
  await assert.rejects(exchange(params), /Invalid SchoolIAM identity/);
});
