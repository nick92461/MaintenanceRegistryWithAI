# Maintenance Registry

A web app for tracking a maintenance shop's tools and consumable inventory, with role-based access and an AI assistant that turns spoken or typed stock descriptions into draft records.

## What it does

- **Inventory:** consumable items with quantity, category, location, and a reorder threshold.
- **Tools:** individual tool records with category, location, and check-in/check-out.
- **Role-based access (RBAC):** four roles: Guest, Technician, Supervisor, and Manager. Every server action re-checks the user's session and role, so permissions are enforced on the server and not only in the UI.
- **Soft deletes:** records are marked deleted, not erased.

## AI intake assistant

A Supervisor or Manager describes stock in plain language (for example, "twelve rolls of duct tape and a cordless drill in Shop 1"). Claude turns that into draft records using tool calls.

- **Draft, then confirm:** nothing is saved until the supervisor reviews the draft table and confirms.
- **Code owns the facts:** counts, quantities, numbering, and duplicate checks against saved records come from deterministic code. Claude handles interpretation.
- **Consistent replies:** the status message ("N items added to the draft", what was skipped as already saved, what needs clarification) is rendered from a structured record of what actually happened, not from Claude's own summary.
- **Model:** Claude Sonnet 5 via the Anthropic Messages API.

**Status:** the server side and the chat UI work. The editable draft table and confirm button are still in progress. Voice input is planned.

## Tech stack

Next.js 16 (App Router, Server Actions), React 19, TypeScript, Prisma 7 with PostgreSQL, the Anthropic SDK, and Vitest.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local PostgreSQL database (Docker):
   ```bash
   docker compose up -d
   ```
3. Create a `.env` file in the project root with:
   - `DATABASE_URL`: your PostgreSQL connection string
   - `ANTHROPIC_API_KEY`: your Anthropic API key
4. Generate the Prisma client and apply migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
5. Run the app:
   ```bash
   npm run dev
   ```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the code |
| `npm test` | Run the test suite |

Note: `src/lib/ai/claude.test.ts` calls the real Anthropic API and costs a small amount per run. The other tests make no network calls.

## Project layout

- `src/app/`: pages and routes
- `src/lib/actions/`: server actions (auth and role checks live here)
- `src/lib/ai/`: assistant logic: Claude client, draft tools, record lookup, and the reply ledger
- `src/lib/data/`: database queries
- `src/components/assistant/`: chat UI
- `prisma/`: schema and migrations

## Roadmap

1. Draft review table with editable rows and a confirm button
2. Voice input
3. Chat-based edits to existing records (restock, check in/out)
4. Multi-tenant support (multiple properties on one database)