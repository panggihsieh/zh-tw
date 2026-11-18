import { describe, expect, it } from "vitest";
import { analyzeStructure } from "./CharacterStructureAnalysis";
import type { CharacterMaster } from "./model";
import { structureClues } from "./structureClues";
import { candidateMaster } from "./curriculumLearning";

const master = (overrides: Partial<CharacterMaster> = {}): CharacterMaster => ({
  character: "銀",
  radical: "金",
  structure: "左右結構",
  components: ["金字旁", "艮"],
  layout: "horizontal",
  verificationStatus: "partial",
  sources: [],
  version: "test",
  ...overrides,
});

describe("analyzeStructure", () => {
  it("describes positions and identifies the radical component", () => {
    expect(analyzeStructure(master())).toEqual([
      { name: "金字旁", position: "左側", role: "部首線索" },
      { name: "艮", position: "右側", role: "組字部件" },
    ]);
  });

  it("supports three-part structures", () => {
    expect(
      analyzeStructure(
        master({
          radical: "言",
          layout: "triple",
          components: ["言", "身", "寸"],
        }),
      ),
    ).toEqual([
      { name: "言", position: "左側", role: "部首線索" },
      { name: "身", position: "中間", role: "組字部件" },
      { name: "寸", position: "右側", role: "組字部件" },
    ]);
  });

  it("keeps sound and meaning clues tied to reviewed components", () => {
    expect(structureClues("銀")?.sound?.componentIndexes).toEqual([1]);
    expect(structureClues("銀")?.meaning?.componentIndexes).toEqual([0]);
    const glass = structureClues("璃", ["王", "离"]);
    expect(glass?.sound?.title).toContain("离");
    expect(glass?.sound?.componentIndexes).toEqual([1]);
    expect(glass?.meaning?.title).toContain("玉");
    expect(glass?.meaning?.componentIndexes).toEqual([0]);
    expect(glass?.sound?.sources?.length).toBeGreaterThan(0);
    expect(glass?.meaning?.sources?.length).toBeGreaterThan(0);
    const garlic = structureClues("蒜", ["艹", "祘"]);
    expect(garlic?.sound?.componentIndexes).toEqual([1]);
    expect(garlic?.meaning?.componentIndexes).toEqual([0]);
    expect(garlic?.sound?.sources?.[0].url).toContain("ID=38529");

    const jadeRing = structureClues("環", ["王", "睘"]);
    expect(jadeRing?.sound?.title).toContain("依《說文》");
    expect(jadeRing?.sound?.componentIndexes).toEqual([1]);
    expect(jadeRing?.meaning?.componentIndexes).toEqual([0]);
    expect(jadeRing?.sound?.sources?.[0].url).toContain("shuowenjiezi/shuowen");
    expect(structureClues("未收錄")).toBeNull();
  });
});

