// PAID runner: sends every scenario through the real assistant entry point (sendAssistantMessage: real system
// prompt, tools, tool loop, ledger and Claude calls). Only login, the saved-records lookup and the demo message
// counter are stubbed. Writes results.jsonl, errors.jsonl and traces/ under EVAL_FLOW_DIR/baseline/.
//
// Env: EVAL_FLOW_DIR (default eval/intake-accuracy/run), EVAL_ONLY=A01,B02  EVAL_REPS=1  EVAL_CONCURRENCY=4
//      EVAL_CAP_USD (spend allowed in this process)  EVAL_LEDGER_CAP_USD (total across all runs, default 24)

import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/lib/ai/claude";
import type { Draft } from "@/lib/ai/drafts";
import { evalContext, type CallRecord, type EvalStore } from "./evalContext";
import { checkpointAccurate, gradeCheckpoint, isInaccurate, type CheckpointGrade, type Row } from "./grade";
import { SCENARIOS, type Scenario } from "./scenarios";

vi.mock("@/lib/auth/access", async () => {
    const { evalContext: ctx } = await import("./evalContext");

    return {
        requirePropertyRole: async () => {
            const store = ctx.getStore();

            return {
                propertyId: store?.propertyId ?? "eval-property",
                role: "MANAGER",
                user: {
                    id: "eval-user",
                    name: "Eval Supervisor",
                    email: "eval@example.invalid",
                    companyId: store?.companyId ?? "eval-company",
                    isCompanyAdmin: true,
                    mustChangePassword: false,
                },
            };
        },
    };
});

vi.mock("@/lib/data/inventory", async () => {
    const { evalContext: ctx } = await import("./evalContext");
    const { getRegistry } = await import("./registry");

    return { getActiveInventoryItems: async () => getRegistry(ctx.getStore()?.registry ?? "empty").inventory.map((r) => ({ ...r })) };
});

vi.mock("@/lib/data/tools", async () => {
    const { evalContext: ctx } = await import("./evalContext");
    const { getRegistry } = await import("./registry");

    return { getActiveTools: async () => getRegistry(ctx.getStore()?.registry ?? "empty").tools.map((r) => ({ ...r })) };
});

vi.mock("@/lib/demo/demoMode", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/demo/demoMode")>();
    const { evalContext: ctx } = await import("./evalContext");

    return { ...actual, isDemoMode: () => ctx.getStore()?.demo ?? false };
});

vi.mock("@/lib/demo/assistantLimits", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/demo/assistantLimits")>();

    return { ...actual, countDemoAssistantMessage: async () => null };
});

vi.mock("@/lib/auth/clientAddress", () => ({ getClientAddress: async () => "eval" }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// ---------- config ----------

const FLOW_DIR = path.resolve(process.env.EVAL_FLOW_DIR ?? "eval/intake-accuracy/run");
const OUT_DIR = path.join(FLOW_DIR, "baseline");
const LEDGER = path.resolve("eval/intake-accuracy/spend.json");
const ONLY = process.env.EVAL_ONLY ? new Set(process.env.EVAL_ONLY.split(",")) : null;
const REPS = process.env.EVAL_REPS ? Number(process.env.EVAL_REPS) : null;
const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY ?? 4);
const PROCESS_CAP = Number(process.env.EVAL_CAP_USD ?? 1);
const LEDGER_CAP = Number(process.env.EVAL_LEDGER_CAP_USD ?? 24);
const CASE_TIMEOUT_MS = 5 * 60 * 1000;
const EXPECTED_MODEL = /^claude-sonnet-5(-\d{8})?$/;
const PRICE = { input: 2 / 1e6, output: 10 / 1e6 }; // claude-sonnet-5, per token

type Ledger = { total_usd: number; runs: Record<string, number> };

function readLedger(): Ledger {
    try {
        return JSON.parse(fs.readFileSync(LEDGER, "utf8")) as Ledger;
    } catch {
        return { total_usd: 0, runs: {} };
    }
}

const ledgerAtStart = readLedger();
const runLabel = `${path.basename(FLOW_DIR)}@${new Date().toISOString()}`;
let spent = 0;

function saveLedger() {
    const ledger = readLedger();
    ledger.runs[runLabel] = spent;
    ledger.total_usd = Object.values(ledger.runs).reduce((a, b) => a + b, 0);
    fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
}

const overBudget = () => spent >= PROCESS_CAP || ledgerAtStart.total_usd + spent >= LEDGER_CAP;

// ---------- spend metering + trajectory capture, at the HTTP boundary ----------

const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (!url.includes("/v1/messages")) {
        return realFetch(input, init);
    }

    if (overBudget()) {
        throw new Error(`eval budget cap reached ($${spent.toFixed(3)} this run)`);
    }

    const started = Date.now();
    const res = await realFetch(input, init);
    let body: { model?: string; stop_reason?: string; content?: unknown[]; usage?: { input_tokens: number; output_tokens: number } } | null = null;

    try {
        body = await res.clone().json();
    } catch {
        body = null;
    }

    if (body?.usage) {
        spent += body.usage.input_tokens * PRICE.input + body.usage.output_tokens * PRICE.output;
    }

    let request: CallRecord["request"] = null;

    try {
        request = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    } catch {
        request = null;
    }

    evalContext.getStore()?.calls.push({
        request,
        status: res.status,
        model: body?.model,
        stopReason: body?.stop_reason,
        content: body?.content,
        usage: body?.usage,
        ms: Date.now() - started,
    });

    return res;
}) as typeof fetch;

