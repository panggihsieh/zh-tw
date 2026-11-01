export interface ApiSnapshot {
  provider: string;
  endpoint: string;
  model: string;
  vision: boolean;
  enabled: boolean;
  hasApiKey: boolean;
}
export function apiTestState(
  current: ApiSnapshot,
  saved: ApiSnapshot | null,
  draftKey: string,
  available: boolean,
) {
  const dirty =
    !!draftKey.trim() ||
    (!!saved &&
      (["provider", "endpoint", "model", "vision", "enabled"] as const).some(
        (key) => current[key] !== saved[key],
      ));
  const reason = !available
    ? "請先連線 AI 後端。"
    : dirty
      ? "設定尚未儲存，請先儲存，再測試連線。"
      : !saved?.model.trim() ||
          (saved.provider !== "ollama" && !saved.hasApiKey)
        ? "尚未儲存模型與金鑰，請先解鎖並完成設定。"
        : "";
  return { dirty, reason, canTest: !reason };
}
