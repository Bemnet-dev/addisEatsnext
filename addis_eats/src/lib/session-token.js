export const SESSION_COOKIE = "session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const DEVELOPMENT_SECRET = "addis-eats-development-session-secret";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be configured in production.");
  }
  return secret || DEVELOPMENT_SECRET;
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sign(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return encodeBase64Url(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createSessionToken({ name, role }) {
  const payload = encodeBase64Url(
    JSON.stringify({
      name,
      role,
      expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
    })
  );
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token) {
  if (typeof token !== "string") return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expectedSignature = await sign(payload);
  const suppliedBytes = new TextEncoder().encode(signature);
  const expectedBytes = new TextEncoder().encode(expectedSignature);
  let difference = suppliedBytes.length ^ expectedBytes.length;
  for (let index = 0; index < Math.max(suppliedBytes.length, expectedBytes.length); index += 1) {
    difference |= (suppliedBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }
  if (difference !== 0) return null;

  try {
    const session = JSON.parse(decodeBase64Url(payload));
    if (
      typeof session.name !== "string" ||
      !["customer", "staff"].includes(session.role) ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }
    return { name: session.name, role: session.role };
  } catch {
    return null;
  }
}
