# Brand OS

A runnable **Next.js + React + Supabase** marketing workspace, with Vercel configuration, based on the Marketing and Branding System Design V5.

This repository implements the core create → review → prepare → publish workflow and the full document table catalogue. It is **not a claim that every advanced feature in the design is production-complete**. Read `docs/FEATURE_STATUS.md` before planning a launch. No cloud resources or social accounts have been provisioned, and no live posts have been sent.

## Included

- Responsive dashboard, brands, campaigns, content review, delivery queue, competitor evidence, integration management, team settings and a full module explorer.
- Editable SVG design canvas: draggable text/shapes, colours, positions, sizes, aspect ratios, undo, PNG export, private asset upload and saved content revisions.
- Supabase Auth, organisation onboarding, six workspace roles, private storage, tenant RLS and composite foreign keys.
- **181 application tables**, SQL migrations, foreign-key indexes, natural-key constraints, queue indexes and full-text/JSON indexes. Storage and Supabase Auth tables are additional platform-managed tables.
- Transactional content approval, immutable revisions, publish plans, idempotent commit, one target per destination, durable queue/outbox, lease handling, provider acknowledgement and reconciliation.
- Provider adapter code for **X text**, **LinkedIn member text/images**, **Facebook page text/images**, and **Instagram business images**. Access verification and credential encryption are implemented. Live provider conformance still needs your approved apps/accounts.
- Manual competitor website/social/ad evidence import and three deterministic starter marketing hypotheses. Suggestions are explicitly not AI predictions or verified competitor performance analysis.
- GraphQL endpoint, MCP Streamable HTTP endpoint, trusted human publication review and published headless landing pages.
- Database integration tests, security tests, browser tests and GitHub Actions CI.

## V5 channel workspaces and reusable creatives

Open `/channels` or choose **Channel workspaces**. Each brand has dedicated routes for LinkedIn personal branding, LinkedIn company marketing, Meta Ads, Facebook, Instagram, YouTube, TikTok, WhatsApp, Snapchat and blogs. The page uses your selected brand; channel links preserve it.

- Save immutable brand-context versions and TOFU/MOFU/BOFU briefs.
- Open official regional ad research interfaces and import permitted public metadata, observed tags, offers and CTAs. No automated scraping or universal regional coverage is claimed.
- Create three original rule-based directions using your own offer, proof and tags. Descriptive comparison counts are not a lead forecast.
- Save reusable scene templates, load editable copies, then save reviewed content through the existing publishing workflow.
- Export a **manual Google Flow production brief**. The optional **Google video API is a separate integration**, disabled by default. No official Flow MCP/API connection was verified or activated.
- MCP adds `video.create_draft`, `video.get_status`, `video.export_flow_brief`. AI clients cannot approve generation or publishing.
- Google API jobs require a separate reviewer, a brand reservation policy, server-side API/model configuration and the explicit enable switch. Provider billing and live contract tests remain your deployment responsibility.

Apply `202610250012_channel_workspaces.sql` after the previous 11 migrations. See `docs/API_V5.md`, `docs/openapi-v5.json`, `docs/schema-v5.graphql`, `docs/V5_API_EXAMPLES.http` and `supabase/queries/v5_workflows.sql`. The complete design is `docs/SYSTEM_DESIGN_V5.md`. The historical schema generator is **not** the V5 migration source; do not rerun it over this release.

This is a source-code release, not a live Vercel/Supabase deployment. Browser scenarios are included but V5 browser QA was blocked by the hosted preview launcher. All external posting, ads and video generation require your approved platform accounts, credentials and acceptance tests.

## V4 performance marketing

Open `/growth` or choose **Performance studio**. This adds eight channel playbooks, scheduled editorial handoffs, separate media-plan approval, offline paused Meta campaign specification export, measured observation imports, an LTV/CAC scenario calculator and a CAPI event ledger.

The new migration `202610250011_performance_marketing.sql` upgrades an existing V3 database additively. Fresh installations apply all 12 migrations. There are 181 tables, 2,003 columns and 946 PostgreSQL indexes (including constraint-backed indexes). `docs/database-schema-v5.json` contains the actual complete schema and index definitions; `docs/SYSTEM_DESIGN_V5.md` is the updated design.

All eight requested channels have planning workflows. **YouTube, TikTok, Snapchat and WhatsApp direct delivery are not implemented.** External blog publishing also requires an adapter; owned headless pages are included. The Meta Ads plan does not create or activate provider ads. MMM inputs are stored but no model is fitted. See the feature matrix before launch.

