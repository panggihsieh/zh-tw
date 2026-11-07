// Pinned source, original outlines/tracks retained for nonprofit educational use.
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const revision = "26f12d65063cc97d2773b7777232277bfca5f563";
const folder = `.local/moe-source/zh-stroke-data-${revision}`;
execFileSync("tar", [
  "-xzf",
  ".local/moe-source/source.tgz",
  "-C",
  ".local/moe-source",
  `zh-stroke-data-${revision}/json`,
  `zh-stroke-data-${revision}/README.md`,
]);
await fs.mkdir("public/game-strokes", { recursive: true });
const catalog = {
  source: "g0v/zh-stroke-data (教育部常用國字標準字體筆劃)",
  revision,
  coordinates: 2048,
  characters: [],
};
for (const name of (await fs.readdir(`${folder}/json`)).sort()) {
  if (!/^[0-9a-f]+\.json$/i.test(name)) continue;
  const strokes = JSON.parse(
    await fs.readFile(`${folder}/json/${name}`, "utf8"),
  );
  if (
    !Array.isArray(strokes) ||
    !strokes.length ||
    !strokes.every((s) => s.track?.length >= 2 && s.outline?.length)
  )
    continue;
  await fs.writeFile(`public/game-strokes/${name}`, JSON.stringify(strokes));
  catalog.characters.push({
    character: String.fromCodePoint(parseInt(name, 16)),
    file: name,
    strokes: strokes.length,
  });
}
await fs.copyFile(
  `${folder}/README.md`,
  "public/game-strokes/SOURCE-LICENSE.md",
);
await fs.writeFile("public/game-strokes/catalog.json", JSON.stringify(catalog));
console.log(
  `Imported ${catalog.characters.length} original source characters, revision ${revision}`,
);
