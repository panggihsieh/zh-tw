import { expect, it } from "vitest";
import { apiTestState, type ApiSnapshot } from "./apiSettingsState";
const settings: ApiSnapshot = {
  provider: "deepseek",
  endpoint: "https://api.deepseek.com",
  model: "example",
  enabled: true,
  vision: false,
  hasApiKey: false,
};
it("requires a saved cloud credential rather than just a preset model name", () => {
  expect(apiTestState(settings, settings, "", true).canTest).toBe(false);
  expect(apiTestState(settings, settings, "draft-only", true).canTest).toBe(
    false,
  );
});
it("does not test older server settings when the current draft was changed", () => {
  const saved = { ...settings, hasApiKey: true };
  expect(
    apiTestState({ ...saved, model: "changed-model" }, saved, "", true).canTest,
  ).toBe(false);
  expect(apiTestState(saved, saved, "replacement", true).dirty).toBe(true);
  expect(apiTestState(saved, saved, "", true).canTest).toBe(true);
});
it("requires an available backend and a saved model, including local Ollama", () => {
  const local = { ...settings, provider: "ollama" };
  expect(apiTestState(local, local, "", true).canTest).toBe(true);
  expect(apiTestState(local, local, "", false).canTest).toBe(false);
  expect(
    apiTestState({ ...local, model: "" }, { ...local, model: "" }, "", true)
      .canTest,
  ).toBe(false);
});
