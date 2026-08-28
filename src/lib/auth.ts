/**
 * Lightweight signed-cookie session auth using Web Crypto API (HMAC-SHA256).
 * Works on both Edge (middleware) and Node.js (API routes).
 * No external dependencies required.
 */

export const COOKIE_NAME = "lrl_session";
const SESSION_MS = 24 * 60 * 60 * 1000; // 24 hours

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromB64url(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer as ArrayBuffer;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(email: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");

  const payload = btoa(JSON.stringify({ email, exp: Date.now() + SESSION_MS }));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySessionToken(
  token: string
): Promise<{ email: string } | null> {
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      warnNoSecret();
      return null;
    }

    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;

    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64url(sig),
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;

    const { email, exp } = JSON.parse(atob(payload));
    if (Date.now() > exp) return null;

    return { email };
  } catch {
    return null;
  }
}

/**
 * One warning per process when AUTH_SECRET is missing.
 *
 * Failing closed is right — an unsigned session must never be trusted — but
 * doing it in silence is indistinguishable from a broken login: you sign in,
 * the cookie is set, the proxy rejects it, you land back on /login, forever,
 * with nothing in the logs saying why.
 */
let warnedNoSecret = false;
function warnNoSecret(): void {
  if (warnedNoSecret) return;
  warnedNoSecret = true;
  console.error(
    "[auth] AUTH_SECRET is not set — every session is rejected. Logins will " +
      "appear to succeed and then bounce straight back to /login."
  );
}

/**
 * Anything that can read a cookie by name.
 *
 * Structural rather than a concrete type so the same helper serves both
 * callers: `req.cookies` on a NextRequest (Edge, in proxy.ts) and the store
 * returned by `cookies()` from next/headers (Node, in server components).
 * Both expose exactly this.
 */
type CookieReader = { get(name: string): { value: string } | undefined };

/**
 * Read and verify the session cookie. The single definition.
 *
 * These three lines were inlined in proxy.ts and dashboard/layout.tsx, and
 * are now needed by the dashboard API routes too — three copies of an auth
 * check is how one of them ends up subtly weaker than the others, which is
 * exactly what happened to validateApiKey (see api-auth.ts).
 *
 * Returns null for absent, malformed, unsigned and expired tokens alike, and
 * never throws.
 */
export async function getSession(
  cookies: CookieReader
): Promise<{ email: string } | null> {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
