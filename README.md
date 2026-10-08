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

You'll need [Node.js](https://nodejs.org) 20.9 or newer, [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the database), and, only if you want to try the AI assistant, an [Anthropic API key](https://console.anthropic.com). Everything else works without a key.

1. Clone the repository and switch to the `dev` branch:
   ```bash
   git clone https://github.com/nick92461/MaintenanceRegistryWithAI.git
   ```
   ```bash
   cd MaintenanceRegistryWithAI
   ```
   ```bash
   git checkout dev
   ```
2. Install dependencies (this also generates the Prisma client):
   ```bash
   npm install
   ```
3. Start the local PostgreSQL database (Docker must be running):
   ```bash
   docker compose up -d
   ```
4. Create a file named `.env` in the project root containing these three lines. **`DEMO_MODE=true` is required** to get the "Try the live demo" button:
   ```
   DATABASE_URL=postgresql://capstone:capstone_dev_password@localhost:5432/capstone
   DEMO_MODE=true
   ANTHROPIC_API_KEY=your key here
   ```
   Replace `your key here` with your own key (or leave the line out to skip the assistant). The `DATABASE_URL` above matches the Docker database from step 3.
5. Create the tables:
   ```bash
   npx prisma migrate deploy
   ```
6. Run the app, then open http://localhost:3000:
   ```bash
   npm run dev
   ```
7. On the login page, click **Try the live demo**. It creates a private sandbox company filled with sample tools, inventory, and two years of history, and signs you in as its administrator. Nothing you do there touches anyone else's data, and the sandbox is deleted after 24 hours.

Notes on demo mode:

- Public signup is switched off while `DEMO_MODE=true`. Remove the line (or set it to anything other than `true`) to run the app normally, with signup enabled and no demo button. Restart the dev server after changing `.env`.
- The assistant is limited in demo mode to keep costs down: 10 messages per sandbox, 15 per day from one address, 40 per day across the whole site, and 1,500 characters per message.

### Optional: seeded sample accounts

To explore the multi-property and multi-company features with fixed logins instead of a sandbox, load the seed data (three companies, six properties, two years of history):

```bash
npx tsx prisma/seed.ts
```

It prints every account and each property's join code. All of them use the password `Password123!`. Good ones to try: `summit.regional@example.com` (Manager at two properties, with the property switcher), `summit.admin@example.com` (company admin), `floating.tech@example.com` (Technician at two properties), and `willows.admin@example.com` (a standalone property). To work on the code itself, use `npx prisma migrate dev` in step 5 instead of `migrate deploy`.

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
- Not deployed yet. Until then, the demo runs locally (see Getting started).

## Roadmap

1. Deploy a demo
2. Company admin tools in the app: create properties, manage join codes, add an existing employee to another property
3. A permanent isolation test suite that runs against a test database
4. Forgot-password and email verification
5. Chat-based edits to existing records (restock, check in/out), then a general assistant that can perform any action the signed-in user is permitted to, with user management always excluded