For CAPI, an owner/admin can connect a dataset in Performance studio → Pixel & CAPI. Set a supported `META_GRAPH_VERSION`; the token is encrypted per brand. Keep `ENABLE_CAPI=false` until consent integration, test-event delivery and deduplication are reviewed. The minute cron claims one event at a time and quarantines uncertain results. Operator event entry is not a public commerce tracking endpoint. See `docs/OPERATIONS.md`.

The current UI reads at most 100 rows per table. Use separate organisations for isolated clients; brand grants are not yet an enforced permission boundary.

## 1. Explore locally without credentials

Use Node.js 22 LTS or newer and npm.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. With no public Supabase variables, the app uses a **clearly labelled local demo**. Edits persist in browser localStorage. Publishing, account connections, public landing pages and token issuance are disabled. Team settings → Reset demo restores the sample workspace.

## 2. Configure Supabase

### Hosted Supabase

1. Create a Supabase project in your chosen region.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from your project. Never expose the service-role key through a `NEXT_PUBLIC_` variable.
4. Generate **separate** secrets for `TOKEN_ENCRYPTION_KEY` and `CRON_SECRET`:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

5. Apply the migrations in filename order. With the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Alternatively run each SQL file in `supabase/migrations/` through the Supabase SQL editor, in order. Use a **new project/database**: these migrations create the catalogue rather than upgrade an unrelated schema.

6. Configure Auth → URL Configuration: your site URL, `/api/auth/callback`, and `/login?recovery=1` on each explicitly allowed development/production origin. Configure production email delivery and email confirmation in Supabase.
7. Restart Next.js, sign up, confirm the email, create a workspace and create a brand.
8. Add teammates after they have signed up. Owners/admins can assign editor, approver, publisher, viewer or admin. Enable separate approval if the creator must not approve their own content.

### Local Supabase

Requires Docker and the Supabase CLI:

```bash
npx supabase start
npx supabase db reset
npx supabase status
```

Copy the local URL/keys shown by `status` into `.env.local`. Local migrations include private storage policies. PGlite tests do **not** require Docker.

## 3. Run a real content workflow

1. Add a brand in Brand workspace. Brands, campaigns and competitors have regular forms. The extended module explorer uses structured JSON; linked UUIDs can be found there.
2. Open Design studio, edit the creative and save. A JPEG publishing rendition uploads to private storage and the content starts in `DRAFT`.
3. An authorised reviewer approves the exact revision. A new caption/media revision needs fresh approval.
4. Connect an account as described below.
5. Open Prepare publish, select exact accounts and optionally a local schedule. Server checks return a 15-minute plan.
6. Click **Publish to N accounts** once. This atomically writes the batch, targets, one-use authorisation and outbox records.
7. The publisher worker sends due work and the reconciler verifies accepted posts. The delivery queue distinguishes `QUEUED`, `UPLOADING`, `ACCEPTED`, `PUBLISHED`, `FAILED` and `UNKNOWN`.

A scheduled job is accepted immediately but only dispatched at its stored UTC time. A rate-limit failure can be retried explicitly. An unknown response or expired in-flight lease is never automatically reposted. See `docs/OPERATIONS.md` for reconciliation and support procedures.

## 4. Configure social publishing

The release uses an **advanced token connection screen**, not a finished public OAuth onboarding flow. Obtain a user token from your own approved provider application, with the required publishing permissions. Do not use someone else's account token.

Set `ENABLED_PUBLISH_PROVIDERS` to the reviewed adapters you want to enable, for example `x,linkedin`. Leave it empty to disable all actual dispatch. Set a currently supported `LINKEDIN_API_VERSION` and/or `META_API_VERSION` for those providers; versions are intentionally not guessed.

In Integrations → Connect authorised account, supply provider, account ID, display name, token and expiry. The server verifies provider identity/account access before encrypting the token. Tokens are never returned by the data explorer or MCP. Expired tokens require reconnecting; automatic refresh is not implemented.

