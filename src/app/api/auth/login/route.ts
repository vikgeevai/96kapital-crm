import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";
import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs"; // node:crypto

/**
 * Failed-attempt tracking, keyed by client IP.
 *
 * Be honest about what this is: serverless memory is per-instance, so an
 * attacker who spreads requests across enough concurrent lambdas gets a fresh
 * counter each time. It raises the cost of a brute force from trivial to
 * tedious; it does not stop a determined one. Real protection is a WAF rule at
 * the edge (Vercel Firewall) or a shared store.
 *
 * It is still worth having. This repository is public, so the endpoint, the
 * payload shape and the fact that there is exactly one admin account are all
 * known to anyone who looks — and the only defence before this was a 600ms
 * sleep, which a script does not care about.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; first: number }>();

function clientKey(req: NextRequest): string {
  // Vercel sets x-forwarded-for; the left-most entry is the real client.
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

function isLockedOut(key: string): boolean {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
    return;
  }
  rec.count += 1;
  // Bounded so a spray of unique IPs cannot grow this without limit.
  if (attempts.size > 5000) attempts.clear();
}

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

    if (isLockedOut(key)) {
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
      recordFailure(key);
      await new Promise(r => setTimeout(r, 600));
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // A successful login clears the counter, so a legitimate admin who
    // fumbled a few times is not locked out by their own success.
    attempts.delete(key);

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