const { sendAssistantMessage } = await import("@/lib/actions/assistant");
const { confirmDrafts } = await import("@/lib/actions/drafts");
const { prisma } = await import("@/lib/prisma");

// ---------- helpers ----------

function toRow(d: Draft): Row {
    return d.kind === "inventory"
        ? { id: d.id, kind: "inventory", name: d.name, category: d.category, location: d.location, quantity: d.quantity }
        : { id: d.id, kind: "tool", name: d.name, category: d.category, location: d.location };
}

type Checkpoint = { turn: number; say: string; reply: string; rows: Row[]; grade: CheckpointGrade; callStart: number; callEnd: number };

type CaseOutcome =
    | { kind: "ok"; checkpoints: Checkpoint[]; finalDrafts: Draft[] }
    | { kind: "app_error"; checkpoints: Checkpoint[]; finalDrafts: Draft[]; error: string; turn: number; callStart: number }
    | { kind: "infra_error"; error: string; turn: number };

async function converse(s: Scenario, store: EvalStore): Promise<CaseOutcome> {
    const messages: ChatMessage[] = [];
    const replies: string[] = [];
    const checkpoints: Checkpoint[] = [];
    let drafts: Draft[] = [];

    for (let k = 0; k < s.turns.length; k++) {
        const turn = s.turns[k];
        const callStart = store.calls.length;

        messages.push({ role: "user", content: turn.say });

        const result = await sendAssistantMessage(store.propertyId, "inventory-intake", [...messages], drafts);
        const reply = "reply" in result ? result.reply : undefined;

        if (!reply) {
            const error = "error" in result && result.error ? result.error : "no reply";
            const lastCall = store.calls[store.calls.length - 1];

            // The app turns an API failure into a friendly message; that's infrastructure, not the assistant's behavior.
            if (!lastCall || lastCall.status !== 200) {
                return { kind: "infra_error", error: `${error} (http ${lastCall?.status ?? "none"})`, turn: k };
            }

            return { kind: "app_error", checkpoints, finalDrafts: drafts, error, turn: k, callStart };
        }

        drafts = "drafts" in result && result.drafts ? result.drafts : drafts;

        const rows = drafts.map(toRow);
        const grade = gradeCheckpoint({ scenarioId: s.id, truth: turn.truth, rows, reply, earlierReplies: [...replies] });

        checkpoints.push({ turn: k, say: turn.say, reply, rows, grade, callStart, callEnd: store.calls.length });
        replies.push(reply);
        messages.push({ role: "assistant", content: reply });
    }

    return { kind: "ok", checkpoints, finalDrafts: drafts };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`case wall-clock ceiling (${ms / 1000}s) reached`)), ms);

        p.then(
            (v) => {
                clearTimeout(timer);
                resolve(v);
            },
            (e) => {
                clearTimeout(timer);
                reject(e);
            },
        );
    });
}