| Provider | Implemented path | Important condition |
|---|---|---|
| X | Text posts, up to 280 characters | User-context token and access tier; no media adapter in this release |
| LinkedIn | Member text and single image | `urn:li:person:…`, OpenID userinfo access plus member posting permission; organisation publishing onboarding is not implemented |
| Facebook | Page text and image | User token able to list authorised pages; page token is extracted and encrypted separately |
| Instagram | Business-account image | Linked professional account accessible through the authorised page; use JPEG input; video, carousel, stories and personal accounts are not implemented |
| TikTok, YouTube, Pinterest, Threads | Catalogue entries / disabled UI | Further adapter implementation, approved platform access and required native consent UX are needed |

The studio downloads PNG for editing/export and saves a JPEG publishing rendition alongside the immutable scene. The database preparation gate rejects non-JPEG Instagram assets. Use provider-supported dimensions and aspect ratios; the built-in square preset is the safest initial integration test.

No access approval or audit is granted by this repository. The provided adapters need sandbox/live-account tests before enabling a production connector. Publishing never authorises ad spend.

## 5. Deploy to Vercel

1. Push this folder to your own Git repository and import it into Vercel as a Next.js project, or use `npx vercel` from the folder.
2. Add the environment variables in Vercel. Use the final HTTPS origin for `APP_URL`; it is the trusted origin for cookie-authenticated mutations.
3. Add the production Auth redirect URLs to Supabase.
4. Build command: `npm run build`. Install: `npm ci`. Framework: Next.js. Node: 22 or later.
5. The included `vercel.json` calls `/api/cron/publish` every minute. **Choose a Vercel plan that supports this frequency.** On plans that do not, use an approved external scheduler, or change the cron interval and accept the resulting latency. A daily cron is not a minute-accurate social scheduler.
6. Vercel sends `Authorization: Bearer CRON_SECRET`. Keep the cron secret server-only. The endpoint returns 401 when unconfigured or unauthorised.
7. Verify sign-up, role restrictions, storage access, provider test posts, queue reconciliation and restore procedures before launch.

The worker processes **one delivery and up to two accepted-post checks per invocation** to stay within a bounded function duration. This is a pilot throughput configuration, not the document's high-scale capacity target. For sustained load, move publishing to dedicated workers with the same claim/reconciliation contract. Do not put a long FFmpeg render inside a request function.

## 6. MCP and GraphQL

- GraphQL: `POST /api/graphql`, Supabase browser session, same-origin protection, bounded queries and no arbitrary SQL.
- MCP: `POST /api/mcp`, Streamable HTTP, workspace-issued `Authorization: Bearer bos_…` token. Generate/revoke tokens in Integrations. These are application-scoped personal tokens; **OAuth discovery and automatic ChatGPT connector sign-in are not implemented**.
- MCP supports account reads, comparison reads, suggestions, drafting, preparation, approval-link requests, committed-result retrieval and status. The human commits through `/approve/[planId]`. The agent cannot grant itself authority or change the content after approval.
- Public headless pages: create a landing-page draft through All modules; use Publish page. Public URL: `/p/{organisationId}/{brandId}/{slug}`. Only the immutable published release is rendered. Supported blocks are `heading`, `text`, and HTTPS `link`; raw HTML is not rendered.

See `docs/API.md` for request examples.

## 7. Verification

```bash
npm run typecheck
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run check` runs type checks, unit tests, database tests and the production build. The database harness applies the actual migrations in a local PostgreSQL-compatible PGlite engine with minimal Auth/Storage shims. It checks tenant RLS, anti-escalation, approval, publish idempotency, lease ambiguity, evidence import, hypotheses, viewer permissions and headless release. Run `supabase db reset` as an additional deployment gate against your actual Supabase environment.

Desktop/mobile browser checks were also run against the application, including design export/save, approval, demo publishing prevention and competitor evidence. Real social API calls, hosted Supabase and a Vercel deployment have **not** been exercised without your credentials.

## Repository guide

```text
src/app/                 App Router pages and REST/GraphQL/MCP endpoints
src/components/          Responsive workspace, SVG studio and trusted approval UI
src/lib/                 Auth, domain API, credentials, publisher and typed catalogue
supabase/migrations/     174-table schema, RLS, workflows, indexes and seeds
supabase/config.toml     Local Supabase configuration
tests/                   Security and actual migration/workflow tests
e2e/                     Playwright browser tests
docs/                    API, deployment, feature status and schema references
vercel.json              Deployment and cron configuration
```

Dependency versions and `package-lock.json` are pinned. `.env.example` contains no working secrets. Do not commit `.env.local`, generated credentials, `.next`, `node_modules` or browser test artefacts.
