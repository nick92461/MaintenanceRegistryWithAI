# Maintenance Registry

A multi-tenant web app for tracking apartment maintenance tools and consumable inventory, with per-property role-based access and an AI assistant that turns spoken or typed stock descriptions into draft records.

## What it does

- **Inventory:** consumable items with quantity, category, location, and a reorder threshold. Quantity changes are logged.
- **Tools:** individual tool records with category, location, and check-in/check-out with due times and overdue tracking.
- **Reports:** tool usage (including late returns) and inventory usage, per property and date range.
- **Soft deletes:** records are marked deleted, not erased.

## Multi-tenancy

One deployed app and one shared database serve many management companies, and no data ever crosses a company.

- **Company** is the tenant boundary. A company owns one or more **properties**. A standalone property is simply a company of one, named after the property.
- **Roles belong to a property, not a person.** Each person has a membership at each property they work at (Guest, Technician, Supervisor, or Manager). The same person can be a Technician at one property and a Supervisor at another, which is how floating technicians and regional managers work.
- **Company admins** have Manager access to every property in their company without needing memberships.
- **Joining:** staff sign up with their property's join code and start as a pending Guest until a supervisor or manager there approves them.
- **Removing people:** a manager can remove someone from their property. Closing a person's whole account is allowed only for someone who manages every property that person works at (or a company admin).
- **Properties can move between companies.** Tools, inventory, and history belong to the property, so a property can change management companies without moving any records. The script for this isn't written yet.

### How isolation is enforced

- Every server action starts with `requirePropertyRole(propertyId, roles)`, which re-checks the session, confirms the property belongs to the user's company, and works out their role there. The browser's property ID is never trusted.
- Every query filters on `propertyId`, and records are looked up by `{ id, propertyId }`, never by `id` alone, so guessing another property's record ID finds nothing.
- Pages use the same rule through `requirePageRole`. A property you can't access returns the same 404 as one that doesn't exist, so IDs can't be probed.
- Signup join-code guesses, failed logins, and password-change attempts are rate limited.

## AI intake assistant

A Supervisor or Manager describes stock in plain language (for example, "twelve rolls of duct tape and a cordless drill in Shop 1"), by typing or by voice. Claude turns that into draft records using tool calls.

- **Draft, then confirm:** nothing is saved until the supervisor reviews the draft table, edits or removes rows, and confirms.
- **Code owns the facts:** counts, quantities, numbering, and duplicate checks against saved records come from deterministic code. Claude handles interpretation.
- **Consistent replies:** the status message ("N items added to the draft", what was skipped as already saved, what needs clarification) is rendered from a structured record of what actually happened, not from Claude's own summary.
- **Scoped to the property:** the assistant can only see and draft for the property it's opened from.
- **Voice input:** a microphone button fills the same editable text box using the browser's Web Speech API (Chrome, Edge, and Safari). It never sends on its own.
- **Model:** Claude Sonnet 5 via the Anthropic Messages API.

## Tech stack

Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS, Prisma 7 with PostgreSQL, the Anthropic SDK, and Vitest.

## Getting started

1. Install dependencies (this also generates the Prisma client):
   ```bash
   npm install
   ```
2. Start the local PostgreSQL database (Docker):
   ```bash
   docker compose up -d
   ```
3. Create a `.env` file in the project root with:
   - `DATABASE_URL`: your PostgreSQL connection string. For the Docker database above: `postgresql://capstone:capstone_dev_password@localhost:5432/capstone`
   - `ANTHROPIC_API_KEY`: your Anthropic API key (only the assistant needs it)
4. Create the tables:
   ```bash
   npx prisma migrate dev
   ```
5. Load demo data (three companies, six properties, two years of history):
   ```bash
   npx tsx prisma/seed.ts
   ```
   It prints every demo account and each property's join code. All demo accounts use the password `Password123!`.
6. Run the app:
   ```bash
   npm run dev
   ```

Good accounts to try: `summit.regional@example.com` (Manager at two properties, with the property switcher), `summit.admin@example.com` (company admin), `floating.tech@example.com` (Technician at two properties), and `willows.admin@example.com` (a standalone property).

## Creating a real company

Customers are created from the terminal for now. This makes a company, its first property, and an admin with a random temporary password, and prints them once:

```bash
npx tsx prisma/createCompany.ts --property "The Oaks" --name "Pat Lee" --email "pat@oaks.com"
```

Add `--company "Summit Residential"` when the property belongs to a larger company. The admin signs in with the temporary password and is required to choose their own before doing anything else. Staff then sign up using the printed join code.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the code |
| `npm test` | Run the test suite |

Note: `src/lib/ai/claude.test.ts` calls the real Anthropic API and costs a small amount per run. The other tests make no network calls and don't need a database.

## Project layout

- `src/app/`: pages and routes. Property pages live under `(app)/p/[propertyId]/`.
- `src/lib/actions/`: server actions (every one checks access first)
- `src/lib/auth/`: sessions, passwords, per-property access checks, rate limiting
- `src/lib/tenancy/`: company provisioning, join codes, temporary passwords
- `src/lib/ai/`: assistant logic: Claude client, draft tools, record lookup, and the reply ledger
- `src/lib/data/`: database queries
- `src/lib/domain/`: business rules for tools, inventory, and users
- `src/components/`: UI, grouped by feature
- `prisma/`: schema, migrations, seed, and the company provisioning script

## Known limitations

- No "forgot password" flow or email verification yet, because the app doesn't send email. A locked-out user needs someone to reset their account.
- Signup tells people when an email is already registered.
- The UI is functional but unpolished.
- Not deployed yet.

## Roadmap

1. Deploy a demo
2. Company admin tools in the app: create properties, manage join codes, add an existing employee to another property
3. A permanent isolation test suite that runs against a test database
4. Forgot-password and email verification
5. Chat-based edits to existing records (restock, check in/out), then a general assistant that can perform any action the signed-in user is permitted to, with user management always excluded
