import type {
  CharacterMaster,
  PhraseContext,
  VocabularyEntry,
  Collection,
  Source,
} from "./model";
import { SCENES } from "./model";
export const DATA_VERSION = "2026-11-01.1";
export const DICTIONARY: Source = {
  title: "教育部《國語辭典簡編本》",
  url: "https://dict.concised.moe.edu.tw/",
};
export const STROKES: Source = {
  title: "教育部《國字標準字體筆順學習網》",
  url: "https://stroke-order.learningweb.moe.edu.tw/",
};
const source = (id: number): Source => ({
  title: DICTIONARY.title,
  url: `https://dict.concised.moe.edu.tw/dictView.jsp?ID=${id}&la=0&powerMode=0`,
});
// 語境讀音與詞義參考教育部資料；白話解說、例句為本專案編寫，未經教師審定。
export const PHRASES: Record<string, PhraseContext> = {
  感謝: {
    phrase: "感謝",
    readings: ["ㄍㄢˇ", "ㄒㄧㄝˋ"],
    meanings: ["心裡感受到別人的好意。", "向幫助自己的人表達謝意。"],
    simple: [
      "別人幫了你，你把這份好意放在心上。",
      "有人幫忙時，向他說一聲謝謝。",
    ],
    explanation: "受到別人的幫助，用言語或行動表達謝意。",
    source: source(16434),
  },
  謝謝: {
    phrase: "謝謝",
    readings: ["ㄒㄧㄝˋ", "˙ㄒㄧㄝ"],
    meanings: ["表達感激。", "和前面的「謝」合成表達感激的話。"],
    simple: ["有人幫你，對他說謝謝。", "兩個字一起說，是向別人表達感激。"],
    explanation: "向別人表達感激時說的話。",
    source: DICTIONARY,
  },
  銀行: {
    phrase: "銀行",
    readings: ["ㄧㄣˊ", "ㄏㄤˊ"],
    meanings: ["與金錢、金融有關。", "營業的機構；這裡不讀作「ㄒㄧㄥˊ」。"],
    simple: ["在這個詞裡，和錢有關。", "在這個詞裡，指辦理存款等業務的機構。"],
    explanation: "提供存款、放款等金融服務的機構。",
    source: {
      title: STROKES.title + "・行",
      url: "https://stroke-order.learningweb.moe.edu.tw/dictMean.jsp?ID=34892",
    },
  },
  行走: {
    phrase: "行走",
    readings: ["ㄒㄧㄥˊ", "ㄗㄡˇ"],
    meanings: ["走路、移動；這裡不讀作「ㄏㄤˊ」。", "用腳步移動。"],
    simple: ["用腳走路。", "一步一步往前走。"],
    explanation: "用腳步移動，也就是走路。",
    source: {
      title: STROKES.title + "・行",
      url: "https://stroke-order.learningweb.moe.edu.tw/dictMean.jsp?ID=34892",
    },
  },
  觀察: {
    phrase: "觀察",
    readings: ["ㄍㄨㄢ", "ㄔㄚˊ"],
    meanings: ["仔細看。", "仔細查看、了解情況。"],
    simple: ["用眼睛仔細看一看。", "留意細節，看看有什麼發現。"],
    explanation: "仔細查看，留意事物的樣子與變化。",
    source: DICTIONARY,
  },
};
const master = (
  character: string,
  radical: string,
  structure: string,
  components: string[],
  layout: CharacterMaster["layout"],
): CharacterMaster => ({
  character,
  radical,
  structure,
  components,
  layout,
  verificationStatus: "partial",
  sources: [STROKES, DICTIONARY],
  version: DATA_VERSION,
});
export const CHARACTERS: Record<string, CharacterMaster> = {
  感: master("感", "心", "上下結構", ["咸", "心"], "vertical"),
  謝: master("謝", "言", "左中右結構", ["言", "身", "寸"], "triple"),
  行: master("行", "行", "左右結構", ["彳", "亍"], "horizontal"),
  銀: master("銀", "金", "左右結構", ["金字旁", "艮"], "horizontal"),
  走: master("走", "走", "獨體字", [], "whole"),
  觀: master("觀", "見", "左右結構", ["雚", "見"], "horizontal"),
  察: master("察", "宀", "上下結構", ["宀", "祭"], "vertical"),
};
type WordRow = [string, string, string, string, string?];
const wordRows: Record<string, WordRow[]> = {
  感: [
    [
      "感謝",
      "ㄍㄢˇ ㄒㄧㄝˋ",
      "表達感激的心意。",
      "我寫了一張卡片，感謝老師的照顧。",
      "感激",
    ],
    [
      "感動",
      "ㄍㄢˇ ㄉㄨㄥˋ",
      "因為一件事，心情受到觸動。",
      "看見大家一起幫忙，我很感動。",
      "心情",
    ],
    [
      "感覺",
      "ㄍㄢˇ ㄐㄩㄝˊ",
      "身體或心裡感受到的情形。",
      "微風吹來，感覺很舒服。",
      "感受",
    ],
    [
      "感想",
      "ㄍㄢˇ ㄒㄧㄤˇ",
      "接觸一件事後產生的想法。",
      "讀完這本書，請分享你的感想。",
      "想法",
    ],
    [
      "感情",
      "ㄍㄢˇ ㄑㄧㄥˊ",
      "人與人之間的情誼。",
      "我們一起長大，感情很好。",
      "情誼",
    ],
    [
      "感恩",
      "ㄍㄢˇ ㄣ",
      "記得並感激別人的恩惠。",
      "我用行動表達對家人的感恩。",
      "感激",
    ],
  ],
  謝: [
    [
      "謝謝",
      "ㄒㄧㄝˋ ˙ㄒㄧㄝ",
      "向別人表達感激。",
      "收到同學的幫忙，我說了一聲謝謝。",
      "感激",
    ],
    [
      "感謝",
      "ㄍㄢˇ ㄒㄧㄝˋ",
      "受到幫助而表示謝意。",
      "我感謝家人每天陪伴我。",
      "感激",
    ],
    [
      "道謝",
      "ㄉㄠˋ ㄒㄧㄝˋ",
      "用言語表達感激。",
      "借到雨傘後，她向同學道謝。",
      "感激",
    ],
    ["謝意", "ㄒㄧㄝˋ ㄧˋ", "感激的心意。", "這束花代表我們的謝意。", "感激"],
    [
      "謝絕",
      "ㄒㄧㄝˋ ㄐㄩㄝˊ",
      "有禮貌地拒絕。",
      "他謝絕邀請，留在家中休息。",
      "推辭",
    ],
    [
      "凋謝",
      "ㄉㄧㄠ ㄒㄧㄝˋ",
      "花朵枯萎、掉落。",
      "春天過後，有些花漸漸凋謝。",
      "枯落",
    ],
  ],
  行: [
    [
      "行走",
      "ㄒㄧㄥˊ ㄗㄡˇ",
      "走路。",
      "我們沿著步道慢慢行走。",
      "ㄒㄧㄥˊ・走路",
    ],
    [
      "行動",
      "ㄒㄧㄥˊ ㄉㄨㄥˋ",
      "採取實際的作為。",
      "愛護環境，要從行動開始。",
      "ㄒㄧㄥˊ・做事",
    ],
    [
      "旅行",
      "ㄌㄩˇ ㄒㄧㄥˊ",
      "到別的地方遊覽。",
      "暑假時，我們搭火車旅行。",
      "ㄒㄧㄥˊ・外出",
    ],
    [
      "銀行",
      "ㄧㄣˊ ㄏㄤˊ",
      "辦理存款等金融業務的機構。",
      "爸爸到銀行辦理存款。",
      "ㄏㄤˊ・機構",
    ],
    [
      "行業",
      "ㄏㄤˊ ㄧㄝˋ",
      "職業的種類。",
      "不同的行業都有人努力工作。",
      "ㄏㄤˊ・職業",
    ],
    ["一行", "ㄧˋ ㄏㄤˊ", "一列文字。", "我在紙上寫了一行字。", "ㄏㄤˊ・行列"],
  ],
  銀: [
    [
      "銀行",
      "ㄧㄣˊ ㄏㄤˊ",
      "辦理存款等金融業務的機構。",
      "媽媽到銀行開戶。",
      "金融",
    ],
    [
      "銀色",
      "ㄧㄣˊ ㄙㄜˋ",
      "像銀一樣的顏色。",
      "月光在水面留下銀色的光。",
      "顏色",
    ],
    [
      "銀河",
      "ㄧㄣˊ ㄏㄜˊ",
      "夜空中像光帶的星群。",
      "我們在山上欣賞銀河。",
      "星空",
    ],
  ],
  走: [
    ["行走", "ㄒㄧㄥˊ ㄗㄡˇ", "走路。", "請在人行道上行走。"],
    ["走路", "ㄗㄡˇ ㄌㄨˋ", "用雙腳移動。", "我每天走路上學。"],
    ["走廊", "ㄗㄡˇ ㄌㄤˊ", "連接房間或教室的通道。", "下課時不要在走廊奔跑。"],
  ],
  觀: [
    ["觀察", "ㄍㄨㄢ ㄔㄚˊ", "仔細查看。", "我們觀察葉子的形狀。"],
    ["參觀", "ㄘㄢ ㄍㄨㄢ", "實地觀看、了解。", "全班一起參觀博物館。"],
    ["觀看", "ㄍㄨㄢ ㄎㄢˋ", "看、觀賞。", "我們安靜地觀看表演。"],
  ],
  察: [
    ["觀察", "ㄍㄨㄢ ㄔㄚˊ", "仔細查看。", "觀察天空，可以發現雲的變化。"],
    ["察覺", "ㄔㄚˊ ㄐㄩㄝˊ", "發現、感覺到。", "我察覺教室裡變安靜了。"],
    ["考察", "ㄎㄠˇ ㄔㄚˊ", "實地觀察、了解。", "研究人員到河邊考察水質。"],
  ],
};
export const VOCABULARY: Record<string, VocabularyEntry[]> = Object.fromEntries(
  Object.entries(wordRows).map(([c, rows]) => [
    c,
    rows.map(([word, reading, meaning, example, sense]) => ({
      word,
      reading,
      meaning,
      example,
      sense: sense || "常用義",
      reviewStatus: "editorial",
      source: DICTIONARY,
    })),
  ]),
);
export function buildCollection(
  phrase: string,
  positions: number[],
): Collection {
  const context = PHRASES[phrase];
  const chars = Array.from(phrase);
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    sourcePhrase: phrase,
    selectedCharacters: positions.map((i) => chars[i]),
    cards: positions.map((position) => {
      const character = chars[position];
      return {
        id: crypto.randomUUID(),
        character,
        position,
        reading: context?.readings[position] || "讀音待核對",
        meaning:
          context?.meanings[position] ||
          "這個語詞中的字義目前無已核對資料，請與老師一起查字典。",
        simple:
          context?.simple[position] || "先和老師確認這個字在語詞裡的意思。",
        master: CHARACTERS[character] || {
          character,
          radical: "待核對",
          structure: "目前無已核對資料",
          components: [],
          layout: "whole",
          verificationStatus: "unavailable",
          sources: [DICTIONARY, STROKES],
          version: DATA_VERSION,
        },
        vocabulary: VOCABULARY[character] || [],
        rememberedWords: [],
        visitedScenes: [0],
        source: context?.source || null,
      };
    }),
    createdAt: now,
    updatedAt: now,
    reviewState: "practice",
    dataVersion: DATA_VERSION,
    scenes: SCENES,
  };
}
