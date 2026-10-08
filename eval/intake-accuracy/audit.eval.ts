// PAID (small): a blind audit of the answer key, run before the chatbot is tested. A separate, stronger model
// (claude-opus-5-5) reads each scenario WITHOUT the key and says what a faithful assistant should have drafted,
// asked about, or skipped. Every disagreement with the key is written to audit-flags.json for human review.
// The chatbot under test is never involved, so the key can be corrected before any result is seen.

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { nameMatches } from "./grade";
import { getRegistry } from "./registry";
import { SCENARIOS, type Item, type Scenario } from "./scenarios";

const MODEL = "claude-opus-5-5";
const PRICE = { input: 4 / 1e6, output: 20 / 1e6 };
const OUT = path.resolve("eval/intake-accuracy/audit");
const LEDGER = path.resolve("eval/intake-accuracy/spend.json");
const CAP = Number(process.env.EVAL_CAP_USD ?? 4);
const BATCH = 3;

const client = new Anthropic();

const SYSTEM = `You are auditing an answer key for an inventory-intake assistant used by apartment maintenance supervisors. For each conversation below, decide - after EACH supervisor message - what a careful human assistant would have in the draft table if it faithfully recorded exactly what the supervisor has said so far, given the property's saved records.

How the app works:
- Two kinds of record: tools (equipment people check out; each physical tool is its own record, so a tool's quantity is the number of records) and supplies (consumables tracked by a quantity of individual units).
- A supply's quantity is the total number of individual units. If the supervisor gives a package count without saying how many units are in a package ("3 boxes of screws"), the unit count is unknown. Recording "3" as boxes, with the package in the name, would also be faithful.
- The assistant cannot change saved records. Restocking, using up, or restating a saved item creates nothing new. The same item in the same location as a saved record is already saved. The same item in a different location is a new record.
- If the supervisor says a location has N of a tool and some of that same tool are already saved there, the new records are only the difference.
- Locations come only from the supervisor. If no location is given or implied by context, the location is unknown.
- "a couple" = 2, "a dozen" = 12, "about 50" or "50 or so" = 50 (record the number they gave). A range ("30 or 40"), "a few", "some", "a bunch", "a handful", or an admitted uncertainty means the number is unknown.
- Read speech-to-text charitably: "for hammers" is four hammers, "to ladders" is two ladders.
- Retractions ("no wait", "scratch that", "forget the X", corrections) replace what was said before.

For every item the supervisor mentions, give its status after each message:
- "draft": it should be drafted. Give kind, quantity (individual units for supplies, record count for tools) and location.
- "ask": something needed (quantity, type, size, or location) cannot be determined from what was said, so a faithful assistant must ask instead of guessing.
- "skip": already saved, or a restock/usage/status change of a saved item, so nothing new is drafted.
- "none": retracted, hypothetical, not inventory, or not something the supervisor said they have.
Set "ambiguous" to true whenever two careful readers could reasonably reach different answers, and explain briefly in "note". Be strict and literal; do not be generous to the assistant or the key.`;

const SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["scenarios"],
    properties: {
        scenarios: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "checkpoints"],
                properties: {
                    id: { type: "string" },
                    checkpoints: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["after_message", "items"],
                            properties: {
                                after_message: { type: "integer" },
                                items: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        additionalProperties: false,
                                        required: ["item", "status", "kind", "quantity", "location", "ambiguous", "note"],
                                        properties: {
                                            item: { type: "string" },
                                            status: { type: "string", enum: ["draft", "ask", "skip", "none"] },
                                            kind: { type: "string", enum: ["tool", "supply", "either", "n/a"] },
                                            quantity: { type: ["number", "null"] },
                                            location: { type: ["string", "null"] },
                                            ambiguous: { type: "boolean" },
                                            note: { type: "string" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
} as const;

type AuditItem = { item: string; status: "draft" | "ask" | "skip" | "none"; kind: string; quantity: number | null; location: string | null; ambiguous: boolean; note: string };
type AuditResult = { scenarios: { id: string; checkpoints: { after_message: number; items: AuditItem[] }[] }[] };

function registryText(s: Scenario): string {
    const { inventory, tools } = getRegistry(s.registry);

    if (inventory.length + tools.length === 0) {
        return "Saved records: none (brand-new property).";
    }

    return [
        "Saved supplies (name | location | qty):",
        ...inventory.map((r) => `- ${r.name} | ${r.location} | ${r.quantity}`),
        "Saved tools (name | location):",
        ...tools.map((t) => `- ${t.name} | ${t.location}`),
    ].join("\n");
}

function conversationText(s: Scenario): string {
    return [`Conversation ${s.id}:`, ...s.turns.map((t, i) => `Supervisor message ${i + 1}: ${t.say}`)].join("\n");
}

const STATUS_FOR: Record<Item["type"], AuditItem["status"]> = { draft: "draft", ask: "ask", skip: "skip", absent: "none" };

function compare(s: Scenario, audit: AuditResult["scenarios"][number] | undefined) {
    const flags: Record<string, unknown>[] = [];

    if (!audit) {
        return [{ scenario: s.id, problem: "auditor returned nothing for this scenario" }];
    }

    s.turns.forEach((turn, k) => {
        const cp = audit.checkpoints.find((c) => c.after_message === k + 1);

        if (!cp) {
            flags.push({ scenario: s.id, turn: k + 1, problem: "auditor skipped this checkpoint" });
            return;
        }

        const used = new Set<number>();

        for (const item of turn.truth) {
            const index = cp.items.findIndex((a, i) => !used.has(i) && nameMatches(item.names, a.item));

            if (index === -1) {
                if (item.type === "draft" || item.type === "ask") {
                    flags.push({ scenario: s.id, turn: k + 1, item: item.id, problem: "auditor did not list this item (or named it differently)", auditor_items: cp.items.map((a) => a.item) });
                }
                continue;
            }

            used.add(index);

            const a = cp.items[index];
            const expected = STATUS_FOR[item.type];
            const base = { scenario: s.id, turn: k + 1, item: item.id, key: item.type, auditor: a };

            if (a.status !== expected) {
                flags.push({ ...base, problem: `status: key says ${expected}, auditor says ${a.status}` });
            } else if (item.type === "draft") {
                if (a.quantity !== null && !item.qty.includes(a.quantity)) {
                    flags.push({ ...base, problem: `quantity: key ${item.qty.join("/")}, auditor ${a.quantity}` });
                }

                if (item.loc && a.location && !item.loc.re.test(a.location)) {
                    flags.push({ ...base, problem: `location: key ${item.loc.ex}, auditor ${a.location}` });
                }

                if (item.loc === null && a.location) {
                    flags.push({ ...base, problem: `location: key says none given, auditor ${a.location}` });
                }
            }

            if (a.ambiguous) {
                flags.push({ ...base, problem: "auditor marked this ambiguous" });
            }
        }

        cp.items.forEach((a, i) => {
            if (!used.has(i) && (a.status === "draft" || a.status === "ask")) {
                flags.push({ scenario: s.id, turn: k + 1, problem: "auditor lists an item the key doesn't match", auditor: a });
            }
        });
    });

    return flags;
}

describe("blind audit of the answer key", () => {
    it("audits every scenario", async () => {
        fs.mkdirSync(OUT, { recursive: true });

        const groups: Scenario[][] = [];

        const only = process.env.EVAL_ONLY ? new Set(process.env.EVAL_ONLY.split(",")) : null;

        for (const registry of ["empty", "std"] as const) {
            const list = SCENARIOS.filter((s) => s.registry === registry && (!only || only.has(s.id)));

            for (let i = 0; i < list.length; i += BATCH) {
                groups.push(list.slice(i, i + BATCH));
            }
        }

        let spent = 0;
        const allFlags: Record<string, unknown>[] = [];
        const raw: unknown[] = [];

        await Promise.all(
            Array.from({ length: 4 }, async (_, worker) => {
                for (let g = worker; g < groups.length; g += 4) {
                    if (spent >= CAP) {
                        allFlags.push({ problem: `budget cap reached before auditing ${groups[g].map((s) => s.id).join(", ")}` });
                        continue;
                    }

                    const group = groups[g];
                    const content = [registryText(group[0]), "", ...group.map(conversationText)].join("\n\n");
                    let parsed: AuditResult | null = null;

                    try {
                        const response = await client.beta.messages.create({
                            model: MODEL,
                            max_tokens: 16000,
                            betas: ["server-side-fallback-2026-07-01"],
                            fallbacks: "default",
                            output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
                            system: SYSTEM,
                            messages: [{ role: "user", content }],
                        });

                        spent += response.usage.input_tokens * PRICE.input + response.usage.output_tokens * PRICE.output;

                        const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");

                        raw.push({ group: group.map((s) => s.id), model: response.model, stop_reason: response.stop_reason, text });

                        if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
                            allFlags.push({ problem: `auditor stop_reason ${response.stop_reason}`, group: group.map((s) => s.id) });
                            continue;
                        }

                        parsed = JSON.parse(text) as AuditResult;
                    } catch (err) {
                        allFlags.push({ problem: `auditor call failed: ${err instanceof Error ? err.message : String(err)}`, group: group.map((s) => s.id) });
                        continue;
                    }

                    for (const s of group) {
                        allFlags.push(...compare(s, parsed.scenarios.find((x) => x.id === s.id)));
                    }

                    console.log(`audited ${group.map((s) => s.id).join(", ")}  $${spent.toFixed(3)}`);
                }
            }),
        );

        fs.writeFileSync(path.join(OUT, "audit-raw.json"), JSON.stringify(raw, null, 1));
        fs.writeFileSync(path.join(OUT, "audit-flags.json"), JSON.stringify(allFlags, null, 1));

        let ledger: { total_usd: number; runs: Record<string, number> } = { total_usd: 0, runs: {} };

        try {
            ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
        } catch {
            // first run
        }

        ledger.runs[`audit@${new Date().toISOString()}`] = spent;
        ledger.total_usd = Object.values(ledger.runs).reduce((a, b) => a + b, 0);
        fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));

        console.log(`audit spent $${spent.toFixed(4)}; ${allFlags.length} flags`);
        expect(true).toBe(true);
    });
});