type TraceTurn = { role: "system" | "user" | "assistant" | "tool_call" | "tool_result"; content: string; name?: string };

function blockText(block: unknown): string {
    if (typeof block === "object" && block !== null && "text" in block && typeof (block as { text: unknown }).text === "string") {
        return (block as { text: string }).text;
    }

    return "";
}

function buildTrace(s: Scenario, calls: CallRecord[], checkpoints: { say: string; reply: string; rows: Row[]; callStart: number; callEnd: number }[]): TraceTurn[] {
    const trace: TraceTurn[] = [];
    const system = calls[0]?.request?.system;

    if (typeof system === "string") {
        trace.push({ role: "system", content: system });
    }

    for (const cp of checkpoints) {
        trace.push({ role: "user", content: cp.say });

        for (let c = cp.callStart; c < cp.callEnd; c++) {
            const call = calls[c];

            for (const block of call.content ?? []) {
                const b = block as { type?: string; name?: string; input?: unknown };

                if (b.type === "text" && blockText(block).trim()) {
                    trace.push({ role: "assistant", content: blockText(block) });
                } else if (b.type === "tool_use") {
                    trace.push({ role: "tool_call", name: b.name, content: JSON.stringify(b.input, null, 2) });
                }
            }

            const next = calls[c + 1];
            const lastMessage = next && c + 1 < cp.callEnd ? (next.request?.messages ?? []).at(-1) : undefined;
            const content = (lastMessage as { content?: unknown } | undefined)?.content;

            if (Array.isArray(content)) {
                for (const block of content) {
                    const b = block as { type?: string; content?: unknown };

                    if (b.type === "tool_result") {
                        trace.push({ role: "tool_result", content: typeof b.content === "string" ? b.content : JSON.stringify(b.content) });
                    }
                }
            }
        }

        const table = cp.rows.map((r) => `- [${r.kind}] ${r.name} | ${r.category} | ${r.location}${r.kind === "inventory" ? ` | qty ${r.quantity}` : ""}`).join("\n");

        trace.push({ role: "assistant", content: `${cp.reply}\n\n--- draft table after this message (${cp.rows.length} rows) ---\n${table || "(empty)"}` });
    }

    return trace;
}

function append(file: string, row: unknown) {
    fs.appendFileSync(path.join(OUT_DIR, file), `${JSON.stringify(row)}\n`);
}

function doneKeys(): Set<string> {
    try {
        return new Set(
            fs
                .readFileSync(path.join(OUT_DIR, "results.jsonl"), "utf8")
                .split("\n")
                .filter(Boolean)
                .map((line) => {
                    const r = JSON.parse(line) as { prompt_id: string; rep: number };
                    return `${r.prompt_id}#${r.rep}`;
                }),
        );
    } catch {
        return new Set();
    }
}

// ---------- the run ----------

let evalCompanyId = "";
let evalPropertyId = "";

beforeAll(async () => {
    fs.mkdirSync(path.join(OUT_DIR, "traces"), { recursive: true });

    const company = await prisma.company.create({
        data: {
            name: "Eval: intake accuracy (temporary)",
            properties: { create: { name: "Eval Property", joinCode: `EV${randomBytes(3).toString("hex").toUpperCase()}` } },
        },
        include: { properties: true },
    });

    evalCompanyId = company.id;
    evalPropertyId = company.properties[0].id;
});

afterAll(async () => {
    saveLedger();

    if (evalPropertyId) {
        await prisma.tool.deleteMany({ where: { propertyId: evalPropertyId } });
        await prisma.inventoryItem.deleteMany({ where: { propertyId: evalPropertyId } });
        await prisma.property.delete({ where: { id: evalPropertyId } });
        await prisma.company.delete({ where: { id: evalCompanyId } });
    }

    console.log(`spent this run: $${spent.toFixed(4)}; ledger total: $${readLedger().total_usd.toFixed(4)}`);
});

