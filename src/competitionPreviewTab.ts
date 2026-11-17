import type { CompetitionRoom } from "./competitionApi";

const previewKey = "competition-student-preview";

export function openCompetitionPreview(room: CompetitionRoom) {
  sessionStorage.setItem(previewKey, JSON.stringify(room));
  try {
    // A new tab with an opener receives a copy of this tab's session storage.
    if (!window.open("?view=competition-preview", "_blank")) {
      throw new Error("瀏覽器封鎖了新分頁，請允許此網站開啟彈出式視窗後再試。");
    }
  } finally {
    sessionStorage.removeItem(previewKey);
  }
}

export function readCompetitionPreview(): CompetitionRoom | null {
  try {
    return JSON.parse(sessionStorage.getItem(previewKey) ?? "null");
  } catch {
    return null;
  }
}
