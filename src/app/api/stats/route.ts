import { NextRequest, NextResponse } from "next/server";
import sql, { initDb } from "@/lib/db";
import { authorizeDashboardRequest } from "@/lib/api-auth";

/**
 * No CORS headers, deliberately.
 *
 * This route used to answer `Access-Control-Allow-Origin: "*"`, which let any
 * website on the internet read the response from a visitor's browser. The
 * response is not aggregate-only: it carries urgentLeads and recentLeads,
 * including names, phone numbers and email addresses.
 *
 * Its only caller is the dashboard, which is same-origin and therefore needs
 * no CORS at all. The OPTIONS handler stays so a stray preflight gets a clean
 * 204 rather than a 405, but it no longer grants anyone access.
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" } as const;
  // Session (dashboard, same-origin cookie) or API key (server-to-server).
  // See authorizeDashboardRequest in @/lib/api-auth.
  if (!(await authorizeDashboardRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  try {
    await initDb();

    const [
      totalRows,
      byStatus,
      byService,
      bySource,
      byDay,
      urgentRows,
      recentRows,
      revenueRows,
    ] = await Promise.all([
      // Total count
      sql`SELECT COUNT(*)::int AS count FROM leads`,

      // By status
      sql`SELECT status, COUNT(*)::int AS count FROM leads GROUP BY status ORDER BY count DESC`,

      // By service (top 8)
      sql`SELECT COALESCE(NULLIF(TRIM(service),''), 'Unknown') AS service, COUNT(*)::int AS count
          FROM leads GROUP BY service ORDER BY count DESC LIMIT 8`,

      // By source
      sql`SELECT source, COUNT(*)::int AS count FROM leads GROUP BY source ORDER BY count DESC`,

      // Leads per day — last 30 days
      sql`SELECT DATE(created_at AT TIME ZONE 'Asia/Singapore') AS date, COUNT(*)::int AS count
          FROM leads
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at AT TIME ZONE 'Asia/Singapore')
          ORDER BY date ASC`,

      // Urgent: new leads older than 30 minutes
      sql`SELECT id::text, name, phone, email, service, created_at, estimated_cost
          FROM leads
          WHERE status = 'new' AND created_at < NOW() - INTERVAL '30 minutes'
          ORDER BY created_at ASC`,

      // 5 most recent leads
      sql`SELECT id::text, name, service, status, created_at, estimated_cost
          FROM leads ORDER BY created_at DESC LIMIT 5`,

      // Revenue pipeline: sum estimated_cost per status (strip $ and commas)
      sql`SELECT status,
            SUM(
              CASE WHEN estimated_cost ~ '^\\$?[0-9,]+$'
              THEN CAST(REPLACE(REPLACE(estimated_cost,'$',''),',','') AS numeric)
              ELSE 0 END
            )::int AS value
          FROM leads GROUP BY status`,
    ]);

    const total = totalRows[0]?.count ?? 0;

    // Build time-series with zeroes for missing days
    const dayMap: Record<string, number> = {};
    for (const row of byDay) {
      dayMap[row.date] = row.count;
    }
    const today = new Date();
    const timeSeries = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split("T")[0];
      return { date: key, count: dayMap[key] ?? 0 };
    });

    // Avg response time (mock for now — real implementation needs a responded_at column)
    const avgResponseMin = 5;

    // This month
    const thisMonthRows = await sql`
      SELECT COUNT(*)::int AS count FROM leads
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
    `;
    const thisMonth = thisMonthRows[0]?.count ?? 0;

    // Conversion rate: qualified / total
    const qualifiedRow = (byStatus as Array<Record<string, any>>).find((r) => r.status === "qualified");
    const qualifiedCount = qualifiedRow?.count ?? 0;
    const conversionRate = total > 0 ? Math.round((qualifiedCount / total) * 100) : 0;

    return NextResponse.json({
      total,
      thisMonth,
      conversionRate,
      avgResponseMin,
      byStatus,
      byService,
      bySource,
      timeSeries,
      urgentLeads: urgentRows,
      recentLeads: recentRows,
      revenuePipeline: revenueRows,
    }, { headers });
  } catch (err) {
    console.error("[/api/stats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
