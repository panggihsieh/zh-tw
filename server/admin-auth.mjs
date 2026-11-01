import { createRemoteJWKSet, jwtVerify } from "jose";

export const ADMIN_EMAIL = "teacher.hsieh@gmail.com";
export const FIREBASE_PROJECT = "voltaic-circuit-511310-a3";
const googleKeys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export async function verifyAdminToken(token, keys = googleKeys) {
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT}`,
    audience: FIREBASE_PROJECT,
    requiredClaims: ["exp", "iat", "sub", "auth_time"],
  });
  if (
    !payload.sub ||
    payload.sub.length > 128 ||
    typeof payload.auth_time !== "number" ||
    payload.auth_time > Date.now() / 1000 ||
    typeof payload.iat !== "number" ||
    payload.iat > Date.now() / 1000 ||
    payload.email !== ADMIN_EMAIL ||
    payload.email_verified !== true ||
    payload.firebase?.sign_in_provider !== "google.com"
  ) {
    throw new Error("管理者身分不符");
  }
  return payload.sub;
}

export async function authenticateAdmin(req) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer "))
    throw new Error("需要登入");
  return verifyAdminToken(header.slice(7));
}
