import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(process.env.DATABASE_URL);

export default sql;

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id          SERIAL PRIMARY KEY,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255),
      phone       VARCHAR(50),
      address     TEXT,
      service     VARCHAR(255),
      source      VARCHAR(100) NOT NULL DEFAULT 'website',
      status      VARCHAR(50)  NOT NULL DEFAULT 'new',
      notes       TEXT,
      planning_type     VARCHAR(100),
      arrangement_type  VARCHAR(100),
      disposition_type  VARCHAR(100),
      wake_duration     VARCHAR(50),
      location          VARCHAR(255),
      coffin_choice     VARCHAR(255),
      high_end_interest VARCHAR(10),
      tentage_selected  VARCHAR(10),
      floral_photo_frame VARCHAR(10),
      estimated_cost    VARCHAR(50),
      deceased_name     VARCHAR(255),
      death_cert_no     VARCHAR(100),
      response_time     VARCHAR(50)
    )
  `;

  // Add metadata JSONB column for source-specific quiz/form fields.
  // IF NOT EXISTS means this is safe to run on every cold start — existing rows
  // are unaffected and get an empty object default.
  await sql`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'
  `;

  await migrateFundwiseSource();
}

/**
 * ONE-TIME DATA MIGRATION — remove once the logs confirm it has run.
 *
 * KAPVOY leads were stored under 'fundwise' from the FundWise era. The key is
 * now 'kapvoy' (see lib/sources.ts), and this brings the existing rows across.
 *
 * Idempotent, which is what makes it safe on every cold start: once the rows
 * are renamed nothing matches and it is a no-op, exactly like the ADD COLUMN
 * IF NOT EXISTS above. It logs only when it actually changes something, so a
 * line in the Vercel logs means it ran and tells you how many rows moved.
 *
 * Wrapped, and deliberately so. initDb() is awaited before every lead INSERT;
 * if this threw, a failed migration would take the whole POST down with it and
 * the lead would be lost. A tidy-up must never be able to cost a lead, so a
 * failure here is loud in the logs and otherwise ignored — sources.ts still
 * maps 'fundwise' forward, so unmigrated rows keep their label and all four
 * metadata columns either way.
 */
async function migrateFundwiseSource() {
  try {
    const moved = await sql`
      UPDATE leads SET source = 'kapvoy' WHERE source = 'fundwise' RETURNING id
    `;
    if (moved.length > 0) {
      console.log(
        `[db] source migration: moved ${moved.length} lead(s) from 'fundwise' to 'kapvoy'`
      );
    }
  } catch (err) {
    console.error(
      "[db] source migration FAILED — leads are unaffected and still readable " +
      "via the 'fundwise' alias in lib/sources.ts:",
      err
    );
  }
}
