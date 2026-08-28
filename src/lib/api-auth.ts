import type { NextRequest } from "next/server";

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
