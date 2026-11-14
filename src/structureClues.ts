export type StructureClueKind = "shape" | "sound" | "meaning";

export interface StructureClue {
  title: string;
  explanation: string;
  componentIndexes: number[];
}

export interface CharacterStructureClues {
  sound?: StructureClue;
  meaning?: StructureClue;
  synthesis?: string;
}

// 教學用線索須逐字策展；不能只看現代字形便自動推論字源。
const STRUCTURE_CLUES: Record<string, CharacterStructureClues> = {
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

export function structureClues(character: string) {
  return STRUCTURE_CLUES[character] || null;
}
