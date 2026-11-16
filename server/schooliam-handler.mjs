import { createHash, randomBytes } from 'node:crypto';
import { createIamLogin } from './schooliam-login.mjs';
import { createTokenExchange } from './schooliam-token-exchange.mjs';
import { resolveSchoolIamTeacher } from './schooliam-policy.mjs';

const origin = 'https://zh-tw.web.app';
const hash = value => createHash('sha256').update(value).digest('hex');
const cookie = req => /(?:^|;\s*)__session=([A-Za-z0-9_-]{43})(?:;|$)/.exec(req.headers.cookie || '')?.[1];

export function createSchoolIamHandler({ db, auth, env = process.env }) {
  const sessions = db.collection('hanzi_schooliam_pending');
  const configured = env.SCHOOLIAM_BROKER_URL && env.SCHOOLIAM_CLIENT_SECRET;
  const login = configured ? createIamLogin({
    issuer: 'https://school-iam.web.app', clientId: 'zh-tw',
    callbackUrl: `${origin}/auth/schooliam/callback`,
    exchangeCode: createTokenExchange({ brokerUrl: env.SCHOOLIAM_BROKER_URL, clientSecret: env.SCHOOLIAM_CLIENT_SECRET }),
  }) : null;

  return async (req, res) => {
    const url = new URL(req.url, origin);
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
      res.end(JSON.stringify(body));
    };
    if (!login) return send(503, { error: 'SchoolIAM 教師接入尚未啟用，請使用原有 Google 登入。' });
    try {
      if (url.pathname === '/auth/schooliam/login' && req.method === 'GET') {
        const id = randomBytes(32).toString('base64url');
        const { url: destination, pending } = login.start();
        await sessions.doc(hash(id)).create({ ...pending, deleteAfter: new Date(pending.expiresAt) });
        res.writeHead(302, {
          Location: destination, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
          'Set-Cookie': `__session=${id}; Path=/auth/schooliam; HttpOnly; Secure; SameSite=Lax; Max-Age=300`,
        });
        return res.end();
      }
      if (url.pathname !== '/auth/schooliam/exchange' || req.method !== 'POST') return send(405, { error: 'method_not_allowed' });
      if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0] !== 'application/json') return send(403, { error: '登入請求來源不符' });
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 4096) return send(413, { error: 'request_too_large' });
      }
      const query = JSON.parse(body);
      if (typeof query.code !== 'string' || typeof query.state !== 'string') return send(400, { error: '登入回呼資料不完整' });
      const id = cookie(req);
      if (!id) return send(400, { error: '登入狀態已失效，請重新登入' });
      const ref = sessions.doc(hash(id));
      const pending = await db.runTransaction(async tx => {
        const record = await tx.get(ref);
        if (!record.exists) return null;
        tx.delete(ref);
        return record.data();
      });
      res.setHeader('Set-Cookie', '__session=; Path=/auth/schooliam; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
      const identity = await login.finish(new URLSearchParams({ code: query.code, state: query.state }), pending);
      const link = (await db.collection('hanzi_schooliam_links').doc(identity.sub).get()).data();
      if (!link?.localUid) throw new Error('Missing teacher link');
      const user = await auth.getUser(link.localUid);
      const uid = resolveSchoolIamTeacher(identity.sub, link, user);
      const access = (await db.collection('hanzi_notebook_access').doc(user.email).get()).data();
      if (access && access.enabled !== true) throw new Error('Teacher disabled');
      return send(200, { token: await auth.createCustomToken(uid, { schooliam: 'zh-tw-teacher' }) });
    } catch (error) {
      console.error('SchoolIAM request failed', { path: url.pathname, code: error?.code ?? 'unknown' });
      return send(403, { error: 'SchoolIAM 教師登入未完成：請確認帳號接入授權，或重新登入。' });
    }
  };
}
