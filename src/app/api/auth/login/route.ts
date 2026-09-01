import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { createHash, timingSafeEqual } from "node:crypto";
import { createRateLimiter, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs"; // node:crypto

/**
 * Failed-attempt lockout, keyed by client IP.
 *
 * Only FAILURES count, and a success clears the record — so an admin who
 * fumbles the password a few times and then gets it right is not locked out by
 * their own success. See lib/rate-limit.ts for what this does and does not
 * protect against; the short version is that per-instance serverless memory
 * makes it an approximation, not a control.
 *
 * Before this existed the only defence was a 600ms sleep, which a script does
 * not care about.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const failures = createRateLimiter(MAX_ATTEMPTS, WINDOW_MS);

/**
 * Constant-time string comparison.
 *
 * The previous version compared with `===` under a comment claiming it was
 * "timing-safe comparison using equal-length encoding". It was not. Hashing
 * both sides first makes every comparison 32 bytes regardless of input, so
 * neither the value nor its length leaks through timing.
 */
function safeEqual(a: string, b: string): boolean {
  const h = (s: string) => createHash("sha256").update(s, "utf8").digest();
  return timingSafeEqual(h(a), h(b));
}

export async function POST(req: NextRequest) {
  try {
    const key = clientKey(req);

    if (failures.check(key).limited) {
      console.warn(`[auth/login] locked out ${key} after ${MAX_ATTEMPTS} failures`);
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (!adminEmail || !adminPassword) {
      console.error("[auth/login] ADMIN_EMAIL or ADMIN_PASSWORD env var not set");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // Both compared every time — no early return on a wrong email, so the
    // response cost does not reveal which half was wrong.
    const emailMatch = safeEqual(email.trim().toLowerCase(), adminEmail.toLowerCase());
    const passwordMatch = safeEqual(password, adminPassword);

    if (!emailMatch || !passwordMatch) {
      failures.record(key);
      await new Promise(r => setTimeout(r, 600));
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // A successful login clears the counter, so a legitimate admin who
    // fumbled a few times is not locked out by their own success.
    failures.reset(key);

    const token = await createSessionToken(adminEmail.toLowerCase());

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
