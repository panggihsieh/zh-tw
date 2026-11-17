import { readFileSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

// Verify built output at the real nested callback URL, not only at the homepage.
const dist = resolve('dist');
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const callback = new URL('https://zh-tw.web.app/auth/schooliam/callback');
let checked = 0;
for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
  const tag = match[0];
  if (match[1].toLowerCase() === 'link' && !/rel=["'](?:stylesheet|modulepreload)["']/i.test(tag)) continue;
  const value = /(?:src|href)=["']([^"']+)["']/i.exec(tag)?.[1];
  if (!value) continue;
  const url = new URL(value, callback);
  if (url.origin !== callback.origin) continue;
  const file = resolve(dist, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(dist + sep) || !existsSync(file)) {
    throw new Error(`SchoolIAM callback cannot load ${value}: resolves to ${url.pathname}. Use a root-based Vite asset path.`);
  }
  checked++;
}
if (!checked) throw new Error('No local entry assets found in built HTML');
console.log(`SchoolIAM callback asset check passed (${checked} scripts/styles/preloads).`);
