import { buildCollection, DICTIONARY, STROKES } from "./data";
import type { CharacterMaster, Collection, VocabularyEntry } from "./model";
import { loadDictionary, type DictionaryData } from "./OfficialDictionary";
export type LessonContext = NonNullable<Collection["curriculum"]>;
const operators: Record<string, number> = {
  "⿰": 2,
  "⿱": 2,
  "⿲": 3,
  "⿳": 3,
  "⿴": 2,
  "⿵": 2,
  "⿶": 2,
  "⿷": 2,
  "⿸": 2,
  "⿹": 2,
  "⿺": 2,
  "⿻": 2,
};
const names: Record<string, string> = {
  "⿰": "左右結構",
  "⿱": "上下結構",
  "⿲": "左中右結構",
  "⿳": "上中下結構",
  "⿴": "全包圍",
  "⿵": "上三包圍",
  "⿶": "下三包圍",
  "⿷": "左三包圍",
  "⿸": "左上包圍",
  "⿹": "右上包圍",
  "⿺": "左下包圍",
  "⿻": "重疊結構",
};
export interface LearningResources {
  rows: Map<string, string[][]>;
  words: Map<string, VocabularyEntry[]>;
  ids: Record<string, string>;
}
export function indexLearningResources(
  data: DictionaryData,
  ids: Record<string, string>,
): LearningResources {
  const rows = new Map<string, string[][]>(),
    words = new Map<string, VocabularyEntry[]>();
  for (const row of data.entries) {
    const text = row[0];
    if (Array.from(text).length === 1) {
      const group = rows.get(text) || [];
      group.push(row);
      rows.set(text, group);
    } else if (
      Array.from(text).length === 2 &&
      new Set(text).size === 2 &&
      row[13] &&
      [text, row[6], row[13]].every((x) => x.length <= 300)
    ) {
      for (const c of new Set(text)) {
        const group = words.get(c) || [];
        if (group.length < 6 && !group.some((w) => w.word === text))
          group.push({
            word: text,
            reading: row[6],
            meaning: row[13],
            example: "",
            sense: "教育部官方詞目",
            reviewStatus: "official",
            source: DICTIONARY,
          });
        words.set(c, group);
      }
    }
  }
  return { rows, words, ids };
}
let pending: Promise<LearningResources> | undefined;
export function loadLearningResources() {
  return (pending ??= Promise.all([
    loadDictionary(),
    fetch(`${import.meta.env.BASE_URL}structure-review/ids-catalog.json`).then(
      (r) => {
        if (!r.ok) throw Error("結構候選資料載入失敗");
        return r.json();
      },
    ),
  ])
    .then(([dictionary, ids]) => indexLearningResources(dictionary, ids))
    .catch((e) => {
      pending = undefined;
      throw e;
    }));
}
export function candidateMaster(
  character: string,
  resources: LearningResources,
): CharacterMaster {
  const radical = resources.rows.get(character)?.[0]?.[2].trim() || "待核對";
  const base: CharacterMaster = {
    character,
    radical,
    structure: "目前無可解析結構，待教師核對",
    components: [],
    layout: "whole",
    verificationStatus: "unavailable",
    sources: [
      DICTIONARY,
      STROKES,
      {
        title: "CJKVI IDS 字形候選（非字源結論）",
        url: "https://github.com/cjkvi/cjkvi-ids",
      },
    ],
    version: "curriculum-2026-11-03",
  };
  const ids = resources.ids[character];
  if (!ids) return base;
  try {
    const tokens = Array.from(ids);
    let i = 0;
    function next(): { value: string; parts: ReturnType<typeof next>[] } {
      const value = tokens[i++];
      if (!value) throw Error("缺少部件");
      return {
        value,
        parts: Array.from({ length: operators[value] || 0 }, next),
      };
    }
    const root = next();
    if (i !== tokens.length) throw Error("格式不符");
    function label(node: ReturnType<typeof next>): string {
      return node.parts.length ? node.parts.map(label).join("") : node.value;
    }
    if (/[^\p{Script=Han}\u2e80-\u2fff\u31c0-\u31ef]/u.test(label(root)))
      return base;
    const layouts: Record<string, CharacterMaster["layout"]> = {
      "⿰": "horizontal",
      "⿱": "vertical",
      "⿲": "triple",
      "⿳": "vertical",
    };
    const layout = layouts[root.value];
    return {
      ...base,
      structure: root.parts.length
        ? `${names[root.value]}（候選，待核對）`
        : "獨體／未再拆分（候選）",
      layout: layout || "whole",
      components: layout ? root.parts.map(label) : [],
      verificationStatus: "partial",
    };
  } catch {
    return base;
  }
}
export function buildCurriculumCollection(
  characters: string[],
  context: LessonContext,
  resources: LearningResources,
): Collection {
  const chars = [...new Set(characters)];
  if (
    !chars.length ||
    chars.length > 8 ||
    chars.some((c) => !/^\p{Script=Han}$/u.test(c))
  )
    throw Error("每次請選 1–8 個生字。");
  const value = buildCollection(
    chars.join(""),
    chars.map((_, i) => i),
  );
  value.curriculum = context;
  value.dataVersion = "curriculum-2026-11-03";
  value.scenes[4] = "字義與用法";
  value.cards = value.cards.map((card) => {
    const rows = resources.rows.get(card.character) || [];
    const readings = [...new Set(rows.map((r) => r[6]).filter(Boolean))];
    const definition =
      rows.length === 1 && rows[0][13].length <= 1000
        ? rows[0][13]
        : "請查看下方教育部完整釋義；多音、多義需依課文語境確認。";
    return {
      ...card,
      reading: readings.join("／") || "讀音待核對",
      meaning: definition,
      simple: "字典釋義須配合課文語境，由老師確認；目前未編寫白話改寫。",
      master: candidateMaster(card.character, resources),
      vocabulary: resources.words.get(card.character) || [],
      source: rows.length ? DICTIONARY : null,
    };
  });
  return value;
}
