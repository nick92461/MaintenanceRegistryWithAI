// FREE: re-grades every stored checkpoint from the saved draft tables and replies (so adjudications and any
// documented key corrections apply uniformly), then writes summary.json, summary.md and the report inputs.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkpointAccurate, gradeCheckpoint, isInaccurate, type CheckpointGrade, type ItemResult, type Overrides, type Row } from "./grade";
import { SCENARIOS, type Scenario } from "./scenarios";

const FLOW = path.resolve(process.env.EVAL_FLOW_DIR ?? "eval/intake-accuracy/run");
const DIR = path.join(FLOW, "baseline");
const ADJ_FILE = path.resolve("eval/intake-accuracy/adjudications.json");

type StoredCheckpoint = { turn: number; reply: string; rows: Row[]; grade: CheckpointGrade };
type ResultRow = {
    prompt_id: string;
    rep: number;
    prompt: string;
    tags: string[];
    status: "ok" | "app_error";
    model: string | null;
    usage: { input_tokens: number; output_tokens: number };
    latency_s: number;
    api_calls: number;
    tool_calls: number;
    grade: Record<string, number>;
    meta: { mode: string; registry: string; app_error: { error: string; turn: number } | null; checkpoints: StoredCheckpoint[]; raw_grade?: Record<string, number> };
};

// R1 assigns an unplaced row to a key item; R4 marks a placed row's item as inaccurate (wrong name).
type Adjudication = { scenario: string; rep: number | "*"; turn: number | "*"; row: string; decision: string; rule: string; reason: string };

const readJsonl = <T,>(file: string): T[] => {
    try {
        return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as T);
    } catch {
        return [];
    }
};

function wilson(k: number, n: number) {
    if (n === 0) return { lo: 0, hi: 1 };
    const z = 1.96;
    const p = k / n;
    const d = 1 + (z * z) / n;
    const c = p + (z * z) / (2 * n);
    const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    return { lo: (c - r) / d, hi: (c + r) / d };
}

// One-sided 95% upper bound on a failure rate when k failures were seen in n trials (exact when k = 0).
const upperBound = (k: number, n: number) => (k === 0 ? 1 - Math.pow(0.05, 1 / n) : wilson(k, n).hi);

const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