// Confirms a final draft table into a real (temporary) property exactly as the Confirm button does, reads the rows
// back, and checks they match the drafts field for field. Then removes them.
async function confirmIntoDatabase(drafts: Draft[]) {
    const store: EvalStore = { registry: "empty", demo: false, propertyId: evalPropertyId, companyId: evalCompanyId, calls: [] };

    return evalContext.run(store, async () => {
        const result = await confirmDrafts(evalPropertyId, drafts);
        const tools = await prisma.tool.findMany({ where: { propertyId: evalPropertyId } });
        const items = await prisma.inventoryItem.findMany({ where: { propertyId: evalPropertyId } });
        const failed = "failed" in result ? result.failed : [];
        const failedIds = new Set(failed.map((f) => f.draftId));
        const mismatches: string[] = [];
        const unmatchedTools = [...tools];
        const unmatchedItems = [...items];

        for (const d of drafts.filter((x) => !failedIds.has(x.id))) {
            if (d.kind === "tool") {
                const i = unmatchedTools.findIndex((t) => t.name === d.name && t.category === d.category && t.location === d.location);
                if (i === -1) mismatches.push(`tool ${d.name}`);
                else unmatchedTools.splice(i, 1);
            } else {
                const i = unmatchedItems.findIndex(
                    (t) => t.name === d.name && t.category === d.category && t.location === d.location && t.quantity === d.quantity && t.reorderThreshold === d.reorderThreshold,
                );
                if (i === -1) mismatches.push(`item ${d.name}`);
                else unmatchedItems.splice(i, 1);
            }
        }

        mismatches.push(...unmatchedTools.map((t) => `unexpected tool ${t.name}`), ...unmatchedItems.map((t) => `unexpected item ${t.name}`));

        await prisma.tool.deleteMany({ where: { propertyId: evalPropertyId } });
        await prisma.inventoryItem.deleteMany({ where: { propertyId: evalPropertyId } });

        return {
            error: "error" in result ? result.error : undefined,
            saved: tools.length + items.length,
            failed: failed.map((f) => `${drafts.find((x) => x.id === f.draftId)?.name}: ${f.reason}`),
            mismatches,
        };
    });
}

