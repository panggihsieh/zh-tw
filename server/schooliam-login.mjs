import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const random = () => randomBytes(32).toString('base64url');

// The host app stores and atomically consumes pending server-side, per browser session.
export function createIamLogin({ issuer, clientId, callbackUrl, exchangeCode }) {
  const authorize = new URL('/authorize.html', issuer);
  if (authorize.protocol !== 'https:' || new URL(callbackUrl).protocol !== 'https:') {
    throw new Error('IAM and callback URLs must use HTTPS');
  }

  return {
    start() {
      const pending = {
        state: random(), verifier: random(), nonce: random(), expiresAt: Date.now() + 300_000,
      };
      const url = new URL(authorize);
      url.search = new URLSearchParams({
        response_type: 'code', client_id: clientId, redirect_uri: callbackUrl,
        state: pending.state, nonce: pending.nonce, code_challenge_method: 'S256',
        code_challenge: createHash('sha256').update(pending.verifier).digest('base64url'),
      }).toString();
      return { url: url.href, pending };
    },

    async finish(query, pending) {
      const state = query.get('state') ?? '';
      const code = query.get('code');
      if (!pending || pending.expiresAt <= Date.now() || query.has('error') ||
          query.getAll('state').length !== 1 || query.getAll('code').length !== 1 || !code ||
          !/^[A-Za-z0-9_-]{43}$/.test(state) ||
          !timingSafeEqual(Buffer.from(state), Buffer.from(pending.state))) {
        throw new Error('Invalid IAM login callback');
      }
      // The adapter authenticates the client and validates the broker response.
      return exchangeCode({
        code, clientId, redirectUri: callbackUrl, verifier: pending.verifier, nonce: pending.nonce,
      });
    },
  };
}
