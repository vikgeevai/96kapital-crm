@AGENTS.md

# 96 Kapital CRM

Multi-source lead CRM. Several sites POST leads to `/api/leads` with a shared API key.

- **This repo is PUBLIC.** No secrets, API keys, email addresses or phone numbers in source. They all live in Vercel env vars.
- **Push to `main` deploys production** (Vercel project `96kapital-crm`). Clients depend on `/api/leads` staying backward compatible.
- **Sources** are registered in `src/lib/sources.ts`.
  - Always read a stored source through `normaliseSource()`. `fundwise` is an alias of `kapvoy` and must stay.
  - Per-source behaviour (who gets alerted, email-only sources, no customer email) is a set of named `Set`s at the top of `src/app/api/leads/route.ts`. Read their comments before adding a source.
- **`kapvoy-guide`:** email-only signups for the KAPVOY Cash Flow Funding Kit. They are stored with an empty phone, so dashboard views must not assume a phone number.
- **Rotating the API key breaks every client you forget.** Set `CRM_API_KEY_PREVIOUS` first, update every client, then clear it.
