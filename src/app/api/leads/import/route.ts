import { NextRequest, NextResponse } from "next/server";
import sql, { initDb } from "@/lib/db";
import { authorizeDashboardRequest } from "@/lib/api-auth";

const EXTRA_ORIGINS = (process.env.CORS_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean);
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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}


export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

interface LeadRow {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  estimated_cost?: string;
  location?: string;
  notes?: string;
  address?: string;
  source?: string;
  metadata?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Session (dashboard, same-origin cookie) or API key (server-to-server).
  // See authorizeDashboardRequest in @/lib/api-auth.
  if (!(await authorizeDashboardRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  let body: { leads: LeadRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  if (!Array.isArray(body.leads) || body.leads.length === 0) {
    return NextResponse.json(
      { error: "leads array is required and must not be empty" },
      { status: 400, headers }
    );
  }

  await initDb();

  let inserted = 0;
  let skipped = 0;
  const errors: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < body.leads.length; i++) {
    const row = body.leads[i];
    const name = row.name?.trim() ?? "";
    const phone = row.phone?.trim() ?? "";

    if (!name && !phone) {
      skipped++;
      errors.push({ row: i + 1, reason: "Missing both name and phone" });
      continue;
    }

    const metadataJson = row.metadata ? JSON.stringify(row.metadata) : "{}";

    try {
      await sql`
        INSERT INTO leads (
          name, email, phone, address,
          service, source, status, notes,
          location, estimated_cost, metadata
        ) VALUES (
          ${name || null},
          ${row.email?.trim() || null},
          ${phone || null},
          ${row.address?.trim() || null},
          ${row.service?.trim() || null},
          ${row.source?.trim() || "instagram-ads"},
          'new',
          ${row.notes?.trim() || null},
          ${row.location?.trim() || null},
          ${row.estimated_cost?.trim() || null},
          ${metadataJson}::jsonb
        )
      `;
      inserted++;
    } catch (err) {
      errors.push({ row: i + 1, reason: String(err) });
    }
  }

  return NextResponse.json({ success: true, inserted, skipped, errors }, { headers });
}
