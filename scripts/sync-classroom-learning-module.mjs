import {copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';

const destination = process.env.SHARED_MODULES_DIR;
const sourceCommit = process.env.SOURCE_COMMIT;
if (!destination || !sourceCommit) throw new Error('缺少 SHARED_MODULES_DIR 或 SOURCE_COMMIT。');

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(destination, 'classroom-learning-stats');
const files = [
  'server/classroom-export.mjs',
  'server/classroom-learning/classroom-export.mjs',
  'server/classroom-learning/learning-record.mjs',
  'src/CompetitionClassroomExport.tsx',
  'src/competitionRankingPhoto.ts',
  'public/html2canvas.min.js',
];
const hashes = {};
for (const file of files) {
  const source = join(root, file);
  const target = join(moduleRoot, 'reference', 'zh-tw', file);
  const contents = await readFile(source);
  await mkdir(dirname(target), {recursive:true});
  await copyFile(source, target);
  hashes[file] = createHash('sha256').update(contents).digest('hex');
}

const manifestPath = join(moduleRoot, 'source.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sourcePackage = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
manifest.source_commit = sourceCommit;
manifest.source_version = sourcePackage.version;
manifest.source_files_sha256 = hashes;
manifest.synchronization = {
  status:'configured',
  scope:'classroom-learning-stats/**',
  branch:'sync/zh-tw-classroom-learning',
  credential:'zh-tw repository secret SHARED_MODULES_DEPLOY_KEY',
  allowlist:files,
  notes:'Source tests run before push; shared-modules tests then open or update a review PR.',
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