describe("curriculum etymology clues", () => {
  it("separates the water and wood meaning clues from 刅 in 梁", () => {
    const glyph = candidateMaster("梁", { rows: new Map(), words: new Map(), ids: {} });
    expect(glyph.components).toEqual(["氵", "刅", "朩"]);
    expect(analyzeStructure(glyph).map(part => part.position)).toEqual(["左上", "右上", "下方"]);
    expect(structureClues("梁", glyph.components)?.sound?.componentIndexes).toEqual([1]);
    expect(structureClues("梁", glyph.components)?.meaning?.componentIndexes).toEqual([0, 2]);
  });
  it("identifies the cited 示 sound clue in 視 and keeps the 辯 alternative explicit", () => {
    expect(structureClues("視", ["礻", "見"])?.sound?.componentIndexes).toEqual([0]);
    expect(structureClues("視", ["礻", "見"])?.meaning?.componentIndexes).toEqual([1]);
    expect(structureClues("視", ["礻", "見"])?.sound?.explanation).toContain("段注本");
    expect(structureClues("辯", ["辛", "言", "辛"])?.sound?.componentIndexes).toEqual([]);
    expect(structureClues("辯", ["辛", "言", "辛"])?.meaning?.explanation).toContain("另有");
  });
  it("uses a named abbreviated bird form for 島 instead of the unparseable IDS placeholder", () => {
    const glyph = candidateMaster("島", { rows: new Map(), words: new Map(), ids: { 島: "⿹⑦山" } });
    expect(glyph.components).toEqual(["鳥省", "山"]);
    expect(glyph.layout).toBe("vertical");
    expect(glyph.sources.some(source => source.url.includes("ID=12319"))).toBe(true);
    expect(structureClues("島", glyph.components)?.sound?.componentIndexes).toEqual([0]);
    expect(structureClues("島", glyph.components)?.meaning?.componentIndexes).toEqual([1]);
  });
  it("does not highlight historical parts that have disappeared from the modern glyph", () => {
    const bed = structureClues("床", ["广", "木"]);
    expect(bed?.sound?.componentIndexes).toEqual([]);
    expect(bed?.meaning?.componentIndexes).toEqual([1]);
    expect(bed?.sound?.explanation).toContain("完整的爿");
    const hurry = structureClues("匆", ["勿", "丶"]);
    expect(hurry?.sound?.componentIndexes).toEqual([]);
    expect(hurry?.meaning?.componentIndexes).toEqual([]);
    expect(hurry?.meaning?.explanation).toContain("不寫心旁");
  });
  it("tracks the transformed 石 component and its dual role in 庶", () => {
    const degree = candidateMaster("度", { rows: new Map(), words: new Map(), ids: {} });
    expect(analyzeStructure(degree).map(part => part.position)).toEqual(["左上外側", "內側上方", "內側下方"]);
    expect(structureClues("度", degree.components)?.sound?.componentIndexes).toEqual([0, 1]);
    expect(structureClues("度", degree.components)?.meaning?.componentIndexes).toEqual([2]);
    const common = candidateMaster("庶", { rows: new Map(), words: new Map(), ids: {} });
    expect(structureClues("庶", common.components)?.sound?.componentIndexes).toEqual([0, 1]);
    expect(structureClues("庶", common.components)?.meaning?.componentIndexes).toEqual([0, 1, 2]);
    expect(structureClues("庶", common.components)?.meaning?.explanation).toContain("兼表聲");
  });
  it("retains both source accounts for 殼 without merging their sound components", () => {
    const glyph = candidateMaster("殼", { rows: new Map(), words: new Map(), ids: {} });
    expect(glyph.components).toEqual(["士冖一几", "殳"]);
    const clues = structureClues("殼", glyph.components);
    expect(clues?.sound?.componentIndexes).toEqual([0]);
    expect(clues?.meaning?.componentIndexes).toEqual([1]);
    expect(clues?.sound?.sources).toHaveLength(2);
    expect(clues?.meaning?.explanation).toContain("作用不同");
    expect(clues?.sound?.explanation).toContain("𠕓");
  });
  it("maps abbreviated 高 in 毫 and preserves the cited non-phonetic account for 甚", () => {
    expect(structureClues("毫", ["亠口冖", "毛"])?.sound?.componentIndexes).toEqual([0]);
    expect(structureClues("毫", ["亠口冖", "毛"])?.meaning?.componentIndexes).toEqual([1]);
    const glyph = candidateMaster("甚", { rows: new Map(), words: new Map(), ids: {} });
    expect(glyph.components).toEqual(["甘", "匹"]);
    expect(structureClues("甚", glyph.components)?.sound?.componentIndexes).toEqual([]);
  });
  it.each([
    ["浸", ["氵", "𠬶"], [1], [0]],
    ["那", ["刀二", "阝"], [0], [1]],
    ["幹", ["𠦝", "人", "干"], [0, 1], [2]],
  ] as const)("keeps the historical sound and meaning positions distinct in %s", (character, parts, sound, meaning) => {
    expect(structureClues(character, parts)?.sound?.componentIndexes).toEqual(sound);
    expect(structureClues(character, parts)?.meaning?.componentIndexes).toEqual(meaning);
  });
  it.each(["羹", "套", "摯"])("does not invent an independent sound component for the cited 會意 account of %s", character => {
    expect(structureClues(character)?.sound?.componentIndexes).toEqual([]);
    expect(structureClues(character)?.sound?.title).toContain("會意");
    expect(structureClues(character)?.meaning?.sources?.length).toBeGreaterThan(0);
  });
  it.each([
    ["罰", ["罒", "言", "刂"], [0, 1], [2]],
    ["疆", ["弓", "土", "畺"], [0, 2], [1]],
    ["範", ["竹", "車", "㔾"], [0, 2], [1]],
  ] as const)("maps the complete historical sound component in %s", (character, parts, sound, meaning) => {
    const glyph = candidateMaster(character, { rows: new Map(), words: new Map(), ids: {} });
    expect(glyph.components).toEqual(parts);
    expect(structureClues(character, glyph.components)?.sound?.componentIndexes).toEqual(sound);
    expect(structureClues(character, glyph.components)?.meaning?.componentIndexes).toEqual(meaning);
  });
  it("keeps competing historical explanations explicit for 疑 and 良", () => {
    expect(structureClues("疑", ["𠤕", "龴疋"])?.meaning?.explanation).toContain("後來");
    expect(structureClues("疑", ["𠤕", "龴疋"])?.meaning?.explanation).toContain("矢聲");
    expect(structureClues("良", ["丶", "艮"])?.meaning?.explanation).toContain("亡聲");
    expect(structureClues("甦", ["更", "生"])?.sound?.componentIndexes).toEqual([]);
  });
  it.each(["炭", "產"])("separates the enclosing abbreviated sound component from the inner meaning part in %s", character => {
    const glyph = candidateMaster(character, { rows: new Map(), words: new Map(), ids: {} });
    expect(analyzeStructure(glyph).map(part => part.position)).toEqual(["上方", "左下外側", "右下內側"]);
    expect(structureClues(character, glyph.components)?.sound?.componentIndexes).toEqual([0, 1]);
    expect(structureClues(character, glyph.components)?.meaning?.componentIndexes).toEqual([2]);
  });
  it("places the split sound parts of 渠 and the lower-left sound part of 聽 correctly", () => {
    const canal = candidateMaster("渠", { rows: new Map(), words: new Map(), ids: {} });
    expect(analyzeStructure(canal).map(part => part.position)).toEqual(["左上", "右上", "下方"]);
    expect(structureClues("渠", canal.components)?.sound?.componentIndexes).toEqual([1, 2]);
    expect(structureClues("渠", canal.components)?.meaning?.componentIndexes).toEqual([0]);
    const listen = candidateMaster("聽", { rows: new Map(), words: new Map(), ids: {} });
    expect(analyzeStructure(listen).map(part => part.position)).toEqual(["左上", "左下", "右側"]);
    expect(structureClues("聽", listen.components)?.sound?.componentIndexes).toEqual([1]);
    expect(structureClues("聽", listen.components)?.meaning?.componentIndexes).toEqual([0]);
  });
  it("keeps the three vertical parts of 麥 and its two-part historical sound clue", () => {
    const glyph = candidateMaster("麥", { rows: new Map(), words: new Map(), ids: { 麥: "⿳⿻十从人夕" } });
    expect(glyph.components).toEqual(["十从", "人", "夕"]);
    expect(analyzeStructure(glyph).map(part => part.position)).toEqual(["上方", "中間", "下方"]);
    expect(structureClues("麥", glyph.components)?.sound?.componentIndexes).toEqual([0, 1]);
    expect(structureClues("麥", glyph.components)?.meaning?.componentIndexes).toEqual([2]);
  });
  it("distinguishes modern written sound parts from the historical forms in 蛋 and 脆", () => {
    const egg = structureClues("蛋", ["疋", "虫"]);
    expect(egg?.sound?.componentIndexes).toEqual([0]);
    expect(egg?.meaning?.componentIndexes).toEqual([1]);
    expect(egg?.sound?.explanation).toContain("延");
    expect(egg?.sound?.explanation).toContain("疋");
    const brittle = structureClues("脆", ["⺼", "危"]);
    expect(brittle?.sound?.componentIndexes).toEqual([1]);
    expect(brittle?.meaning?.componentIndexes).toEqual([0]);
    expect(brittle?.sound?.explanation).toContain("古字脃");
  });
  it("preserves overlapping parts without calling them upper and lower parts", () => {
    const glyph = candidateMaster("幽", { rows: new Map(), words: new Map(), ids: { 幽: "⿻山𢆶" } });
    expect(glyph.layout).toBe("overlap");
    expect(analyzeStructure(glyph).map(part => part.position)).toEqual(["交疊部件一", "交疊部件二"]);
    expect(structureClues("幽", glyph.components)?.sound?.componentIndexes).toEqual([1]);
    expect(structureClues("幽", glyph.components)?.meaning?.componentIndexes).toEqual([0]);
  });
  it("maps historical forms to the actual displayed components", () => {
    expect(structureClues("沿", ["氵", "儿口"])?.sound?.componentIndexes).toEqual([1]);
    expect(structureClues("掌", ["𫩠", "手"])?.sound?.componentIndexes).toEqual([0]);
    expect(structureClues("船", ["舟", "儿口"])?.sound?.explanation).toContain("鉛省聲");
  });

  it("distinguishes the two sides of the 阝 component", () => {
    expect(structureClues("阻", ["阝", "且"])?.meaning?.componentIndexes).toEqual([0]);
    expect(structureClues("郊", ["交", "阝"])?.meaning?.componentIndexes).toEqual([1]);
    expect(structureClues("郊", ["阝", "交"])?.meaning?.componentIndexes).toEqual([]);
  });

  it("explains a documented non-phonetic character without highlighting a sound component", () => {
    const clues = structureClues("信", ["亻", "言"]);
    expect(clues?.sound?.title).toContain("會意");
    expect(clues?.sound?.componentIndexes).toEqual([]);
    expect(clues?.meaning?.explanation).toContain("誠信");
    expect(clues?.meaning?.sources?.[0].url).toContain("ctext.org");
  });
});

