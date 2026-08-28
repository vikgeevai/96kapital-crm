import { NextRequest, NextResponse } from "next/server";
import sql, { initDb } from "@/lib/db";
import { authorizeDashboardRequest } from "@/lib/api-auth";
import { corsHeaders } from "@/lib/cors";




export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin, "GET, OPTIONS") });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin, "GET, OPTIONS");

  // Session (dashboard, same-origin cookie) or API key (server-to-server).
  // See authorizeDashboardRequest in @/lib/api-auth.
  if (!(await authorizeDashboardRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  try {
    await initDb();
    const rows = await sql`SELECT COUNT(*)::int AS count FROM leads WHERE status = 'new'`;
    return NextResponse.json({ count: rows[0]?.count ?? 0 }, { headers });
  } catch (err) {
    console.error("[/api/leads/new-count GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
