import soundAudit from "./soundClueAudit.json";
import verified from "./verifiedSoundClues.json";
export type StructureClueKind = "shape" | "sound" | "meaning";

export interface StructureClue {
  title: string;
  explanation: string;
  componentIndexes: number[];
  sources?: { title: string; url: string }[];
}

export interface CharacterStructureClues {
  sound?: StructureClue;
  meaning?: StructureClue;
  synthesis?: string;
}

// 教學用線索須逐字策展；不能只看現代字形便自動推論字源。
const STRUCTURE_CLUES: Partial<Record<string, CharacterStructureClues>> = {
  感: {
    sound: {
      title: "「咸」提供聲音線索",
      explanation: "「咸」是聲符；古今讀音已經變化，所以現在不會完全同音。",
      componentIndexes: [0],
    },
    meaning: {
      title: "「心」提供意義線索",
      explanation: "心部提示這個字和內心的感受、感覺有關。",
      componentIndexes: [1],
    },
    synthesis:
      "把聲音線索和心部的意義線索合起來，幫助記住「感」和內心感受有關。",
  },
  謝: {
    sound: {
      title: "「射」提供聲音線索",
      explanation:
        "第一層的「身」和「寸」合成「射」，是聲符；古今讀音已有變化。",
      componentIndexes: [1, 2],
    },
    meaning: {
      title: "「言」提供意義線索",
      explanation: "言部提示「謝」和說話、用言語表達有關。",
      componentIndexes: [0],
    },
    synthesis: "言部提示用言語表達；搭配聲符「射」，組成「謝」。",
  },
  銀: {
    sound: {
      title: "「艮」提供聲音線索",
      explanation: "「艮」是聲符；古今讀音已經變化，現在讀音不完全相同。",
      componentIndexes: [1],
    },
    meaning: {
      title: "金字旁提供意義線索",
      explanation: "金字旁提示「銀」和金屬有關。",
      componentIndexes: [0],
    },
    synthesis: "金字旁提示金屬類別，「艮」提示聲音，合起來幫助認識「銀」。",
  },
  觀: {
    sound: {
      title: "「雚」提供聲音線索",
      explanation: "「雚」是聲符，提供讀音的線索。",
      componentIndexes: [0],
    },
    meaning: {
      title: "「見」提供意義線索",
      explanation: "見部提示「觀」和觀看、看見有關。",
      componentIndexes: [1],
    },
    synthesis: "見部提示觀看的意思，「雚」提示聲音，合起來認識「觀」。",
  },
  察: {
    sound: {
      title: "「祭」提供聲音線索",
      explanation: "「祭」是聲符；古今讀音已有變化，所以現在不完全同音。",
      componentIndexes: [1],
    },
    meaning: {
      title: "「宀」提供意義線索",
      explanation: "宀部是這個字的意義線索之一；完整字源仍要配合字典說明。",
      componentIndexes: [0],
    },
    synthesis: "「宀」和聲符「祭」共同構成「察」；字義需要配合語詞一起理解。",
  },
};

const SEMANTIC_CATEGORIES: Record<string, string> = {
  人: "人、身分或人的行為", 亻: "人、身分或人的行為",
  心: "內心、感受或思想", 忄: "內心、感受或思想",
  手: "手的動作或操作", 扌: "手的動作或操作",
  水: "水、液體或水的狀態", 氵: "水、液體或水的狀態",
  火: "火、熱或燃燒", 灬: "火、熱或燃燒",
  木: "樹木、木材或木製事物", 艸: "草木或植物", 艹: "草木或植物",
  言: "說話、言語或表達", 訁: "說話、言語或表達",
  口: "嘴、發聲或口部動作", 足: "腳、行走或動作", 走: "行走或移動",
  玉: "玉石、寶石或相關材料", 王: "玉石、寶石或相關材料",
  金: "金屬、金錢或金屬器物", 釒: "金屬、金錢或金屬器物",
  糸: "絲線、織物或連結", 糹: "絲線、織物或連結",
  衣: "衣服、布料或穿著", 衤: "衣服、布料或穿著",
  石: "石頭、礦物或堅硬材料", 土: "土地、泥土或地面",
  日: "太陽、光亮或時間", 月: "月亮、時間或身體部位",
  肉: "身體、肌肉或器官", 疒: "疾病或身體不適",
  目: "眼睛、觀看或視覺", 耳: "耳朵、聽覺或聆聽",
  虫: "昆蟲、動物或生物", 鳥: "鳥類", 魚: "魚類或水生動物",
  犬: "動物或動物行為", 犭: "動物或動物行為",
  馬: "馬匹或與馬相關的事物", 車: "車輛或運輸",
  食: "飲食或食物", 飠: "飲食或食物", 米: "米穀、糧食或細小顆粒",
  貝: "財貨、金錢或交易", 門: "門戶、出入或空間",
  宀: "房屋、遮蓋或室內空間", 广: "房屋或建築空間",
  山: "山地或高起地形", 阜: "山地、臺階或地勢", 阝: "地勢、區域或聚落",
};

function meaningExplanation(component: string) {
  const category = SEMANTIC_CATEGORIES[component];
  return category
    ? `「${component}」是形符，提示這個字的意義和${category}有關；完整字義仍要配合字典與語詞理解。`
    : `「${component}」是形符，提供字義類別的線索；完整字義仍要配合字典與語詞理解。`;
}

export function structureClues(character: string, components: readonly string[] = []): CharacterStructureClues | null {
  const entry = (verified.entries as Partial<Record<string, { component: string; componentIndexes: number[]; explanation: string }>>)[character];
  const known = STRUCTURE_CLUES[character];
  const row = (soundAudit as Record<string, { component?: string; semanticComponent?: string }>)[character];
  const semanticIndex = row?.semanticComponent ? components.indexOf(row.semanticComponent) : -1;
  const sourceUrl = new URL("https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php");
  sourceUrl.searchParams.set("word", character);
  const generatedMeaning = row?.semanticComponent ? {
    title: `「${row.semanticComponent}」提供意義線索`,
    explanation: meaningExplanation(row.semanticComponent),
    componentIndexes: semanticIndex < 0 ? [] : [semanticIndex],
    sources: [{ title: "香港中文大學漢語多功能字庫", url: sourceUrl.href }],
  } : undefined;
  if (!entry) {
    if (known || !row?.component) return generatedMeaning ? { ...known, meaning: known?.meaning || generatedMeaning } : known || null;
    const index = components.indexOf(row.component);
    return { sound: {
      title: `「${row.component}」提供聲音線索`,
      explanation: `字庫記載「${row.component}」是「${character}」的聲符。`,
      componentIndexes: index < 0 ? [] : [index],
      sources: [{ title: "香港中文大學漢語多功能字庫", url: sourceUrl.href }],
    }, meaning: generatedMeaning };
  }
  return {
    ...STRUCTURE_CLUES[character],
    sound: { ...entry, title: `「${entry.component}」提供聲音線索`, sources: verified.sources },
    meaning: character === "璃" ? {
      title: "玉字旁提供意義線索",
      explanation: "左側的「王」在這裡是玉字旁。從字源看，它提示「璃」與玉石有關，例如「琉璃」的古義之一是青色寶石。",
      componentIndexes: components.flatMap((part, index) => part === "王" || part === "玉" ? [index] : []),
      sources: verified.sources,
    } : STRUCTURE_CLUES[character]?.meaning || generatedMeaning,
  };
}
