// 自動選詞排除重複字，例如謝謝、看看、高高興興；手動輸入不受限。
export function hasRepeatedCharacter(word: string): boolean {
  const characters = Array.from(word);
  return new Set(characters).size !== characters.length;
}
