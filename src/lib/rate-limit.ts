/**
 * Fixed-window rate limiting, keyed by client IP.
 *
 * Lifted out of the login route so the leads endpoint can use the same
 * implementation rather than a second one that drifts from it.
 *
 * Be honest about what this is: serverless memory is per-instance, so traffic
 * spread across enough concurrent lambdas gets a fresh counter each time. It
 * raises the cost of a brute force or a flood from trivial to tedious; it does
 * not stop a determined one. Real protection is a WAF rule at the edge (Vercel
 * Firewall) or a shared store.
 *
 * It is still worth having. This repository is public, so the endpoints, their
 * payload shapes and the fact that there is exactly one admin account are all
 * known to anyone who looks.
 */

import type { NextRequest } from "next/server";

type Window = { count: number; first: number };

/** Bounded so a spray of unique IPs cannot grow the map without limit. */
const MAX_KEYS = 5000;

export type RateLimitState = { limited: boolean; retryAfterSeconds: number };

export type RateLimiter = {
  /**
   * The current state for a key WITHOUT counting this request.
   *
   * Use before doing the work, where only some outcomes should count — the
   * login route counts failures, not attempts.
   */
  check(key: string): RateLimitState;
  /**
   * Count one occurrence and return the state after it.
   *
   * Use where every request counts. Note the boundary: `check` is limited at
   * `count >= max` because it runs before the increment, while `record` is
   * limited at `count > max` because it runs after. Both mean the same thing —
   * this request is the (max + 1)th within the window.
   */
  record(key: string): RateLimitState;
  /** Clear a key — e.g. a successful login should not leave failures behind. */
  reset(key: string): void;
};

export function createRateLimiter(max: number, windowMs: number): RateLimiter {
  const hits = new Map<string, Window>();

  /** The live window for a key, dropping it if it has expired. */
  function current(key: string, now: number): Window | undefined {
    const rec = hits.get(key);
    if (!rec) return undefined;
    if (now - rec.first > windowMs) {
      hits.delete(key);
      return undefined;
    }
    return rec;
  }

  // Ceil, not floor: floor reports 0 for anything under a second, and a
  // Retry-After of 0 tells the client to try again immediately.
  const retryIn = (rec: Window, now: number) =>
    Math.ceil((rec.first + windowMs - now) / 1000);

  return {
    check(key) {
      const now = Date.now();
      const rec = current(key, now);
      if (!rec) return { limited: false, retryAfterSeconds: 0 };
      return { limited: rec.count >= max, retryAfterSeconds: retryIn(rec, now) };
    },

    record(key) {
      const now = Date.now();
      const rec = current(key, now);
      if (!rec) {
        if (hits.size > MAX_KEYS) hits.clear();
        hits.set(key, { count: 1, first: now });
        return { limited: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
      }
      rec.count += 1;
      return { limited: rec.count > max, retryAfterSeconds: retryIn(rec, now) };
    },

    reset(key) {
      hits.delete(key);
    },
  };
}

/**
 * The client's address as Vercel reports it.
 *
 * x-forwarded-for is a comma-separated chain and the LEFT-MOST entry is the
 * original client; the rest are proxies. The header is spoofable in general —
 * it is trustworthy here only because Vercel's edge overwrites it.
 */
export function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}
