import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROVIDERS } from "./providers.mjs";
import { protectSettings, unprotectSettings } from "./secret-store.mjs";
import {
  createStructureServer,
  validateSettings,
  validateAnalysis,
} from "./structure-api.mjs";
const candidate = {
  character: "聯",
  layout: "horizontal",
  parts: ["耳", "𢇇"],
  weights: [38, 62],
  reason: "左窄右寬",
};

test("cloud mode uses isolated settings storage, hosted origins and never calls local encryption", async () => {
  let saved = { version: 2, selected: "deepseek", profiles: {} };
  const origin = "https://voltaic-circuit-511310-a3-zh-tw.web.app";
  const api = createStructureServer({ cloud: true, origins: [origin], authenticate: async () => "admin",
    protect: () => { throw new Error("must not use DPAPI"); },
    configStore: { load: async () => structuredClone(saved), save: async (value) => { saved = value; } } });
  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${api.address().port}/api/structure`;
    const headers = { Origin: origin, "Content-Type": "application/json", "X-Notebook-Request": "structure-settings" };
    const unlocked = await (await fetch(base + "/unlock", { method: "POST", headers, body: "{}" })).json();
    assert.equal(unlocked.storageProtection, "google-secret-manager");
    assert.equal((await fetch(base + "/settings", { method: "OPTIONS", headers: { Origin: "https://attacker.example" } })).status, 403);
    const response = await fetch(base + "/settings", { method: "POST", headers: { ...headers, "X-Notebook-Unlock": unlocked.unlockToken }, body: JSON.stringify({ provider: "deepseek", model: "test", enabled: true, apiKey: "test-only-secret" }) });
    assert.equal(response.status, 200);
    assert.equal(saved.profiles.deepseek.apiKey, "test-only-secret");
    assert.ok(!(await response.text()).includes("test-only-secret"));
  } finally { await new Promise((resolve) => api.close(resolve)); }
});
test("validates model settings and blocks remote or credential-bearing endpoints", () => {
  assert.equal(
    validateSettings({
      endpoint: "http://127.0.0.1:11434",
      model: "vision:test",
      enabled: true,
    }).enabled,
    true,
  );
  for (const endpoint of [
    "https://remote.example",
    "http://192.168.1.1",
    "http://user:secret@localhost:11434",
    "http://localhost:11434/other",
  ])
    assert.throws(() => validateSettings({ endpoint, model: "x" }));
});
test("validates shape count and numerical proportions; never marks reviewed", () => {
  assert.equal(validateAnalysis(candidate, "聯").reviewed, false);
  for (const value of [
    { ...candidate, character: "察" },
    { ...candidate, weights: [50, 20] },
    { ...candidate, weights: [NaN, 100] },
    { ...candidate, parts: ["耳"] },
  ])
    assert.throws(() => validateAnalysis(value, "聯"));
});
test("local API persists settings, enforces origin, and forwards images to a mocked model", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hanzi-api-test-"));
  let providerCalls = 0;
  const api = createStructureServer({
    authenticate: async () => "test-admin",
    protect: async (value) => ({
      version: 3,
      payload: Buffer.from(JSON.stringify(value)).toString("base64"),
    }),
    unprotect: async (value) =>
      JSON.parse(Buffer.from(value.payload, "base64").toString("utf8")),
    configFile: join(dir, "config.json"),
    fetchProvider: async (url, options) => {
      providerCalls++;
      assert.equal(url, "http://127.0.0.1:11434/api/chat");
      const body = JSON.parse(options.body);
      assert.equal(body.messages[0].images.length, 1);
      assert.equal(body.stream, false);
      return {
        ok: true,
        json: async () => ({ message: { content: JSON.stringify(candidate) } }),
      };
    },
  });
  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${api.address().port}`;
  const headers = {
    Origin: "http://127.0.0.1:5173",
    "Content-Type": "application/json",
    "X-Notebook-Request": "structure-settings",
  };
  try {
    assert.equal(
      (await (await fetch(base + "/api/structure/settings")).json()).enabled,
      false,
    );
    let response = await fetch(base + "/api/structure/settings", {
      method: "POST",
      headers: { ...headers, Origin: "https://evil.example" },
      body: "{}",
    });
    assert.equal(response.status, 403);
    response = await fetch(base + "/api/structure/analyze", {
      method: "POST",
      headers,
      body: "{}",
    });
    assert.equal(response.status, 423);
    assert.equal(providerCalls, 0);
    const unlock = async () => {
      const value = await (
        await fetch(base + "/api/structure/unlock", {
          method: "POST",
          headers,
          body: "{}",
        })
      ).json();
      headers["X-Notebook-Unlock"] = value.unlockToken;
    };
    await unlock();
    response = await fetch(base + "/api/structure/settings", {
      method: "POST",
      headers,
      body: JSON.stringify({
        endpoint: "http://127.0.0.1:11434",
        model: "vision:test",
        enabled: true,
      }),
    });
    assert.equal(response.status, 200);
    const stored = JSON.parse(await readFile(join(dir, "config.json"), "utf8"));
    assert.equal(stored.version, 3);
    assert.ok(stored.payload);
    await unlock();
    response = await fetch(base + "/api/structure/analyze", {
      method: "POST",
      headers,
      body: JSON.stringify({ character: "聯", image: "iVBORw0KGgoAAA==" }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.status, "candidate");
    assert.equal(result.reviewed, false);
    assert.deepEqual(result.weights, [38, 62]);
  } finally {
    await new Promise((resolve) => api.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});

test("all five cloud providers isolate secrets, redact reads, auto-lock saves and test connections", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hanzi-cloud-check-"));
  let target = "";
  let key = "";
  let imageCall = false;
  const api = createStructureServer({
    authenticate: async () => "test-admin",
    configFile: join(dir, "settings.json"),
    protect: async (v) => ({
      version: 3,
      payload: Buffer.from(JSON.stringify(v)).toString("base64"),
    }),
    unprotect: async (v) =>
      JSON.parse(Buffer.from(v.payload, "base64").toString()),
    fetchProvider: async (url, options) => {
      assert.equal(url, target + "/chat/completions");
      assert.equal(options.headers.Authorization, "Bearer " + key);
      const body = JSON.parse(options.body);
      if (imageCall)
        assert.equal(body.messages[0].content[1].type, "image_url");
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: imageCall ? JSON.stringify(candidate) : "OK",
              },
            },
          ],
        }),
      };
    },
  });
  await new Promise((r) => api.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${api.address().port}`;
  const headers = {
    Origin: "http://127.0.0.1:5173",
    "Content-Type": "application/json",
    "X-Notebook-Request": "structure-settings",
  };
  const post = async (path, data) =>
    fetch(base + "/api/structure/" + path, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
  const unlock = async () => {
    const r = await (await post("unlock", {})).json();
    headers["X-Notebook-Unlock"] = r.unlockToken;
  };
  try {
    for (const provider of [
      "deepseek",
      "qwen",
      "minimax",
      "gemini",
      "openai",
    ]) {
      await unlock();
      target = PROVIDERS[provider].endpoint;
      key = "test-only-" + provider + "-secret";
      const save = await post("settings", {
        ...PROVIDERS[provider],
        provider,
        enabled: true,
        apiKey: key,
      });
      assert.equal(save.status, 200);
      assert.equal((await save.json()).locked, true);
      assert.equal((await post("settings", { provider })).status, 423);
      const raw = await readFile(join(dir, "settings.json"), "utf8");
      assert.equal(raw.includes(key), false);
      await unlock();
      const settings = await (
        await fetch(base + "/api/structure/settings?provider=" + provider, {
          headers,
        })
      ).json();
      assert.equal(settings.hasApiKey, true);
      assert.equal(JSON.stringify(settings).includes(key), false);
      const testResponse = await post("test", { provider });
      assert.equal(testResponse.status, 200);
      assert.equal((await testResponse.json()).ok, true);
      const checked = await (
        await fetch(base + "/api/structure/settings?provider=" + provider)
      ).json();
      assert.equal(checked.locked, true);
      assert.equal(checked.lastTest.ok, true);
    }
    target = PROVIDERS.deepseek.endpoint;
    key = "test-only-deepseek-secret";
    imageCall = true;
    assert.equal(
      (
        await post("analyze", {
          provider: "deepseek",
          character: "聯",
          image: "iVBORw0KGgoAAA==",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post("analyze", {
          provider: "qwen",
          character: "聯",
          image: "iVBORw0KGgoAAA==",
        })
      ).status,
      409,
    );
  } finally {
    await new Promise((r) => api.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
test(
  "Windows DPAPI encrypts and decrypts without embedding plaintext",
  { skip: process.platform !== "win32" },
  async () => {
    const probe = { value: "test-only-local-encryption-probe" };
    const encrypted = await protectSettings(probe);
    assert.equal(JSON.stringify(encrypted).includes(probe.value), false);
    assert.deepEqual(await unprotectSettings(encrypted), probe);
  },
);
