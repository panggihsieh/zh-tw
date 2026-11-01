import { useEffect, useState } from "react";
import { apiTestState } from "./apiSettingsState";
const API =
  import.meta.env.VITE_STRUCTURE_API_URL ||
  (["127.0.0.1", "localhost"].includes(window.location.hostname)
    ? "http://127.0.0.1:5174/api/structure"
    : "/api/structure");
interface Settings {
  storageProtection?: string;
  provider: string;
  vision: boolean;
  hasApiKey: boolean;
  providers: Record<
    string,
    {
      name: string;
      endpoint: string;
      model: string;
      vision: boolean;
      docs: string;
    }
  >;
  endpoint: string;
  model: string;
  enabled: boolean;
}
interface Analysis {
  character: string;
  layout: "vertical" | "horizontal" | "triple" | "whole";
  parts: string[];
  weights: number[];
  reason: string;
  model: string;
  reviewed: false;
}
async function request(path: string, data?: unknown, token = "") {
  const { cloudServices } = await import("./cloudSync");
  const user = cloudServices().auth.currentUser;
  if (!user) throw new Error("請先以管理者 Google 帳號登入");
  const idToken = await user.getIdToken();
  const response = await fetch(API + path, {
    method: data ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(token ? { "X-Notebook-Unlock": token } : {}),
      ...(data
        ? {
            "Content-Type": "application/json",
            "X-Notebook-Request": "structure-settings",
          }
        : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(
      data && ["/analyze", "/test"].includes(path) ? 125000 : 15000,
    ),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "API 操作失敗");
  return value;
}
function glyphImage(character: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "#183e32";
  ctx.font = '400px "Noto Serif TC", "Microsoft JhengHei", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(character, 256, 256);
  return canvas.toDataURL("image/png");
}
export default function StructureAiSettings() {
  const [config, setConfig] = useState<Settings>({
    provider: "deepseek",
    vision: true,
    hasApiKey: false,
    providers: {},
    endpoint: "https://api.deepseek.com",
    model: "deepseek-flash",
    enabled: false,
  });
  const [available, setAvailable] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [character, setCharacter] = useState("聯"),
    [result, setResult] = useState<Analysis | null>(null),
    [image, setImage] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savedConfig, setSavedConfig] = useState<Settings | null>(null);
  const testState = apiTestState(config, savedConfig, apiKey, available);
  const [connection, setConnection] = useState<
    "none" | "testing" | "success" | "error"
  >("none");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [locked, setLocked] = useState(true),
    [token, setToken] = useState("");
  async function connect(provider?: string) {
    try {
      const value = await request(
        "/settings" +
          (provider ? "?provider=" + encodeURIComponent(provider) : ""),
        undefined,
        token,
      );
      setConfig(value);
      setSavedConfig(value);
      setConnection(value.lastTest?.ok ? "success" : "none");
      setConnectionMessage(
        value.lastTest?.ok
          ? `連線成功：${value.providers[value.provider]?.name} / ${value.lastTest.model}（上次測試 ${new Date(value.lastTest.checkedAt).toLocaleString()}）`
          : "",
      );
      setLocked(value.locked !== false);
      if (value.locked) setToken("");
      setApiKey("");
      setResult(null);
      setImage("");
      setAvailable(true);
      setMessage(
        `${value.storageProtection === "google-secret-manager" ? "雲端" : "本機"}後端已連線。${value.hasApiKey ? "可測試已儲存的 API 設定。" : "請先按「Unlock 解鎖設定」，填入模型與金鑰後儲存。"}`,
      );
    } catch {
      setAvailable(false);
      setMessage(
        window.location.protocol === "https:"
          ? "雲端 AI 後端連線失敗，請稍後重新連線。"
          : "本機 AI 後端未啟動，請重新執行啟動生字收藏本，或執行 npm run structure-api。",
      );
    }
  }
  useEffect(() => {
    void connect();
  }, []);
  useEffect(() => {
    if (testState.dirty) {
      setConnection("none");
      setConnectionMessage("");
    }
  }, [testState.dirty]);
  return (
    <section
      className="structure-ai-settings"
      id="ai-api-settings"
      aria-label="AI 字形結構 API 後台"
    >
      <h2>AI 字形結構 API 後台</h2>
      <p className="ai-setup-guide">
        ① 解鎖設定　→　② 填入模型與金鑰，按 Save 儲存　→　③ 測試連線
      </p>
      {available &&
        config.storageProtection === "google-secret-manager" &&
        !config.hasApiKey && (
          <p className="ai-setup-note">
            雲端尚未設定金鑰。本機與雲端設定分開，請在這裡重新設定。
          </p>
        )}
      <p>
        <strong>{locked ? "Lock · 設定已鎖定" : "Unlock · 設定可編輯"}</strong>
        。
        {config.storageProtection === "google-secret-manager"
          ? "雲端以 Google Secret Manager 保護設定"
          : "本機以 Windows DPAPI 帳號綁定加密"}
        ；預設鎖定、Save 後自動鎖定。Unlock 為短期編輯鎖，仍需管理者登入。
      </p>
      <button
        className={locked ? "primary" : "secondary"}
        type="button"
        disabled={!available || busy}
        onClick={async () => {
          setBusy(true);
          try {
            if (locked) {
              const value = await request("/unlock", {});
              const { unlockToken, ...settings } = value;
              setToken(unlockToken);
              setConfig(settings);
              setSavedConfig(settings);
              setLocked(false);
              setMessage(
                "已解鎖，可以編輯。填入模型與 API Key 後，請按 Save 儲存。",
              );
            } else {
              await request("/lock", {}, token);
              setToken("");
              setLocked(true);
              setApiKey("");
              if (savedConfig) setConfig(savedConfig);
              setMessage("已 Lock。");
            }
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {locked ? "Unlock 解鎖設定" : "Lock 鎖定設定"}
      </button>
      <p>
        現有結構圖來自資料與教學比例設定，並非 AI 即時判斷。可設定
        DeepSeek、Qwen、MiniMax、Gemini、OpenAI，或本機
        Ollama，分析完整字形並產生待核候選。
      </p>
      <p>
        左側完整字不變；AI 只建議右側結構分區，不自動覆寫教材。雲端 API
        依供應商計費；只有按測試或分析才會呼叫服務。
      </p>
      <div role="status">{message}</div>
      <button
        className="secondary"
        type="button"
        disabled={busy}
        onClick={() => void connect()}
      >
        重新連線 AI 後端
      </button>
      <fieldset disabled={locked || busy} className="ai-api-fields">
        <form
          className="ai-config-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const value = await request(
                "/settings",
                { ...config, apiKey },
                token,
              );
              setApiKey("");
              setToken("");
              setLocked(true);
              const updated = { ...config, hasApiKey: value.hasApiKey };
              setConfig(updated);
              setSavedConfig(updated);
              setMessage(
                "Save 完成：API 已加密保存並自動 Lock。可直接按測試連線。",
              );
              setConnection("none");
              setConnectionMessage("");
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="ai-field-provider">
            AI 服務
            <select
              aria-label="AI API 服務"
              value={config.provider}
              disabled={busy || !available}
              onChange={(e) => void connect(e.target.value)}
            >
              {Object.entries(config.providers).map(([id, p]) => (
                <option
                  key={id}
                  value={id}
                  disabled={
                    id === "ollama" &&
                    config.storageProtection === "google-secret-manager"
                  }
                >
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ai-field-endpoint">
            API Base URL
            <input
              aria-label="AI API Base URL"
              type="url"
              required
              value={config.endpoint}
              onChange={(e) =>
                setConfig({ ...config, endpoint: e.target.value })
              }
            />
          </label>
          <label className="ai-field-model">
            模型名稱
            <input
              aria-label="AI 模型名稱"
              required
              value={config.model}
              placeholder="填入帳號可用的模型名稱"
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
            />
          </label>
          {config.provider !== "ollama" && (
            <label className="ai-field-key">
              API Key
              <input
                type="password"
                aria-label="AI API Key"
                autoComplete="off"
                required={!config.hasApiKey}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  config.hasApiKey ? "已儲存金鑰；留空保留" : "在此輸入金鑰"
                }
              />
              <small>
                {config.hasApiKey
                  ? "後端已有金鑰，內容不會回傳。"
                  : "尚未設定金鑰。"}
                金鑰僅由後端保存，不回傳瀏覽器。
              </small>
            </label>
          )}
          <label className="ai-checkbox">
            <input
              type="checkbox"
              checked={config.vision}
              onChange={(e) =>
                setConfig({ ...config, vision: e.target.checked })
              }
            />
            模型支援圖片（依官方模型能力設定）
          </label>
          <label className="ai-checkbox">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) =>
                setConfig({ ...config, enabled: e.target.checked })
              }
            />
            啟用 AI 結構分析
          </label>
          <button
            className="primary ai-save-button"
            disabled={!available || busy}
          >
            Save 加密儲存並設為預設 API
          </button>
        </form>
      </fieldset>
      <div
        className={`api-connection-result api-connection-${connection}`}
        role="status"
        aria-live="polite"
      >
        {connectionMessage}
      </div>
      <button
        type="button"
        className="secondary"
        disabled={!testState.canTest || busy}
        aria-describedby="ai-test-hint"
        onClick={async () => {
          if (!testState.canTest) return;
          setBusy(true);
          setConnection("testing");
          setConnectionMessage("正在測試連線…");
          setMessage("正在測試已儲存的 API…");
          try {
            const value = await request(
              "/test",
              { provider: config.provider },
              token,
            );
            setMessage(value.message);
            setConnection("success");
            setConnectionMessage(
              `連線成功：${config.providers[value.provider]?.name || value.provider} / ${value.model}`,
            );
          } catch (e) {
            setMessage((e as Error).message);
            setConnection("error");
            setConnectionMessage(`連線失敗：${(e as Error).message}`);
          } finally {
            setBusy(false);
          }
        }}
      >
        測試已儲存 API 連線
      </button>
      <p id="ai-test-hint" className="ai-test-hint">
        {testState.reason || "測試會使用後端已儲存的模型與金鑰。"}
      </p>
      {config.providers[config.provider] && (
        <p>
          <a
            href={config.providers[config.provider].docs}
            target="_blank"
            rel="noopener noreferrer"
          >
            {config.providers[config.provider].name} 官方 API 文件 ↗
          </a>
          。Qwen 區域與金鑰須一致；qwen-plus
          為文字用途，圖像分析需改用可用的視覺模型。
        </p>
      )}
      <fieldset disabled={locked || busy} className="ai-api-fields">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!/^\p{Script=Han}$/u.test(character)) {
              setMessage("請輸入一個中文字");
              return;
            }
            setBusy(true);
            setResult(null);
            const png = glyphImage(character);
            setImage(png);
            setMessage("正在分析字形，等待 API 回覆…");
            try {
              const value = await request(
                "/analyze",
                {
                  provider: config.provider,
                  character,
                  image: png.split(",")[1],
                },
                token,
              );
              setResult(value);
              setMessage("分析完成：候選結果，尚未核對。");
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            測試生字
            <input
              aria-label="AI 結構測試生字"
              value={character}
              onChange={(e) => {
                setCharacter(e.target.value);
                setResult(null);
                setImage("");
              }}
              maxLength={2}
            />
          </label>
          <button className="secondary" disabled={!available || busy}>
            {busy ? "處理中…" : "分析字形（產生待核候選）"}
          </button>
        </form>
      </fieldset>
      {image && (
        <div className="ai-structure-preview">
          <img src={image} alt={`送交 AI 分析的完整字形：${character}`} />
          {result && (
            <div>
              <div
                className="structure-square"
                style={
                  result.layout === "vertical"
                    ? {
                        gridTemplateRows: result.weights
                          .map((w) => `${w}fr`)
                          .join(" "),
                      }
                    : {
                        gridTemplateColumns: result.weights
                          .map((w) => `${w}fr`)
                          .join(" "),
                      }
                }
              >
                {result.parts.map((p, i) => (
                  <div className="structure-cell" key={i}>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <p>AI 建議比例：{result.weights.join("：")} · 待核對</p>
            </div>
          )}
        </div>
      )}
      {result && (
        <>
          <p>{result.reason}</p>
          <p>模型：{result.model}。此結果不代表教育部標準比例。</p>
          <a
            download={`${result.character}-結構候選.json`}
            href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result, null, 2))}`}
          >
            下載待核結果 JSON
          </a>
        </>
      )}
    </section>
  );
}
