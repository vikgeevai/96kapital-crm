import { NextRequest, NextResponse } from "next/server";
import sql, { initDb } from "@/lib/db";
import { authorizeDashboardRequest } from "@/lib/api-auth";
import { corsHeaders } from "@/lib/cors";




export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin, "POST, OPTIONS") });
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
  const headers = corsHeaders(origin, "POST, OPTIONS");

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

  try {
    await initDb();
  } catch (err) {
    // Outside the try, this surfaced to the client's catch-all as "Network
    // error — check your connection", which sent people to look at their wifi
    // when the database was down.
    console.error("[import] initDb failed:", err);
    return NextResponse.json(
      { error: "Database unavailable — the import was not run." },
      { status: 503, headers }
    );
  }

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

  // Per-row failures were collected and returned but never logged, so a
  // repeatedly-failing import left nothing on the server to diagnose from.
  if (errors.length > 0) {
    console.error(
      `[import] ${inserted} inserted, ${skipped} skipped, ${errors.length} failed:`,
      JSON.stringify(errors.slice(0, 20))
    );
  }

  // `success: true` used to be unconditional — an import where every single
  // row failed reported success, and the dashboard showed a green tick.
  // Success now means at least one row actually landed.
  const success = inserted > 0;
  if (!success) {
    // The client renders `data.error ?? "Import failed."`, so say something
    // it can actually act on rather than leaving it to the generic fallback.
    const detail = errors[0]?.reason;
    return NextResponse.json(
      {
        success: false,
        inserted,
        skipped,
        errors,
        error:
          `No rows were imported — ${skipped} skipped, ${errors.length - skipped} failed.` +
          (detail ? ` First problem: ${detail}` : ""),
      },
      { status: 422, headers }
    );
  }

  return NextResponse.json({ success, inserted, skipped, errors }, { headers });
}