describe("intake assistant accuracy (real Claude calls)", () => {
    it("runs every selected scenario", async () => {
        const scenarios = SCENARIOS.filter((s) => !ONLY || ONLY.has(s.id));
        const maxReps = Math.max(...scenarios.map((s) => REPS ?? s.reps));
        const done = doneKeys();
        const jobs: { s: Scenario; rep: number }[] = [];

        for (let rep = 0; rep < maxReps; rep++) {
            for (const s of scenarios) {
                if (rep < (REPS ?? s.reps) && !done.has(`${s.id}#${rep}`)) {
                    jobs.push({ s, rep });
                }
            }
        }

        console.log(`${jobs.length} cases to run (${done.size} already done), concurrency ${CONCURRENCY}, cap $${PROCESS_CAP} this run`);

        let next = 0;
        let stoppedForBudget = 0;
        const confirmQueue: { key: string; drafts: Draft[] }[] = [];

        async function worker() {
            while (next < jobs.length) {
                const { s, rep } = jobs[next++];

                if (overBudget()) {
                    stoppedForBudget++;
                    continue;
                }

                const store: EvalStore = { registry: s.registry, demo: s.mode === "demo", propertyId: evalPropertyId, companyId: evalCompanyId, calls: [] };
                const started = Date.now();
                let outcome: CaseOutcome;

                try {
                    outcome = await evalContext.run(store, () => withTimeout(converse(s, store), CASE_TIMEOUT_MS));
                } catch (err) {
                    outcome = { kind: "infra_error", error: err instanceof Error ? err.message : String(err), turn: -1 };
                }

                const wrongModel = store.calls.find((c) => c.model && !EXPECTED_MODEL.test(c.model));

                if (wrongModel) {
                    outcome = { kind: "infra_error", error: `served by ${wrongModel.model}, expected claude-sonnet-5`, turn: -1 };
                }

                const usage = store.calls.reduce(
                    (u, c) => ({ input_tokens: u.input_tokens + (c.usage?.input_tokens ?? 0), output_tokens: u.output_tokens + (c.usage?.output_tokens ?? 0) }),
                    { input_tokens: 0, output_tokens: 0 },
                );

                if (outcome.kind === "infra_error") {
                    append("errors.jsonl", { prompt_id: s.id, rep, failure_class: "harness_or_serving", error: outcome.error, turn: outcome.turn, http_attempts: store.calls.length, statuses: store.calls.map((c) => c.status), usage });
                    console.log(`${s.id}#${rep} INFRA ERROR ${outcome.error}`);
                    saveLedger();
                    continue;
                }

                const checkpoints = outcome.checkpoints;
                const itemResults = checkpoints.flatMap((cp) => cp.grade.items);
                const accurateItems = itemResults.filter((r) => !isInaccurate(r.outcome)).length;
                const allAccurate = checkpoints.length === s.turns.length && checkpoints.every((cp) => checkpointAccurate(cp.grade));
                const finalRows = checkpoints.at(-1)?.grade;
                const trace = buildTrace(s, store.calls, [
                    ...checkpoints,
                    ...(outcome.kind === "app_error"
                        ? [{ say: s.turns[outcome.turn].say, reply: `[app error shown to the supervisor] ${outcome.error}`, rows: outcome.finalDrafts.map(toRow), callStart: outcome.callStart, callEnd: store.calls.length }]
                        : []),
                ]);

                fs.writeFileSync(path.join(OUT_DIR, "traces", `${s.id}_rep${rep}.json`), JSON.stringify(trace, null, 1));

                const row = {
                    prompt_id: s.id,
                    rep,
                    prompt: s.turns.map((t, i) => (s.turns.length > 1 ? `[message ${i + 1}] ${t.say}` : t.say)).join("\n"),
                    tags: [s.fluency, ...s.tags],
                    status: outcome.kind === "ok" ? "ok" : "app_error",
                    stop_reason: store.calls.at(-1)?.stopReason ?? null,
                    model: store.calls.find((c) => c.model)?.model ?? null,
                    usage,
                    latency_s: (Date.now() - started) / 1000,
                    tool_calls: store.calls.reduce((n, c) => n + (c.content ?? []).filter((b) => (b as { type?: string }).type === "tool_use").length, 0),
                    api_calls: store.calls.length,
                    grade:
                        outcome.kind === "ok"
                            ? {
                                  accurate: allAccurate ? 1 : 0,
                                  item_accuracy: itemResults.length ? accurateItems / itemResults.length : 1,
                                  unneeded_q: itemResults.filter((r) => r.unnecessaryAsk).length,
                                  bad_rows: finalRows?.inaccurateRows ?? 0,
                              }
                            : {},
                    meta: {
                        mode: s.mode,
                        registry: s.registry,
                        app_error: outcome.kind === "app_error" ? { error: outcome.error, turn: outcome.turn } : null,
                        checkpoints: checkpoints.map((cp) => ({ turn: cp.turn, reply: cp.reply, rows: cp.rows, grade: cp.grade })),
                    },
                };

                append("results.jsonl", row);
                saveLedger();

                if (outcome.kind === "ok") {
                    confirmQueue.push({ key: `${s.id}#${rep}`, drafts: outcome.finalDrafts });
                }

                const bad = itemResults.filter((r) => isInaccurate(r.outcome)).map((r) => `${r.itemId}:${r.outcome}`);
                const extras = checkpoints.flatMap((cp) => cp.grade.extras.map((e) => `extra:${e.name}`));

                console.log(
                    `${s.id}#${rep} ${outcome.kind === "ok" ? (allAccurate ? "PASS" : "FAIL") : `APP_ERROR(${outcome.error.slice(0, 40)})`} ${[...bad, ...extras].join(" ")}  $${spent.toFixed(3)}`,
                );
            }
        }

        await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

        // Database fidelity: confirm each final table exactly as the UI would, sequentially.
        for (const { key, drafts } of confirmQueue) {
            const db = await confirmIntoDatabase(drafts);

            append("confirm.jsonl", { key, ...db });
        }

        if (stoppedForBudget > 0) {
            console.log(`STOPPED: ${stoppedForBudget} cases not started because the budget cap was reached`);
        }

        expect(true).toBe(true);
    });
});
