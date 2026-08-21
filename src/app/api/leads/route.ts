import { NextRequest, NextResponse } from "next/server";
import sql, { initDb } from "@/lib/db";
import { sendCustomerEmail, sendBusinessLeadEmail } from "@/lib/email";

// ── Green API WhatsApp admin notification ─────────────────────────────────
const GREEN_API_URL        = process.env.GREEN_API_URL ?? "";
const GREEN_INSTANCE_ID    = process.env.GREEN_API_INSTANCE_ID ?? "";
const GREEN_INSTANCE_TOKEN = process.env.GREEN_API_TOKEN ?? "";
const WA_NOTIFY_PHONES     = [
  process.env.WA_NOTIFY_PHONE_1 ?? "",
  process.env.WA_NOTIFY_PHONE_2 ?? "",
].filter(Boolean);

async function notifyAdminWhatsApp(data: {
  name: string; phone: string; service?: string;
  source?: string; estimated_cost?: string;
}): Promise<void> {
  if (!GREEN_API_URL || !GREEN_INSTANCE_ID || !GREEN_INSTANCE_TOKEN || !WA_NOTIFY_PHONES.length) return;

  const sourceLabel = data.source ? ` [${data.source.replace(/-/g, " ")}]` : "";
  const lines = [
    `🔔 *New CRM Lead${sourceLabel}*`,
    `👤 Name: ${data.name}`,
    `📱 Phone: ${data.phone}`,
    data.service        ? `🏷️ Service: ${data.service}`         : null,
    data.estimated_cost ? `💰 Estimate: ${data.estimated_cost}` : null,
    "",
    "Reply or call to follow up.",
  ].filter(Boolean).join("\n");

  const url = `${GREEN_API_URL}/waInstance${GREEN_INSTANCE_ID}/sendMessage/${GREEN_INSTANCE_TOKEN}`;
  await Promise.allSettled(
    WA_NOTIFY_PHONES.map((phone) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: `${phone}@c.us`, message: lines }),
      }).then((r) => {
        if (!r.ok) console.warn(`[WhatsApp notify] Failed for ${phone}: ${r.status}`);
      }).catch((err) => console.error("[WhatsApp notify]", err))
    )
  );
}
// ─────────────────────────────────────────────────────────────────────────

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
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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

