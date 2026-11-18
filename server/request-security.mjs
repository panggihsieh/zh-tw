import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), payment=(), microphone=(self)',
};

// Cloud Run appends its trusted hop to XFF. Never use the caller-controlled first entry.
export function requestIp(req, cloud = false) {
  const candidate = cloud && typeof req.headers['x-forwarded-for'] === 'string'
    ? req.headers['x-forwarded-for'].split(',').at(-1).trim()
    : req.socket?.remoteAddress;
  return candidate && isIP(candidate) ? candidate : null;
}

/** Per-instance, bounded burst protection. This supplements auth and durable account locks. */
export function createRequestGuard({cloud = false, now = Date.now, maxKeys = 10000,
  requestLimit = 6000, codeLimit = 300, loginLimit = 60} = {}) {
  const counters = new Map();
  function consume(key, limit, time) {
    let entry = counters.get(key);
    if (!entry || entry.until <= time) {
      if (counters.size >= maxKeys) {
        for (const [key, item] of counters) if (item.until <= time) counters.delete(key);
        if (counters.size >= maxKeys) return 60;
      }
      entry = {count: 0, until: time + 60000};
      counters.set(key, entry);
    }
    entry.count++;
    return entry.count > limit ? Math.max(1, Math.ceil((entry.until - time) / 1000)) : 0;
  }
  return (req, res) => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);
    const reject = (status, error, retry) => {
      if (retry) res.setHeader('Retry-After', String(retry));
      res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(JSON.stringify({error}));
      return false;
    };
    if ((req.url || '').length > 4096) return reject(414, '請求網址過長。');
    if (!cloud && !/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/.test(req.headers.host || ''))
      return reject(403, '不允許的本機 API 主機。');
    if (req.headers['sec-fetch-site'] === 'cross-site') return reject(403, '不允許跨站呼叫 API。');
    const time = now(), ip = requestIp(req, cloud) || 'unknown';
    const key = createHash('sha256').update(ip).digest('hex');
    let retry = consume(`all:${key}`, requestLimit, time);
    const path = (req.url || '').split('?')[0];
    if (path.startsWith('/api/structure/competition/code/')) retry ||= consume(`code:${key}`, codeLimit, time);
    if (path.startsWith('/auth/schooliam/')) retry ||= consume(`login:${key}`, loginLimit, time);
    return retry ? reject(429, '請求過於頻繁，請稍後重試。', retry) : true;
  };
}

export function serviceUnavailable(res) {
  if (res.writableEnded) return;
  if (res.headersSent) { res.end(); return; }
  res.writeHead(503, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify({error: '服務暫時無法使用，請稍後重試。'}));
}