it("keeps 畏's seal-script account separate from the earlier 鬼 phonetic account", () => {
  const clues = structureClues("畏", ["田", "一", "𠄌乀丿"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("虎的省形");
  expect(clues?.meaning?.explanation).toContain("鬼兼表聲");
  expect(clues?.meaning?.sources?.length).toBe(2);
});

it("marks 真's changed regions without treating 十 and 具 as their modern lexical meanings", () => {
  const clues = structureClues("真", ["十", "具"]);
  expect(clues?.sound?.componentIndexes).toEqual([0]);
  expect(clues?.meaning?.componentIndexes).toEqual([1]);
  expect(clues?.sound?.explanation).toContain("演變後的位置");
  expect(clues?.meaning?.explanation).toContain("可能");
  expect(clues?.meaning?.explanation).toContain("兩說");
  expect(clues?.meaning?.sources?.length).toBe(2);
});

it("uses 沒's documented right-hand form and explicitly attributes the phonetic reading to Duan", () => {
  const glyph = candidateMaster("沒", { rows: new Map(), words: new Map(), ids: {} });
  expect(glyph.components).toEqual(["氵", "𠬛"]);
  const clues = structureClues("沒", glyph.components);
  expect(clues?.sound?.componentIndexes).toEqual([1]);
  expect(clues?.meaning?.componentIndexes).toEqual([0]);
  expect(clues?.sound?.explanation).toContain("段注本");
  expect(clues?.sound?.explanation).toContain("ㄇㄟˊ");
  expect(structureClues("沒", ["氵", "殳"])?.sound?.componentIndexes).toEqual([]);
});

it("attributes 做's historical 故 sound analysis without deriving its modern Mandarin reading", () => {
  const clues = structureClues("做", ["亻", "故"]);
  expect(clues?.sound?.componentIndexes).toEqual([1]);
  expect(clues?.meaning?.componentIndexes).toEqual([0]);
  expect(clues?.sound?.explanation).toContain("黃氏");
  expect(clues?.sound?.explanation).toContain("不能按故的今音");
  expect(clues?.meaning?.sources?.length).toBe(2);
});

it("attributes 甩's modern variant-ideograph analysis without inventing a sound part", () => {
  const clues = structureClues("甩", ["用", "乚"]);
  expect(clues?.sound?.title).toContain("變體表意");
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("沒有逐筆");
  expect(clues?.meaning?.sources?.[0].url).toContain("#page=5");
});

it("attributes 甲's seal-script pictographic account while preserving the older phonetic alternative", () => {
  const clues = structureClues("甲", []);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("十作聲符");
  expect(clues?.meaning?.explanation).toContain("不能");
  expect(clues?.meaning?.sources?.length).toBe(2);
});

it("separates 色's early pressure scene from its borrowed colour meaning", () => {
  const clues = structureClues("色", ["𠂊", "巴"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("借作色");
  expect(clues?.meaning?.explanation).toContain("兩種時代");
  expect(clues?.meaning?.sources?.[0].url).toContain("%E8%89%B2");
});

it("does not equate 必's modern heart-like outline with its ancient handle meaning", () => {
  const clues = structureClues("必", ["心", "丿"]);
  expect(clues?.meaning?.title).toContain("兵器柄");
  expect(clues?.meaning?.explanation).toContain("後起");
  expect(clues?.meaning?.componentIndexes).toEqual([]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(structureClues("更", ["一", "日乂"])?.meaning?.explanation).toContain("初義不明");
  expect(structureClues("重", [])?.meaning?.explanation).toContain("共用");
});

it("names 裊's abbreviated bird sound component without replacing it with a full bird", () => {
  const glyph = candidateMaster("裊", { rows: new Map(), words: new Map(), ids: { 裊: "⿱⑦衣" } });
  expect(glyph.components).toEqual(["鳥省", "衣"]);
  expect(glyph.layout).toBe("vertical");
  expect(structureClues("裊", glyph.components)?.sound?.componentIndexes).toEqual([0]);
  expect(structureClues("裊", glyph.components)?.meaning?.componentIndexes).toEqual([1]);
  expect(structureClues("裊", glyph.components)?.sound?.explanation).toContain("省寫");
});

it("maps 竊's abbreviated sound component separately from its changed rice component", () => {
  const glyph = candidateMaster("竊", { rows: new Map(), words: new Map(), ids: {} });
  expect(glyph.components).toEqual(["穴", "釆", "⺊𠔿禸"]);
  expect(analyzeStructure(glyph).map(part => part.position)).toEqual(["上方", "左下", "右下"]);
  const clues = structureClues("竊", glyph.components);
  expect(clues?.sound?.componentIndexes).toEqual([2]);
  expect(clues?.meaning?.componentIndexes).toEqual([0, 1]);
  expect(clues?.sound?.explanation).toContain("已省去");
  expect(clues?.meaning?.explanation).toContain("辨別義");
});

it("maps 留's changed sound component without interpreting its knife-shaped strokes as meaning", () => {
  const glyph = candidateMaster("留", { rows: new Map(), words: new Map(), ids: {} });
  expect(glyph.components).toEqual(["𠂎刀", "田"]);
  expect(analyzeStructure(glyph).map(part => part.position)).toEqual(["上方", "下方"]);
  const clues = structureClues("留", glyph.components);
  expect(clues?.sound?.componentIndexes).toEqual([0]);
  expect(clues?.meaning?.componentIndexes).toEqual([1]);
  expect(clues?.meaning?.explanation).toContain("沒有詳述");
});

it("attributes 疊's traditional account instead of inventing a pronunciation clue", () => {
  const clues = structureClues("疊", ["畾", "冝"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("楊雄");
  expect(clues?.meaning?.sources?.[0].url).toContain("ID=28623");
});

it("keeps 舍's ancient 余 region together while explaining its shared semantic role", () => {
  const glyph = candidateMaster("舍", { rows: new Map(), words: new Map(), ids: {} });
  expect(glyph.components).toEqual(["人", "干", "口"]);
  expect(analyzeStructure(glyph).map(part => part.position)).toEqual(["上方", "中間", "下方"]);
  const clues = structureClues("舍", glyph.components);
  expect(clues?.sound?.componentIndexes).toEqual([0, 1]);
  expect(clues?.meaning?.componentIndexes).toEqual([0, 1, 2]);
  expect(clues?.meaning?.explanation).toContain("可能");
});

it("keeps the meat component out of 散's split historical sound component", () => {
  const clues = structureClues("散", ["龷", "⺼", "攵"]);
  expect(clues?.sound?.componentIndexes).toEqual([0, 2]);
  expect(clues?.meaning?.componentIndexes).toEqual([1]);
  expect(clues?.sound?.sources?.length).toBeGreaterThan(1);
});

it("marks the shared compound region of 泰 without treating every stroke as phonetic", () => {
  const clues = structureClues("泰", ["𡗗", "氺"]);
  expect(clues?.sound?.componentIndexes).toEqual([0]);
  expect(clues?.meaning?.componentIndexes).toEqual([0, 1]);
});

it("documents the named pictographic account of 焉 without inventing a fire meaning", () => {
  const clues = structureClues("焉", []);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("正聲");
});

it.each([
  ["辦", ["辛", "力", "辛"]],
  ["辮", ["辛", "糸", "辛"]],
  ["辨", ["辛", "丿丶", "辛"]],
  ["粥", ["弓", "米", "弓"]],
  ["衡", ["彳", "𩵋", "亍"]],
])("highlights both halves of the sound component in %s", (character, parts) => {
  const clues = structureClues(character, parts);
  expect(clues?.sound?.componentIndexes).toEqual([0, 2]);
  expect(clues?.meaning?.componentIndexes).toEqual([1]);
});

it.each([
  ["撤", ["扌", "育", "攵"]],
  ["澈", ["氵", "育", "攵"]],
])("keeps the abbreviated 徹 sound clue separate from the radical in %s", (character, parts) => {
  const clues = structureClues(character, parts);
  expect(clues?.sound?.componentIndexes).toEqual([1, 2]);
  expect(clues?.meaning?.componentIndexes).toEqual([0]);
  expect(clues?.sound?.explanation).toContain("徹");
  expect(structureClues(character, parts.slice(0, 2))?.sound?.componentIndexes).toEqual([]);
});

it("attributes 濬 to the cited medieval account and keeps the whole right-hand phonetic", () => {
  const clues = structureClues("濬", ["氵", "睿"]);
  expect(clues?.sound?.componentIndexes).toEqual([1]);
  expect(clues?.meaning?.componentIndexes).toEqual([0]);
  expect(clues?.sound?.explanation).toContain("《文字典說》");
  expect(clues?.sound?.explanation).toContain("今音不同");
  expect(clues?.meaning?.explanation).toContain("不取聰明義");
});

it("distinguishes 是's later seal account from the uncertain earlier bronze account", () => {
  const clues = structureClues("是", ["日", "𤴓"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("日與正共同表意");
  expect(clues?.meaning?.explanation).toContain("本義不明");
  expect(clues?.meaning?.explanation).toContain("不是所有時期唯一");
});

it("does not mislabel 禽's modern 人 as the complete ancient 今 phonetic", () => {
  const clues = structureClues("禽", ["人", "离"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.componentIndexes).toEqual([]);
  expect(clues?.sound?.explanation).toContain("不把上方人形冒充");
  expect(clues?.meaning?.explanation).toContain("不把整個离");
});

it("attributes 禿's pictographic account and preserves the unresolved alternative", () => {
  const clues = structureClues("禿", ["禾", "儿"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("鄭樵");
  expect(clues?.meaning?.explanation).toContain("不是古字源已無爭議");
  expect(clues?.meaning?.sources).toHaveLength(3);
});

it.each([['粄', '反'], ['粿', '果']])("keeps %s's dictionary meaning separate from an unverified phonetic analysis", (glyph, right) => {
  const clues = structureClues(glyph, ["米", right]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.sound?.explanation).toContain("未明列");
  expect(clues?.meaning?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("《說文》不錄");
});

it("keeps 這's old welcoming sense and phonetic distinct from its modern demonstrative use", () => {
  const clues = structureClues("這", ["辶", "言"]);
  expect(clues?.sound?.componentIndexes).toEqual([1]);
  expect(clues?.meaning?.componentIndexes).toEqual([0]);
  expect(clues?.sound?.explanation).toContain("魚變切");
  expect(clues?.meaning?.explanation).toContain("指示詞義");
});

it("distinguishes 般's boat-and-pole seal account from its earlier basin account", () => {
  const clues = structureClues("般", ["舟", "殳"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("使船旋轉");
  expect(clues?.meaning?.explanation).toContain("凡象盥盤");
  expect(clues?.meaning?.sources).toHaveLength(2);
});

it("uses 枴's whole right-hand form and explains the historical 另 spelling", () => {
  const clues = structureClues("枴", ["木", "叧"]);
  expect(clues?.sound?.componentIndexes).toEqual([1]);
  expect(clues?.meaning?.componentIndexes).toEqual([0]);
  expect(clues?.sound?.explanation).toContain("誇寡反");
  expect(clues?.sound?.explanation).toContain("不是照現代另字");
  expect(clues?.meaning?.explanation).toContain("支撐行走");
});

it("attributes 肅's cautious-writing account and preserves the alternative 聿 phonetic account", () => {
  const clues = structureClues("肅", []);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("篆形會意說");
  expect(clues?.meaning?.explanation).toContain("聿聲說");
  expect(clues?.meaning?.sources).toHaveLength(2);
});

it("maps 徵's split 微 phonetic around the separate middle 𡈼 and rejects 王", () => {
  const glyph = candidateMaster("徵", { rows: new Map(), words: new Map(), ids: {} });
  expect(glyph.components).toEqual(["彳", "山一", "𡈼", "攵"]);
  expect(analyzeStructure(glyph).map(part => part.position)).toEqual(["左側", "中上", "中下", "右側"]);
  const clues = structureClues("徵", glyph.components);
  expect(clues?.sound?.componentIndexes).toEqual([0, 1, 3]);
  expect(clues?.meaning?.componentIndexes).toEqual([2]);
  expect(clues?.meaning?.explanation).toContain("不是王");
});

it("limits 暴's drying-rice account to 㬥 and avoids interpreting the modern bottom as water", () => {
  const clues = structureClues("暴", ["日", "㳟"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("不同篆字");
  expect(clues?.meaning?.explanation).toContain("不把形近水");
  expect(clues?.meaning?.explanation).toContain("麃聲");
});

it("attributes 款's ideographic account without treating 士示 literally or hiding the phonetic alternative", () => {
  const clues = structureClues("款", ["士示", "欠"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("不是士人、祭祀");
  expect(clues?.meaning?.explanation).toContain("省聲分析");
  expect(clues?.meaning?.sources).toHaveLength(3);
});

it.each([['尺', [], '不從今字任圈一筆'], ['昆', ['日', '比'], '構義不明']])("attributes %s's traditional account while preserving uncertainty", (glyph, components, phrase) => {
  const clues = structureClues(glyph as string, components as string[]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain(phrase);
  expect(clues?.meaning?.sources).toHaveLength(2);
});

it("does not invent a phonetic or a three-mouth business story for 闆", () => {
  const clues = structureClues("闆", ["門", "品"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.sound?.explanation).toContain("未指定");
  expect(clues?.meaning?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("古書未見");
  expect(clues?.meaning?.sources?.[0].url).toContain("humanum.arts.cuhk.edu.hk");
});

it.each([['民', '郭沫若', '氏'], ['由', '本義未有定論', '田']])("keeps %s's attributed or unresolved origins separate from radical guesses", (glyph, wording, radical) => {
  const clues = structureClues(glyph, []);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain(wording);
  expect(clues?.meaning?.explanation).toContain(radical);
  expect(clues?.meaning?.sources?.[0].url).toContain("humanum.arts.cuhk.edu.hk");
});

it("keeps 牠's modern animal-pronoun use distinct from an unverified phonetic history", () => {
  const clues = structureClues("牠", ["牛", "也"]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.sound?.explanation).toContain("沒有指定");
  expect(clues?.meaning?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("第三人稱代詞");
  expect(clues?.meaning?.explanation).toContain("㸰");
});

it.each([['奧', ['丿冂釆', '大'], '徐鉉', '宀'], ['彙', ['彑', '冖', '果'], '胃', '刺蝟']])("does not label modern %s parts as an unverified ancient phonetic", (glyph, parts, soundText, meaningText) => {
  const clues = structureClues(glyph as string, parts as string[]);
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.componentIndexes).toEqual([]);
  expect(clues?.sound?.explanation).toContain(soundText);
  expect(clues?.meaning?.explanation).toContain(meaningText);
});

it("uses 票's attributed seal account without calling its modern 示 a ritual semantic", () => {
  const clues = structureClues("票", ["覀", "示"]);
  expect(clues?.sound?.title).toBe("一種字源解讀：會意");
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("火誤寫作示");
  expect(clues?.meaning?.explanation).toContain("不是祭祀義");
  expect(clues?.meaning?.sources).toHaveLength(2);
});

it("attributes 盈's traditional 夃-and-皿 account and retains the unresolved-origin caveat", () => {
  const clues = structureClues("盈", ["夃", "皿"]);
  expect(clues?.sound?.title).toBe("一種字源解讀：會意");
  expect(clues?.sound?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.componentIndexes).toEqual([]);
  expect(clues?.meaning?.explanation).toContain("徐鉉及段玉裁");
  expect(clues?.meaning?.explanation).toContain("從夃的原因未明");
  expect(clues?.meaning?.sources).toHaveLength(2);
});
