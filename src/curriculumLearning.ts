import { buildCollection, DICTIONARY, STROKES } from "./data";
import type { CharacterMaster, Collection, VocabularyEntry } from "./model";
import { CURRICULUM_LIMIT } from "./model";
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
const curriculumIdsOverrides: Readonly<Record<string, string>> = {
  // 教育部字樣說明：辨的中間是刀的變形（一撇、一點）。
  辨: "⿲辛⿰丿丶辛",
  惠: "⿱叀心",
  // The corpus uses numbered placeholders for these visible components.
  修: "⿲⿰亻丨夂彡",
  務: "⿲矛攵力",
  勝: "⿲月龹力",
  存: "⿸才子",
  朗: "⿰良月",
  郎: "⿰良阝",
  旗: "⿰㫃其",
  施: "⿰㫃也",
  希: "⿱⿱㐅𠂇巾",
  愛: "⿱⿳爫冖心夊",
  屬: "⿱⿸尸⿳丨丷八蜀",
  從: "⿲彳从龰",
  條: "⿲⿰亻丨攵木",
  賴: "⿲束刀貝",
  窪: "⿲穴氵圭",
  霸: "⿲雨革月",
  鳳: "⿵凡鳥",
  茫: "⿲艹氵亡",
  蕩: "⿲艹氵昜",
  藹: "⿲艹言曷",
  岸: "⿲山厂干",
  崖: "⿲山厂圭",
  發: "⿲癶弓殳",
  簸: "⿲竹其皮",
  聖: "⿲耳口𡈼",
  雖: "⿲口虫隹",
  類: "⿲米犬頁",
  穀: "⿲⿳士冖一禾殳",
  穎: "⿲匕禾頁",
  雜: "⿲𠅃木隹",
  騰: "⿲月龹馬",
  桌: "⿳⺊日木",
  候: "⿰亻⿰丨矦",
  臨: "⿲臣𠂉品",
  在: "⿸才土",
  曰: "⿴口一",
  專: "⿱叀寸",
  隨: "⿲阝⿳𠂇工月辶",
  垂: "⿱𠂹土",
  歲: "⿳止戌𣥂",
  贏: "⿱吂⿲月貝卂",
  徽: "⿲彳⿱⿱山一糸攵",
  徵: "⿲彳⿱⿱山一𡈼攵",
  唐: "⿸⿸广肀口",
  虛: "⿸虍丘",
  強: "⿲弓厶虫",
  隆: "⿲阝⿱夂一生",
  延: "⿲廴丿止",
  準: "⿲氵隹十",
  鹽: "⿲⿰臣𠂉鹵皿",
  受: "⿳爫冖又",
  劉: "⿲卯金刂",
  染: "⿲氵九木",
  渠: "⿲氵巨朩",
  聽: "⿲耳壬𢛳",
  炭: "⿲山厂火",
  產: "⿲文厂生",
  罰: "⿲罒言刂",
  疆: "⿲弓土畺",
  範: "⿲竹車㔾",
  幹: "⿲𠦝人干",
  殼: "⿰⿱⿳士冖一几殳",
  甚: "⿱甘匹",
  度: "⿲广廿又",
  庶: "⿲广廿灬",
  梁: "⿲氵刅朩",
  散: "⿲龷⺼攵",
  舍: "⿳人干口",
  留: "⿱⿰𠂎刀田",
  竊: "⿲穴釆⿳⺊𠔿禸",
  沒: "⿰氵𠬛",
};

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
  // 島的 IDS 來源使用數字符號佔位；依教育部字樣說明明列省形名稱，不能把它當成完整鳥字。
  if (character === "島") return {
    ...base,
    structure: "上下結構（鳥省形、山；候選，待核對）",
    components: ["鳥省", "山"],
    layout: "vertical",
    verificationStatus: "partial",
    sources: [...base.sources, { title: "教育部異體字字典（島的字樣說明）", url: "https://dict.variants.moe.edu.tw/dictView.jsp?ID=12319&la=0" }],
  };
  // 字庫明列鳥聲省；以省形名稱取代 IDS 的佔位符，不補畫成完整鳥字。
  if (character === "裊") return {
    ...base,
    structure: "上下結構（鳥省形、衣；候選，待核對）",
    components: ["鳥省", "衣"],
    layout: "vertical",
    verificationStatus: "partial",
    sources: [...base.sources, { title: "香港中文大學漢語多功能字庫（裊）", url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%A3%8A" }],
  };
  const ids = curriculumIdsOverrides[character] ?? resources.ids[character];
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
      "⿸": "upper-left-enclosure",
      "⿺": "lower-left-enclosure",
      "⿹": "upper-right-enclosure",
      "⿵": "top-enclosure",
      "⿷": "left-enclosure",
      "⿴": "full-enclosure",
      "⿻": "overlap",
    };
    const isWinningGlyph = character === "贏";
    const isMiddleStackedGlyph = ["徽", "徵"].includes(character);
    const layout = isWinningGlyph ? "triple" : layouts[root.value];
    return {
      ...base,
      structure: root.parts.length
        ? `${["度", "庶"].includes(character) ? "左上包圍、內部上下" : character === "幹" ? "左部獨體、右部上下" : ["炭", "產"].includes(character) ? "上方部件、下部左上包圍" : ["罰", "範", "竊"].includes(character) ? "上部獨體、下部左右" : ["渠", "梁"].includes(character) ? "上部左右、下部獨體" : ["聽", "疆", "散"].includes(character) ? "左部上下、右部獨體" : names[root.value]}（候選，待核對）`
        : "獨體／未再拆分（候選）",
      layout: layout || "whole",
      components: isWinningGlyph ? [label(root.parts[0]), ...root.parts[1].parts.map(label)]
        : isMiddleStackedGlyph ? [label(root.parts[0]), ...root.parts[1].parts.map(label), label(root.parts[2])]
        : layout ? root.parts.map(label) : [],
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
    chars.length > CURRICULUM_LIMIT ||
    chars.some((c) => !/^\p{Script=Han}$/u.test(c))
  )
    throw Error(`每次請選 1–${CURRICULUM_LIMIT} 個生字。`);
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
