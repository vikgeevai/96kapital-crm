import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * The one API-key check for every machine-facing route.
 *
 * /api/leads had a hardened version while /api/stats and /api/ai/insights
 * kept an older, weaker copy: `key === process.env.CRM_API_KEY?.trim()`.
 * That diverged in two ways that both fail quietly.
 *
 * 1. No empty-key guard. If CRM_API_KEY were ever set to an empty string —
 *    a plausible mis-paste in Vercel — then "".trim() === "" and a request
 *    sending an empty x-api-key header authenticates. /api/stats sets
 *    Access-Control-Allow-Origin: * and returns urgentLeads/recentLeads
 *    including names, phones and emails.
 * 2. No CRM_API_KEY_PREVIOUS support, so the zero-downtime rotation that
 *    d9d4997 exists to enable would silently 401 those two routes — and the
 *    dashboard renders a 401 as "no leads" rather than an error.
 *
 * Shared so the three routes cannot drift apart again.
 */
export function validateApiKey(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key")?.trim();
  if (!key) return false;

  // CRM_API_KEY_PREVIOUS lets a key rotation run without downtime: set the new
  // key here and the old one in _PREVIOUS, update every client, then clear
  // _PREVIOUS. Clients are the KAPVOY site and the Indian Life Memorial site.
  const accepted = [process.env.CRM_API_KEY, process.env.CRM_API_KEY_PREVIOUS]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k));

  if (accepted.length === 0) {
    // Loud rather than silent: with no configured key, every request is
    // rejected, and without this you would only see unexplained 401s.
    console.error("[auth] no CRM_API_KEY configured — rejecting all API requests");
    return false;
  }
  return accepted.includes(key);
}

/**
 * The guard for routes the dashboard calls: a valid session **or** a valid
 * API key.
 *
 * The dashboard used to authenticate to its own API with
 * NEXT_PUBLIC_CRM_API_KEY. `NEXT_PUBLIC_` means Next inlines the value into
 * the client bundle at build time, so the key that also authorises the
 * external lead-posting endpoint was shipped to every visitor's browser.
 * Rotating it changed the value, not the exposure.
 *
 * The session cookie is the fix: it is httpOnly, path "/", SameSite=Lax, so
 * it already rides along on every same-origin /api/* fetch and the browser
 * never hands its contents to script. SameSite=Lax also blocks cross-site
 * mutations, so this brings CSRF protection with it.
 *
 * Note proxy.ts's matcher is ["/dashboard/:path*", "/login"] — it does not
 * run for /api/*, deliberately, since widening it would start intercepting
 * POST /api/leads from the external sites. So these routes must check the
 * cookie themselves; that is what this function is for.
 *
 * Session **or** key, not session-only: the evidence says these routes are
 * dashboard-only, but if some other caller does use one, session-only would
 * break it silently — the precise failure mode this whole sweep is about.
 * Removing the key from the browser is what closes the exposure; a route
 * still accepting a key from a server-to-server caller costs nothing.
 */
export async function authorizeDashboardRequest(req: NextRequest): Promise<boolean> {
  if (await getSession(req.cookies)) return true;
  return validateApiKey(req);
}
