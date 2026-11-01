import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { authenticateAdmin } from "./admin-auth.mjs";
import { protectSettings, unprotectSettings } from "./secret-store.mjs";
import {
  PROVIDERS,
  providerSettings,
  publicSettings,
  requestPayload,
} from "./providers.mjs";

const ORIGIN = "http://127.0.0.1:5173";
export const validateSettings = providerSettings;
export function validateAnalysis(value, character) {
  if (
    value?.character !== character ||
    !["horizontal", "vertical", "triple", "whole"].includes(value.layout)
  )
    throw new Error("AI 回傳字形或結構格式不符");
  const count =
    value.layout === "whole" ? 1 : value.layout === "triple" ? 3 : 2;
  if (
    !Array.isArray(value.parts) ||
    value.parts.length !== count ||
    !value.parts.every(
      (p) => typeof p === "string" && p.length > 0 && Array.from(p).length <= 8,
    )
  )
    throw new Error("AI 部件資料不符");
  if (
    !Array.isArray(value.weights) ||
    value.weights.length !== count ||
    !value.weights.every((n) => Number.isFinite(n) && n >= 5 && n <= 100) ||
    Math.abs(value.weights.reduce((a, b) => a + b, 0) - 100) > 0.5
  )
    throw new Error("AI 比例須為總和 100 的有效數值");
  if (typeof value.reason !== "string" || value.reason.length > 1000)
    throw new Error("AI 說明格式不符");
  return {
    character,
    layout: value.layout,
    parts: value.parts,
    weights: value.weights,
    reason: value.reason,
    status: "candidate",
    reviewed: false,
  };
}
async function jsonBody(req) {
  let size = 0,
    chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("請求資料過大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function createStructureServer({
  authenticate = authenticateAdmin,
  configFile = resolve(".local/structure-api.json"),
  fetchProvider = fetch,
  protect = protectSettings,
  unprotect = unprotectSettings,
} = {}) {
  const unlocks = new Map();
  async function persist(data) {
    await mkdir(dirname(configFile), { recursive: true });
    await writeFile(configFile, JSON.stringify(await protect(data)), {
      encoding: "utf8",
      mode: 0o600,
    });
  }
  async function store() {
    try {
      let value = JSON.parse(await readFile(configFile, "utf8"));
      if (value.version === 3) value = await unprotect(value);
      else {
        await persist(value);
      }
      if (value.version === 2) return value;
      const legacy = validateSettings(value);
      return {
        version: 2,
        selected: legacy.provider,
        profiles: {
          [legacy.provider]: { ...legacy, apiKey: value.apiKey || "" },
        },
      };
    } catch (error) {
      if (error.code !== "ENOENT")
        throw new Error("後端設定檔無效，請重新儲存設定");
      return { version: 2, selected: "deepseek", profiles: {} };
    }
  }
  async function settings(provider) {
    const data = await store();
    const id = provider || data.selected;
    const preset = PROVIDERS[id];
    if (!preset) throw new Error("API 服務不支援");
    const profile = data.profiles[id] || {
      ...preset,
      provider: id,
      enabled: false,
    };
    return {
      ...validateSettings(profile),
      apiKey: profile.apiKey || "",
      lastTest: profile.lastTest || null,
    };
  }
  async function invoke(config, prompt, image) {
    const endpoint =
      config.endpoint +
      (config.provider === "ollama" ? "/api/chat" : "/chat/completions");
    const response = await fetchProvider(endpoint, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(120000),
      headers: {
        "Content-Type": "application/json",
        ...(config.provider === "ollama"
          ? {}
          : { Authorization: "Bearer " + config.apiKey }),
      },
      body: JSON.stringify(requestPayload(config, prompt, image)),
    });
    if (!response.ok)
      throw new Error(
        `API 回應 HTTP ${response.status}；請核對金鑰、額度、模型與服務區域`,
      );
    const value = await response.json();
    const content =
      config.provider === "ollama"
        ? value.message?.content
        : value.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim())
      throw new Error("API 未回傳文字結果");
    return content;
  }
  return http.createServer(async (req, res) => {
    const allowed = req.headers.origin === ORIGIN;
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (allowed)
      Object.assign(headers, {
        "Access-Control-Allow-Origin": ORIGIN,
        Vary: "Origin",
        "Access-Control-Allow-Headers":
          "Content-Type, X-Notebook-Request, X-Notebook-Unlock, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      });
    const send = (status, data) => {
      res.writeHead(status, headers);
      res.end(JSON.stringify(data));
    };
    if (
      !["127.0.0.1:5174", "localhost:5174"].includes(req.headers.host) &&
      !req.headers.host?.startsWith("127.0.0.1:")
    )
      return send(403, { error: "不允許的主機" });
    if (req.method === "OPTIONS") {
      if (!allowed) return send(403, { error: "不允許的來源" });
      return send(204, {});
    }
    if (
      req.method === "POST" &&
      (!allowed || req.headers["x-notebook-request"] !== "structure-settings")
    )
      return send(403, { error: "只允許本機 WebApp 操作" });
    try {
      let adminUid;
      try {
        adminUid = await authenticate(req);
      } catch {
        return send(401, { error: "請以管理者 Google 帳號重新登入" });
      }
      const url = new URL(req.url, "http://127.0.0.1");
      const token = req.headers["x-notebook-unlock"];
      const unlocked =
        typeof token === "string" &&
        unlocks.get(token)?.uid === adminUid &&
        unlocks.get(token).expires > Date.now();
      if (unlocked)
        unlocks.set(token, {
          uid: adminUid,
          expires: Date.now() + 15 * 60 * 1000,
        });
      const lockedSettings = () => ({
        provider: "deepseek",
        ...PROVIDERS.deepseek,
        enabled: false,
        hasApiKey: false,
        locked: true,
        service: "hanzi-structure-api",
        providers: PROVIDERS,
      });
      if (url.pathname === "/api/structure/unlock" && req.method === "POST") {
        // Validate decryptability before issuing an editing session.
        await store();
        const unlockToken = randomBytes(32).toString("hex");
        unlocks.set(unlockToken, {
          uid: adminUid,
          expires: Date.now() + 15 * 60 * 1000,
        });
        return send(200, {
          unlockToken,
          ...publicSettings(await settings()),
          locked: false,
        });
      }
      if (url.pathname === "/api/structure/lock" && req.method === "POST") {
        unlocks.delete(token);
        return send(200, lockedSettings());
      }
      if (
        url.pathname === "/api/structure/settings" &&
        req.method === "GET" &&
        !unlocked
      )
        return send(200, {
          ...publicSettings(await settings(url.searchParams.get("provider"))),
          locked: true,
        });
      if (
        req.method === "POST" &&
        !unlocked &&
        url.pathname !== "/api/structure/test"
      )
        return send(423, { error: "設定已鎖定，請先 Unlock" });
      if (url.pathname === "/api/structure/settings" && req.method === "GET")
        return send(200, {
          ...publicSettings(await settings(url.searchParams.get("provider"))),
          locked: false,
        });
      if (req.url === "/api/structure/settings" && req.method === "POST") {
        const input = await jsonBody(req);
        const config = validateSettings(input);
        const data = await store();
        const previous = data.profiles[config.provider];
        const apiKey = input.clearApiKey
          ? ""
          : input.apiKey?.trim() || previous?.apiKey || "";
        data.profiles[config.provider] = { ...config, apiKey, lastTest: null };
        data.selected = config.provider;
        await persist(data);
        unlocks.delete(token);
        return send(200, {
          ...lockedSettings(),
          provider: config.provider,
          hasApiKey: !!apiKey,
          saved: true,
        });
      }
      if (req.url === "/api/structure/test" && req.method === "POST") {
        const input = await jsonBody(req);
        const config = await settings(input.provider);
        if (!config.model || (config.provider !== "ollama" && !config.apiKey))
          return send(409, { error: "請先儲存模型與 API Key" });
        try {
          await invoke(config, "Reply only OK.");
          const checkedAt = new Date().toISOString();
          const data = await store();
          const current = data.profiles[config.provider];
          if (
            current &&
            current.model === config.model &&
            current.endpoint === config.endpoint &&
            current.apiKey === config.apiKey
          ) {
            current.lastTest = { ok: true, checkedAt, model: config.model };
            await persist(data);
          }
          return send(200, {
            ok: true,
            provider: config.provider,
            model: config.model,
            checkedAt,
            message: "文字 API 連線成功；圖像分析仍需另行測試",
          });
        } catch (error) {
          return send(502, {
            error: error.message?.startsWith("API ")
              ? error.message
              : "API 連線失敗或逾時",
          });
        }
      }
      if (req.url === "/api/structure/analyze" && req.method === "POST") {
        const data = await jsonBody(req);
        const config = await settings(data.provider);
        if (!config.enabled || !config.model)
          return send(409, { error: "尚未啟用 AI 或未設定已安裝的視覺模型" });
        if (config.provider !== "ollama" && !config.apiKey)
          return send(409, { error: "尚未儲存 API Key" });
        if (
          !config.vision ||
          (config.provider === "qwen" && config.model === "qwen-plus")
        )
          return send(409, {
            error:
              "目前模型未啟用圖像分析；qwen-plus 可測試文字 API，字形分析需改用可用的視覺模型",
          });
        if (
          typeof data.character !== "string" ||
          !/^\p{Script=Han}$/u.test(data.character) ||
          typeof data.image !== "string" ||
          !/^iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(data.image)
        )
          return send(400, { error: "需要單一漢字與 PNG 字形影像" });
        let content;
        try {
          content = await invoke(
            config,
            `分析圖片中繁體字「${data.character}」的可見部件位置，維持完整字不變。請回傳 JSON：character, layout(horizontal/vertical/triple/whole), parts(依空間順序), weights(各區寬度或高度百分比，合計100), reason(繁體中文)。左右結構依字形可見寬度判斷，不要預設一半一半。比例僅為候選，不得自稱教育部標準。若包圍或重疊無法用上述分區表示，回 whole 並說明限制。不要輸出其他文字。`,
            data.image,
          );
        } catch (error) {
          return send(502, {
            error: error.message?.startsWith("API ")
              ? error.message
              : "API 無法連線或分析逾時",
          });
        }
        const analysis = validateAnalysis(
          JSON.parse(
            content
              .replace(/<think>[\s\S]*?<\/think>/g, "")
              .trim()
              .replace(/^```(?:json)?\s*/, "")
              .replace(/\s*```$/, ""),
          ),
          data.character,
        );
        return send(200, {
          ...analysis,
          model: config.model,
          generatedAt: new Date().toISOString(),
        });
      }
      send(404, { error: "找不到 API" });
    } catch (error) {
      send(400, {
        error:
          error.message?.includes("AI") ||
          error.message?.includes("設定") ||
          error.message?.includes("模型") ||
          error.message?.includes("API")
            ? error.message
            : "輸入或模型回覆格式無效",
      });
    }
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  createStructureServer().listen(5174, "127.0.0.1", () =>
    console.log("Structure API ready on 127.0.0.1:5174"),
  );
}
