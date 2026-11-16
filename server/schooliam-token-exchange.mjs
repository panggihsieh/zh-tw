export function createTokenExchange({ brokerUrl, clientSecret }) {
  const endpoint = new URL('/v1/token', brokerUrl);
  if (endpoint.protocol !== 'https:' || typeof clientSecret !== 'string' || clientSecret.length < 32) {
    throw new Error('SchoolIAM token exchange requires HTTPS and a client secret');
  }

  return async ({ code, clientId, redirectUri, verifier, nonce }) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: 'Bearer ' + clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: verifier,
      }),
    });
    if (!response.ok) throw new Error('SchoolIAM token exchange rejected');
    const identity = await response.json();
    if (identity?.aud !== clientId || identity.nonce !== nonce ||
        typeof identity.sub !== 'string' || !identity.sub) {
      throw new Error('Invalid SchoolIAM identity');
    }
    return identity;
  };
}
