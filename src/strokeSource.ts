import characterIds from "./data/moe-characters.json";
const available = new Set<number>(characterIds);
export const MOE_RESOURCE_URL =
  "https://stroke-order.learningweb.moe.edu.tw/resource.jsp?ID=1";
export const MOE_LICENSE_URL =
  "https://stroke-order.learningweb.moe.edu.tw/page.jsp?ID=52";
export function strokeFrameUrl(character: string): string | null {
  if (Array.from(character).length !== 1) return null;
  const id = character.codePointAt(0)!;
  return available.has(id)
    ? `https://stroke-order.learningweb.moe.edu.tw/dictFrame.jsp?ID=${id}`
    : null;
}
