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
}
