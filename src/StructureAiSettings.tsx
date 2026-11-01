import { useEffect, useState } from "react";
const API = "http://127.0.0.1:5174/api/structure";
interface Settings {
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
  const response = await fetch(API + path, {
    method: data ? "POST" : "GET",
    headers: {
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
      setMessage("本機後端已連線。請輸入服務金鑰並儲存，再測試 API。");
    } catch {
      setAvailable(false);
      setMessage(
        "本機 AI 後端未啟動，請重新執行啟動生字收藏本，或執行 npm run structure-api。",
      );
    }
  }
  useEffect(() => {
    void connect();
  }, []);
  return (
    <section
      className="structure-ai-settings"
      id="ai-api-settings"
      aria-label="AI 字形結構 API 後台"
    >
      <h2>AI 字形結構 API 後台</h2>
      <p>
        <strong>{locked ? "Lock · 設定已鎖定" : "Unlock · 設定可編輯"}</strong>
        。本機以 Windows DPAPI 帳號綁定加密；預設鎖定、Save 後自動鎖定。Unlock
        為本機編輯鎖，不另設密碼。
      </p>
      <button
        className="secondary"
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
              setLocked(false);
              setMessage("已 Unlock，請設定 API。");
            } else {
              await request("/lock", {}, token);
              setToken("");
              setLocked(true);
              setApiKey("");
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
              setConfig({ ...config, hasApiKey: value.hasApiKey });
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
          <label>
            AI 服務
            <select
              aria-label="AI API 服務"
              value={config.provider}
              disabled={busy || !available}
              onChange={(e) => void connect(e.target.value)}
            >
              {Object.entries(config.providers).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            API Base URL
            <input
              aria-label="AI API Base URL"
              value={config.endpoint}
              onChange={(e) =>
                setConfig({ ...config, endpoint: e.target.value })
              }
            />
          </label>
          <label>
            模型名稱
            <input
              aria-label="AI 模型名稱"
              value={config.model}
              placeholder="填入帳號可用的模型名稱"
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
            />
          </label>
          {config.provider !== "ollama" && (
            <label>
              API Key
              <input
                type="password"
                aria-label="AI API Key"
                autoComplete="off"
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
                金鑰僅存本機後端，不存瀏覽器。
              </small>
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={config.vision}
              onChange={(e) =>
                setConfig({ ...config, vision: e.target.checked })
              }
            />
            模型支援圖片（依官方模型能力設定）
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) =>
                setConfig({ ...config, enabled: e.target.checked })
              }
            />
            啟用 AI 結構分析
          </label>
          <button className="secondary" disabled={!available || busy}>
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
        disabled={!available || busy}
        onClick={async () => {
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
