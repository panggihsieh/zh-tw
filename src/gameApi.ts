import { cloudServices } from "./cloudSync";
import type { GameSubmission } from "./writingGame";
export async function gameRequest(path: string, body?: unknown) {
  const user = cloudServices().auth.currentUser;
  if (!user) throw Error("請先登入 Google 帳號");
  const response = await fetch(`/api/structure/writing${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
      "X-Notebook-Request": "writing-game",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "作品儲存失敗，草稿仍保留");
  return result;
}
export async function submitGame(work: GameSubmission) {
  return gameRequest("/submissions", work);
}
export interface WritingAssignment {id:string;title:string;className:string;lesson:string;characters:string[];createdAt:string;submitted?:boolean}
export async function writingAssignments(){return gameRequest("/assignments") as Promise<{items:WritingAssignment[]}>;}
