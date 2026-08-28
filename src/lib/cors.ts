/**
 * The one CORS allow-list, shared by every route that needs one.
 *
 * This block was copy-pasted into four route files. Four copies of an
 * access-control decision is exactly how validateApiKey ended up with three
 * variants, one of them materially weaker than the others (see api-auth.ts) —
 * so it lives here now, and the per-route difference is reduced to the one
 * thing that genuinely differs: the method list.
 */

const EXTRA_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const ALLOWED_ORIGINS = [
  "https://www.96kapital.com",
  "https://96kapital.com",
  "https://96kapital.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  ...EXTRA_ORIGINS,
];

// Rejected origins are logged once each. Logging every request would be noise,
// but logging none is worse: the fallback below answers with a *different*
// origin than the one that asked, so the browser blocks the response and the
// calling site sees an opaque CORS error while the server records nothing at
// all. One line naming the origin turns "why is the memorial site broken" into
// a thirty-second fix.
const reportedOrigins = new Set<string>();

export function corsHeaders(
  origin: string | null,
  methods: string
): Record<string, string> {
  const isAllowed = Boolean(origin && ALLOWED_ORIGINS.includes(origin));

  if (origin && !isAllowed && !reportedOrigins.has(origin)) {
    reportedOrigins.add(origin);
    console.warn(
      `[cors] rejected origin ${origin} — not in the allow-list. Add it to ` +
        `CORS_ORIGINS (comma-separated) if this site should be able to call the API.`
    );
  }

  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin as string) : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}
