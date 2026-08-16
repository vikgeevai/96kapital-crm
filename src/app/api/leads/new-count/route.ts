import { NextRequest, NextResponse } from "next/server";
import sql, { initDb } from "@/lib/db";

const EXTRA_ORIGINS = (process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = [
  "https://www.96kapital.com",
  "https://96kapital.com",
  "https://96kapital.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  ...EXTRA_ORIGINS,
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}

function validateApiKey(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key")?.trim();
  if (!key) return false;
  // CRM_API_KEY_PREVIOUS lets a key rotation run without downtime: set the new
  // key here and the old one in _PREVIOUS, update every client, then clear
  // _PREVIOUS. Clients are the KAPVOY site and the Indian Life Memorial site.
  const accepted = [process.env.CRM_API_KEY, process.env.CRM_API_KEY_PREVIOUS]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k));
  return accepted.includes(key);
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!validateApiKey(req)) {
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
