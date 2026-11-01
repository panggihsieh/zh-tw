import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { verifyAdminToken, FIREBASE_PROJECT } from "./admin-auth.mjs";
import { createStructureServer } from "./structure-api.mjs";

test("verifies signed Firebase Google admin tokens and rejects forged roles, wrong project and expiry", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid: "test", alg: "RS256" }],
  });
  const now = Math.floor(Date.now() / 1000);
  async function sign(overrides = {}) {
    return new SignJWT({
      sub: "admin-uid",
      email: "teacher.hsieh@gmail.com",
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
      auth_time: now - 10,
      iat: now,
      iss: `https://securetoken.google.com/${FIREBASE_PROJECT}`,
      aud: FIREBASE_PROJECT,
      exp: now + 300,
      ...overrides,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .sign(privateKey);
  }
  assert.equal(await verifyAdminToken(await sign(), keys), "admin-uid");
  for (const value of [
    { email: "student@gmail.com", role: "admin" },
    { email_verified: false },
    { firebase: { sign_in_provider: "password" } },
    { aud: "other-project" },
    { iss: "https://attacker.example" },
    { exp: now - 1 },
    { iat: now + 600 },
    { sub: "" },
  ])
    await assert.rejects(verifyAdminToken(await sign(value), keys));
  const forged = (await sign()).split(".");
  forged[1] = Buffer.from(
    JSON.stringify({ email: "teacher.hsieh@gmail.com" }),
  ).toString("base64url");
  await assert.rejects(verifyAdminToken(forged.join("."), keys));
});

test("production API denies anonymous GET, unlock and model calls before reading configuration", async () => {
  let modelCalls = 0;
  const api = createStructureServer({
    fetchProvider: async () => {
      modelCalls++;
      throw new Error("must not call");
    },
  });
  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${api.address().port}`;
    for (const [method, path] of [
      ["GET", "settings"],
      ["POST", "unlock"],
      ["POST", "test"],
      ["POST", "analyze"],
    ]) {
      const response = await fetch(`${base}/api/structure/${path}`, {
        method,
        headers: {
          Origin: "http://127.0.0.1:5173",
          "X-Notebook-Request": "structure-settings",
          "Content-Type": "application/json",
        },
        ...(method === "POST" ? { body: "{}" } : {}),
      });
      assert.equal(response.status, 401);
      assert.match((await response.json()).error, /Google/);
    }
    assert.equal(modelCalls, 0);
  } finally {
    await new Promise((resolve) => api.close(resolve));
  }
});
