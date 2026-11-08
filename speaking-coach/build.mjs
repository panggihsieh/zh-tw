import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
const assets = {};
for (const [path, file, type] of [['/', 'index.html', 'text/html; charset=utf-8'], ['/app.js', 'app.js', 'text/javascript; charset=utf-8'], ['/style.css', 'style.css', 'text/css; charset=utf-8'], ['/project-style.css', 'project-style.css', 'text/css; charset=utf-8']]) {
  assets[path] = { body: await readFile(new URL(`public/${file}`, import.meta.url), 'utf8'), type };
}
assets['/green-bird.png'] = {body:(await readFile(new URL('public/green-bird.png',import.meta.url))).toString('base64'),type:'image/png',base64:true};
await mkdir(new URL('dist/server/', import.meta.url), { recursive: true });
await mkdir(new URL('dist/.openai/', import.meta.url), { recursive: true });
const api = await readFile(new URL('worker.mjs', import.meta.url), 'utf8');
await writeFile(new URL('dist/server/index.js', import.meta.url), `const ASSETS = ${JSON.stringify(assets)};\n${api}`);
await copyFile(new URL('.openai/hosting.json', import.meta.url), new URL('dist/.openai/hosting.json', import.meta.url));
console.log('Built standalone Worker with embedded assets.');