// ── OPTIONS (preflight) ────────────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// ── POST — receive a new lead ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!validateApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const {
    name, email, phone, address,
    service: serviceField,
    source: sourceField,
    metadata,
    planning_type, arrangement_type, disposition_type,
    wake_duration, location,
    coffin_choice, high_end_interest, tentage_selected, floral_photo_frame,
    estimated_cost, deceased_name, death_cert_no,
    selected_coffin_image,
    notes: notesField,
  } = body as Record<string, string> & { metadata?: Record<string, string> };

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 422, headers });
  }

  const service = serviceField || [arrangement_type, planning_type].filter(Boolean).join(" — ");
  const notes = notesField || [
    location && `Location: ${location}`,
    coffin_choice && `Casket: ${coffin_choice}`,
    high_end_interest && high_end_interest !== "No" && `High-end interest: ${high_end_interest}`,
    tentage_selected === "Yes" && "Tentage: Yes",
    floral_photo_frame === "Yes" && "Floral photo frame: Yes",
    deceased_name && `Deceased: ${deceased_name}`,
    death_cert_no && `Death cert: ${death_cert_no}`,
  ].filter(Boolean).join(" · ");

  const source = sourceField || "website";
  const metadataJson = metadata ? JSON.stringify(metadata) : "{}";

  try {
    await initDb();

    const rows = await sql`
      INSERT INTO leads (
        name, email, phone, address,
        service, source, status, notes,
        planning_type, arrangement_type, disposition_type,
        wake_duration, location,
        coffin_choice, high_end_interest, tentage_selected, floral_photo_frame,
        estimated_cost, deceased_name, death_cert_no,
        metadata
      ) VALUES (
        ${name}, ${email ?? null}, ${phone}, ${address ?? null},
        ${service}, ${source}, 'new', ${notes},
        ${planning_type ?? null}, ${arrangement_type ?? null}, ${disposition_type ?? null},
        ${wake_duration ?? null}, ${location ?? null},
        ${coffin_choice ?? null}, ${high_end_interest ?? null}, ${tentage_selected ?? null}, ${floral_photo_frame ?? null},
        ${estimated_cost ?? null}, ${deceased_name ?? null}, ${death_cert_no ?? null},
        ${metadataJson}::jsonb
      )
      RETURNING id, created_at
    `;

    const lead = rows[0];

    // Send emails (non-blocking — don't let email failure block lead storage)
    if (process.env.RESEND_API_KEY) {
      const planDetails = [planning_type, arrangement_type, disposition_type, wake_duration]
        .filter(Boolean).join(" · ") || undefined;

      await Promise.allSettled([
        email ? sendCustomerEmail({
          name, email: email ?? "",
          service,
          planDetails,
          location: location ?? undefined,
          estimatedCost: estimated_cost ?? "",
          productImageUrl: selected_coffin_image,
        }) : Promise.resolve(),
        // KAPVOY Advisory (source 'fundwise') already sends its own admin
        // notification from its own site — this CRM's copy is a duplicate
        // for that source only. Every other source still gets it as before.
        source === 'fundwise' ? Promise.resolve() : sendBusinessLeadEmail({
          name, email: email ?? "", phone,
          address: address ?? undefined,
          service,
          planDetails,
          location: location ?? undefined,
          notes: notes || undefined,
          estimatedCost: estimated_cost ?? "",
          productImageUrl: selected_coffin_image,
        }),
      ]);
    }

    // WhatsApp admin notification (non-blocking — fires and forgets)
    notifyAdminWhatsApp({
      name, phone,
      service:        service        || undefined,
      source:         source         || undefined,
      estimated_cost: estimated_cost || undefined,
    }).catch((err) => console.error("[WhatsApp notify]", err));

    return NextResponse.json({ success: true, id: lead.id }, { status: 201, headers });
  } catch (err) {
    console.error("[/api/leads POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}

// ── GET — list all leads (dashboard) ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!validateApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  try {
    await initDb();

    const rows = await sql`
      SELECT
        id::text,
        created_at AS date,
        name, email, phone, address,
        service, source, status, notes,
        planning_type, arrangement_type, disposition_type,
        wake_duration, location,
        coffin_choice, high_end_interest,
        tentage_selected, floral_photo_frame,
        estimated_cost, deceased_name, death_cert_no,
        response_time AS "responseTime",
        COALESCE(metadata, '{}') AS metadata
      FROM leads
      ORDER BY created_at DESC
    `;

    return NextResponse.json(rows, { headers });
  } catch (err) {
    console.error("[/api/leads GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}

// ── PATCH — update lead status ────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!validateApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  let body: { id: string; status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const validStatuses = ["new", "contacted", "qualified", "junk", "archived"];
  if (!body.id || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid id or status" }, { status: 422, headers });
  }

  try {
    await sql`
      UPDATE leads SET status = ${body.status} WHERE id = ${parseInt(body.id)}
    `;
    return NextResponse.json({ success: true }, { headers });
  } catch (err) {
    console.error("[/api/leads PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}

// ── DELETE — remove one or many leads ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!validateApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  let body: { ids: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const ids = (body.ids ?? []).map(Number).filter(n => !isNaN(n) && n > 0);
  if (!ids.length) {
    return NextResponse.json({ error: "ids array required" }, { status: 422, headers });
  }

  try {
    await initDb();
    await sql`DELETE FROM leads WHERE id = ANY(${ids}::int[])`;
    return NextResponse.json({ success: true, deleted: ids.length }, { headers });
  } catch (err) {
    console.error("[/api/leads DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
