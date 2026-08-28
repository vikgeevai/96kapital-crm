import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Hand the integration API key to a signed-in admin, on request.
 *
 * The settings page shows this key inside copy-paste snippets, so it needs
 * the actual value — it is the one place in the dashboard that legitimately
 * does. It used to get it from NEXT_PUBLIC_CRM_API_KEY, which Next inlines
 * into the client bundle at build time: the key that authorises
 * POST /api/leads was therefore shipped to every visitor's browser, whether
 * they ever opened settings or not.
 *
 * Serving it from here instead means it crosses the wire only for a request
 * that already carries a valid session cookie.
 *
 * Session-only, deliberately — not the session-or-key check the other
 * dashboard routes use. Accepting an API key as authentication to reveal
 * that same API key would add no security and would let a leaked key be
 * used to confirm itself.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await getSession(req.cookies))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.CRM_API_KEY?.trim();
  if (!key) {
    console.error(
      "[settings] CRM_API_KEY is not set — the integration snippets have no key to show"
    );
    return NextResponse.json(
      { error: "CRM_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  return NextResponse.json({ key }, { headers: { "Cache-Control": "no-store" } });
}
