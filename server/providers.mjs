export const PROVIDERS = {
  deepseek: {
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com",
    model: "deepseek-flash",
    vision: true,
    docs: "https://api-docs.deepseek.com/guides/vision/",
  },
  qwen: {
    name: "Qwen / qwen-plus",
    endpoint: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    vision: false,
    docs: "https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope",
  },
  minimax: {
    name: "MiniMax",
    endpoint: "https://api.minimax.io/v1",
    model: "MiniMax-M3.1-Flash",
    vision: true,
    docs: "https://platform.minimax.io/docs/api-reference/text-openai-api",
  },
  gemini: {
    name: "Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-3.8-flash",
    vision: true,
    docs: "https://ai.google.dev/gemini-api/docs/openai/",
  },
  openai: {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    vision: true,
    docs: "https://developers.openai.com/api/docs/guides/images-vision",
  },
  ollama: {
    name: "Ollama（本機）",
    endpoint: "http://127.0.0.1:11434",
    model: "",
    vision: true,
    docs: "https://docs.ollama.com/capabilities/vision",
  },
};
export function providerSettings(input) {
  const provider =
    input.provider ||
    (String(input.endpoint).startsWith("http://") ? "ollama" : "deepseek");
  const preset = PROVIDERS[provider];
  if (!preset) throw new Error("API 服務不支援");
  const url = new URL(input.endpoint || preset.endpoint);
  if (url.username || url.password || url.search || url.hash)
    throw new Error("API 位址不可包含帳密、查詢或片段");
  if (provider === "ollama") {
    if (
      url.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      !["", "/"].includes(url.pathname)
    )
      throw new Error("本機 API 只允許 loopback HTTP 根網址");
  } else {
    if (url.protocol !== "https:" || (url.port && url.port !== "443"))
      throw new Error("雲端 API 必須使用 HTTPS");
    const hostOk =
      provider === "qwen"
        ? [
            "dashscope-intl.aliyuncs.com",
            "dashscope.aliyuncs.com",
            "cn-hongkong.dashscope.aliyuncs.com",
          ].includes(url.hostname) ||
          /^[a-z0-9-]+\.(ap-southeast-1|us-east-1|cn-beijing|cn-hongkong|ap-northeast-1)\.maas\.aliyuncs\.com$/.test(
            url.hostname,
          )
        : url.hostname === new URL(preset.endpoint).hostname;
    const path = url.pathname.replace(/\/$/, "");
    const pathOk =
      provider === "deepseek"
        ? ["", "/v1"].includes(path)
        : path === new URL(preset.endpoint).pathname;
    if (!hostOk || !pathOk) throw new Error("API 位址不符合所選服務的官方端點");
  }
  if (
    typeof input.model !== "string" ||
    input.model.length > 120 ||
    (input.model && !/^[a-zA-Z0-9._:/-]+$/.test(input.model))
  )
    throw new Error("模型名稱格式錯誤");
  if (
    input.apiKey !== undefined &&
    (typeof input.apiKey !== "string" ||
      input.apiKey.length > 4096 ||
      /[\r\n]/.test(input.apiKey))
  )
    throw new Error("API Key 格式錯誤");
  return {
    provider,
    endpoint: url.href.replace(/\/$/, ""),
    model: input.model,
    enabled: input.enabled === true,
    vision: input.vision ?? preset.vision,
  };
}
export function publicSettings(config) {
  const { apiKey, ...safe } = config;
  return {
    ...safe,
    hasApiKey: !!apiKey,
    service: "hanzi-structure-api",
    providers: PROVIDERS,
  };
}
export function requestPayload(config, prompt, image) {
  if (config.provider === "ollama")
    return {
      model: config.model,
      stream: false,
      format: "json",
      messages: [
        {
          role: "user",
          content: prompt,
          ...(image ? { images: [image] } : {}),
        },
      ],
      options: { temperature: 0 },
    };
  const body = {
    model: config.model,
    stream: false,
    messages: [
      {
        role: "user",
        content: image
          ? [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: "data:image/png;base64," + image },
              },
            ]
          : prompt,
      },
    ],
    max_tokens: image ? 1800 : 24,
  };
  if (config.provider === "deepseek") body.thinking = { type: "disabled" };
  return body;
}
