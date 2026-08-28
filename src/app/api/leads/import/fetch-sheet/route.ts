import { NextRequest, NextResponse } from "next/server";
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

/** Minimal CSV parser — handles quoted fields and escaped quotes. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let inQuote = false;
    let current = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        cells.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current);
    rows.push(cells);
  }
  return rows;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Session (dashboard, same-origin cookie) or API key (server-to-server).
  // See authorizeDashboardRequest in @/lib/api-auth.
  if (!(await authorizeDashboardRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  let body: { url: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const { url } = body;
  if (!url?.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400, headers });
  }

  // Extract sheet ID from URL
  const idMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) {
    return NextResponse.json(
      { error: "Not a valid Google Sheets URL. Make sure to copy the full URL from your browser." },
      { status: 400, headers }
    );
  }
  const sheetId = idMatch[1];

  // Extract gid (specific tab), default to first tab
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : "0";

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  try {
    const res = await fetch(csvUrl, {
      headers: { "User-Agent": "96Kapital-CRM/1.0" },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not fetch the sheet. Make sure it is shared as 'Anyone with the link (Viewer)'." },
        { status: 422, headers }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    // Google returns HTML when the sheet requires sign-in
    if (contentType.includes("text/html")) {
      return NextResponse.json(
        {
          error:
            "Sheet is private. In Google Sheets, click Share → Change to 'Anyone with the link' (Viewer), then try again.",
        },
        { status: 422, headers }
      );
    }

    const text = await res.text();
    const rows = parseCSV(text);

    if (rows.length < 1) {
      return NextResponse.json({ error: "Sheet appears to be empty." }, { status: 422, headers });
    }

    const [headerRow, ...dataRows] = rows;
    return NextResponse.json(
      { headers: headerRow, rows: dataRows, total: dataRows.length },
      { headers }
    );
  } catch (err) {
    console.error("[fetch-sheet]", err);
    return NextResponse.json(
      { error: "Failed to fetch the sheet. Check the URL and try again." },
      { status: 500, headers }
    );
  }
}