describe("analysis", () => {
    it("summarizes the run", () => {
        const rows = readJsonl<ResultRow>(path.join(DIR, "results.jsonl"));
        const errors = readJsonl<{ prompt_id: string; rep: number; error: string }>(path.join(DIR, "errors.jsonl"));
        const confirms = readJsonl<{ key: string; error?: string; saved: number; failed: string[]; mismatches: string[] }>(path.join(DIR, "confirm.jsonl"));
        const adjudications: Adjudication[] = fs.existsSync(ADJ_FILE) ? JSON.parse(fs.readFileSync(ADJ_FILE, "utf8")) : [];
        const byId = new Map(SCENARIOS.map((s) => [s.id, s]));
        const done = new Set(rows.map((r) => `${r.prompt_id}#${r.rep}`));
        const unresolvedErrors = errors.filter((e) => !done.has(`${e.prompt_id}#${e.rep}`));

        type Graded = { row: ResultRow; s: Scenario; checkpoints: { turn: number; reply: string; rows: Row[]; grade: CheckpointGrade; forced: Set<string> }[] };

        const graded: Graded[] = rows
            .filter((r) => r.status === "ok")
            .map((row) => {
                const s = byId.get(row.prompt_id)!;
                const replies: string[] = [];
                const checkpoints = row.meta.checkpoints.map((cp) => {
                    const applicable = adjudications.filter(
                        (a) => a.scenario === s.id && (a.rep === "*" || a.rep === row.rep) && (a.turn === "*" || a.turn === cp.turn),
                    );
                    const overrides: Overrides = {};
                    const forced = new Set<string>();

                    for (const a of applicable) {
                        if (a.decision.startsWith("assign:")) overrides[a.row] = a.decision;
                        if (a.decision.startsWith("inaccurate:")) forced.add(a.decision.slice("inaccurate:".length));
                    }

                    const grade = gradeCheckpoint({ scenarioId: s.id, truth: s.turns[cp.turn].truth, rows: cp.rows, reply: cp.reply, earlierReplies: [...replies], overrides });

                    replies.push(cp.reply);

                    return { turn: cp.turn, reply: cp.reply, rows: cp.rows, grade, forced };
                });

                return { row, s, checkpoints };
            });

        const itemBad = (r: ItemResult, forced: Set<string>) => isInaccurate(r.outcome) || forced.has(r.itemId);
        const cpAccurate = (cp: Graded["checkpoints"][number]) => checkpointAccurate(cp.grade) && !cp.grade.items.some((r) => cp.forced.has(r.itemId));
        const runAccurate = (g: Graded) => g.checkpoints.length === g.s.turns.length && g.checkpoints.every(cpAccurate);

        // ---- headline counts ----
        const runsOk = graded.length;
        const runsPass = graded.filter(runAccurate).length;
        const appErrors = rows.filter((r) => r.status === "app_error");
        const allItems = graded.flatMap((g) => g.checkpoints.flatMap((cp) => cp.grade.items.map((r) => ({ g, cp, r }))));
        const badItems = allItems.filter(({ cp, r }) => itemBad(r, cp.forced));
        const extras = graded.flatMap((g) => g.checkpoints.flatMap((cp) => cp.grade.extras.map((e) => ({ g, cp, e }))));
        const finalCps = graded.map((g) => g.checkpoints.at(-1)!);
        const finalRows = finalCps.reduce((n, cp) => n + cp.rows.length, 0);
        const finalBadRows = finalCps.reduce((n, cp) => n + cp.grade.inaccurateRows + cp.grade.items.filter((r) => cp.forced.has(r.itemId)).reduce((m, r) => m + r.rowIds.length, 0), 0);
        const allCpRows = graded.flatMap((g) => g.checkpoints).reduce((n, cp) => n + cp.rows.length, 0);
        const draftItems = allItems.filter(({ r }) => r.type === "draft");
        const askedInstead = draftItems.filter(({ r }) => r.outcome === "ok_asked_instead");
        const unnecessary = draftItems.filter(({ r }) => r.unnecessaryAsk);

        // ---- by group ----
        function breakdown(key: (g: Graded) => string[]) {
            const out: Record<string, { runs: number; pass: number; items: number; bad: number }> = {};

            for (const g of graded) {
                for (const k of key(g)) {
                    out[k] ??= { runs: 0, pass: 0, items: 0, bad: 0 };
                    out[k].runs++;
                    out[k].pass += runAccurate(g) ? 1 : 0;

                    for (const cp of g.checkpoints) {
                        out[k].items += cp.grade.items.length;
                        out[k].bad += cp.grade.items.filter((r) => itemBad(r, cp.forced)).length + cp.grade.extras.length;
                    }
                }
            }

            return out;
        }

        const byFluency = breakdown((g) => [g.s.fluency]);
        const byTag = breakdown((g) => g.s.tags);
        const byGroup = breakdown((g) => [g.s.id[0]]);

        // ---- consistency across reps ----
        const tableKey = (cp: { rows: Row[] }) =>
            cp.rows
                .map((r) => `${r.kind}|${r.name.toLowerCase()}|${r.location.toLowerCase()}|${r.kind === "inventory" ? r.quantity : ""}`)
                .sort()
                .join("\n");
        const outcomeKey = (g: Graded) => g.checkpoints.map((cp) => cp.grade.items.map((r) => `${r.itemId}:${r.outcome}`).join(",")).join(";");
        const perScenario = new Map<string, Graded[]>();

        for (const g of graded) perScenario.set(g.s.id, [...(perScenario.get(g.s.id) ?? []), g]);

        const multi = [...perScenario.values()].filter((list) => list.length >= 2);
        const sameVerdict = multi.filter((list) => new Set(list.map(runAccurate)).size === 1).length;
        const sameOutcomes = multi.filter((list) => new Set(list.map(outcomeKey)).size === 1).length;
        const identicalTables = multi.filter((list) => new Set(list.map((g) => tableKey(g.checkpoints.at(-1)!))).size === 1).length;

        // ---- database round trip ----
        const db = confirms.reduce(
            (acc, c) => ({ saved: acc.saved + c.saved, failed: acc.failed + c.failed.length, mismatches: acc.mismatches + c.mismatches.length }),
            { saved: 0, failed: 0, mismatches: 0 },
        );
        const failedReasons = confirms.flatMap((c) => c.failed.map((f) => `${c.key}: ${f}`));

        // ---- cost / latency ----
        const costOf = (r: ResultRow) => r.usage.input_tokens * 2e-6 + r.usage.output_tokens * 1e-5;
        const cost = rows.reduce((n, r) => n + costOf(r), 0);
        const latencies = rows.map((r) => r.latency_s).sort((a, b) => a - b);
        const p = (q: number) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))] ?? 0;

        // ---- detail lists ----
        const failures = [
            ...badItems.map(({ g, cp, r }) => ({
                scenario: g.s.id,
                rep: g.row.rep,
                turn: cp.turn + 1,
                item: r.itemId,
                outcome: cp.forced.has(r.itemId) && !isInaccurate(r.outcome) ? "wrong_name" : r.outcome,
                detail: r.detail,
                said: g.s.turns[cp.turn].say,
                rows: cp.rows.filter((row) => r.rowIds.includes(row.id)).map((row) => `${row.name} | ${row.location}${row.kind === "inventory" ? ` | qty ${row.quantity}` : ""}`),
                reply: cp.reply,
            })),
            ...extras.map(({ g, cp, e }) => ({
                scenario: g.s.id,
                rep: g.row.rep,
                turn: cp.turn + 1,
                item: "(unplaced row)",
                outcome: "unplaced_row",
                detail: `${e.kind} ${e.name} | ${e.location}${e.kind === "inventory" ? ` | qty ${e.quantity}` : ""}`,
                said: g.s.turns[cp.turn].say,
                rows: [],
                reply: cp.reply,
            })),
        ];

        const unnecessaryList = unnecessary.map(({ g, cp, r }) => ({
            scenario: g.s.id,
            rep: g.row.rep,
            turn: cp.turn + 1,
            item: r.itemId,
            questions: cp.grade.questions,
        }));

        const outcomeCounts: Record<string, number> = {};

        for (const { r } of allItems) outcomeCounts[r.outcome] = (outcomeCounts[r.outcome] ?? 0) + 1;

        const summary = {
            generated_at: new Date().toISOString(),
            scenarios: SCENARIOS.length,
            planned_runs: SCENARIOS.reduce((n, s) => n + s.reps, 0),
            runs_scored: runsOk,
            runs_app_error: appErrors.length,
            app_errors: appErrors.map((r) => ({ scenario: r.prompt_id, rep: r.rep, ...r.meta.app_error })),
            infra_errors_unresolved: unresolvedErrors.length,
            run_pass: { k: runsPass, n: runsOk, rate: runsOk ? runsPass / runsOk : 0, ci95: wilson(runsPass, runsOk), failure_upper95: upperBound(runsOk - runsPass, runsOk) },
            item_checks: { n: allItems.length, inaccurate: badItems.length, unplaced_rows: extras.length, rate_ok: allItems.length ? 1 - badItems.length / allItems.length : 0 },
            records_final: { rows: finalRows, inaccurate: finalBadRows, failure_upper95: upperBound(finalBadRows, finalRows) },
            records_all_checkpoints: allCpRows,
            unnecessary_questions: { derivable_item_checks: draftItems.length, asked_instead: askedInstead.length, unnecessary: unnecessary.length, rate: draftItems.length ? unnecessary.length / draftItems.length : 0 },
            outcome_counts: outcomeCounts,
            consistency: { scenarios_with_reps: multi.length, same_verdict: sameVerdict, same_item_outcomes: sameOutcomes, identical_final_tables: identicalTables },
            database: { ...db, failed_reasons: failedReasons },
            cost_usd_chatbot: cost,
            latency_s: { median: p(0.5), p95: p(0.95), max: latencies.at(-1) ?? 0 },
            by_fluency: byFluency,
            by_group: byGroup,
            by_tag: byTag,
            adjudications,
            failures,
            unnecessary_list: unnecessaryList,
        };

        fs.writeFileSync(path.join(FLOW, "summary.json"), JSON.stringify(summary, null, 1));

        // ---- report inputs: adjusted grades on each row, metric declarations ----
        const gradedByKey = new Map(graded.map((g) => [`${g.row.prompt_id}#${g.row.rep}`, g]));
        const adjusted = rows.map((r) => {
            const g = gradedByKey.get(`${r.prompt_id}#${r.rep}`);

            if (!g) return r;

            const items = g.checkpoints.flatMap((cp) => cp.grade.items.map((it) => ({ it, cp })));
            const bad = items.filter(({ it, cp }) => itemBad(it, cp.forced)).length + g.checkpoints.reduce((n, cp) => n + cp.grade.extras.length, 0);

            return {
                ...r,
                grade: {
                    accurate: runAccurate(g) ? 1 : 0,
                    item_accuracy: items.length ? 1 - bad / items.length : 1,
                    unneeded_q: items.filter(({ it }) => it.unnecessaryAsk).length,
                    bad_rows: g.checkpoints.at(-1)!.grade.inaccurateRows,
                },
                meta: { ...r.meta, raw_grade: r.meta.raw_grade ?? r.grade },
            };
        });

        fs.writeFileSync(path.join(DIR, "results.jsonl"), adjusted.map((r) => JSON.stringify(r)).join("\n") + "\n");
        fs.writeFileSync(
            path.join(FLOW, "_state.json"),
            JSON.stringify(
                {
                    metrics: [
                        { id: "accurate", label: "Run accurate", kind: "binary" },
                        { id: "item_accuracy", label: "Item accuracy", kind: "float", scale: 1 },
                        { id: "unneeded_q", label: "Unneeded asks", kind: "float", scale: 3, better: "lower" },
                        { id: "bad_rows", label: "Bad records", kind: "float", scale: 3, better: "lower" },
                    ],
                    perf_fields: [
                        { id: "cost_usd", label: "Cost", unit: "$" },
                        { id: "latency_s", label: "Latency", unit: "s" },
                        { id: "tool_calls", label: "Tool calls" },
                    ],
                    prices: { "claude-sonnet-5": { in: 2, out: 10 } },
                },
                null,
                2,
            ),
        );

        // ---- human summary ----
        const fmtBreak = (b: Record<string, { runs: number; pass: number; items: number; bad: number }>) =>
            Object.entries(b)
                .sort((x, y) => y[1].runs - x[1].runs)
                .map(([k, v]) => `| ${k} | ${v.runs} | ${v.pass}/${v.runs} | ${v.items} | ${v.bad} |`)
                .join("\n");

        const md = [
            `# Intake assistant accuracy: results`,
            ``,
            `Scored runs: **${runsOk}** of ${summary.planned_runs} planned (${appErrors.length} app errors, ${unresolvedErrors.length} unresolved infra errors).`,
            ``,
            `| Measure | Result |`,
            `|---|---|`,
            `| Runs with every checkpoint accurate | ${runsPass}/${runsOk} (${pct(summary.run_pass.rate)}, 95% CI ${pct(summary.run_pass.ci95.lo)}-${pct(summary.run_pass.ci95.hi)}) |`,
            `| Inaccurate item checks | ${badItems.length + extras.length} of ${allItems.length} (${extras.length} unplaced rows) |`,
            `| Inaccurate records in final tables | ${finalBadRows} of ${finalRows} (95% upper bound ${pct(summary.records_final.failure_upper95, 2)}) |`,
            `| Unnecessary questions | ${unnecessary.length} of ${draftItems.length} derivable item checks (${pct(summary.unnecessary_questions.rate)}) |`,
            `| Asked instead of drafting (incl. reasonable asks) | ${askedInstead.length} |`,
            `| Same verdict across repeats | ${sameVerdict}/${multi.length} scenarios |`,
            `| Identical final tables across repeats | ${identicalTables}/${multi.length} scenarios |`,
            `| Database round trip | ${db.saved} saved, ${db.failed} refused by validation, ${db.mismatches} field mismatches |`,
            `| Chatbot cost | $${cost.toFixed(2)} (latency median ${p(0.5).toFixed(1)}s, p95 ${p(0.95).toFixed(1)}s) |`,
            ``,
            `## By supervisor style`,
            `| Style | Runs | Accurate runs | Item checks | Inaccurate |`,
            `|---|---|---|---|---|`,
            fmtBreak(byFluency),
            ``,
            `## By confusion type`,
            `| Tag | Runs | Accurate runs | Item checks | Inaccurate |`,
            `|---|---|---|---|---|`,
            fmtBreak(byTag),
            ``,
            `## Every inaccuracy`,
            ...failures.map((f) => `- **${f.scenario} rep ${f.rep} msg ${f.turn}** ${f.item}: ${f.outcome} - ${f.detail}${f.rows.length ? ` [${f.rows.join("; ")}]` : ""}\n  - said: "${f.said}"`),
            failures.length === 0 ? "- none" : "",
            ``,
            `## Unnecessary questions`,
            ...unnecessaryList.map((u) => `- ${u.scenario} rep ${u.rep} msg ${u.turn} (${u.item}): ${u.questions.join(" / ")}`),
            unnecessaryList.length === 0 ? "- none" : "",
            ``,
            `## App errors (no draft produced, supervisor shown a message)`,
            ...summary.app_errors.map((e) => `- ${e.scenario} rep ${e.rep}: ${e.error}`),
            summary.app_errors.length === 0 ? "- none" : "",
            ``,
            `## Adjudications`,
            ...adjudications.map((a) => `- ${a.scenario} rep ${a.rep} msg ${a.turn === "*" ? "*" : Number(a.turn) + 1} "${a.row}": ${a.decision} (${a.rule}) - ${a.reason}`),
            adjudications.length === 0 ? "- none" : "",
        ].join("\n");

        fs.writeFileSync(path.join(FLOW, "summary.md"), md);
        console.log(md.split("## By supervisor style")[0]);
        expect(rows.length).toBeGreaterThan(0);
    });
});
