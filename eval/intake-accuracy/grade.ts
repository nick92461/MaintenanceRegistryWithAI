// Grades one checkpoint: the draft table and the assistant's reply at the end of one supervisor message,
// against that checkpoint's answer key. Pure and deterministic, so it can be tested without any API calls.

import { isAskOk, type Alt, type Item, type Kind, type Loc, type Matcher } from "./scenarios";

export type Row = { id: string; kind: "inventory" | "tool"; name: string; category: string; location: string; quantity?: number };

export type Outcome =
    | "ok_draft"
    | "ok_split"
    | "ok_alt"
    | "ok_ask"
    | "ok_asked_earlier"
    | "ok_asked_instead"
    | "ok_skip"
    | "ok_absent"
    | "omitted"
    | "wrong_qty"
    | "wrong_kind"
    | "wrong_location"
    | "invented_location"
    | "duplicate_rows"
    | "duplicate_of_saved"
    | "fabricated"
    | "retracted_drafted";

const INACCURATE: ReadonlySet<Outcome> = new Set<Outcome>([
    "omitted",
    "wrong_qty",
    "wrong_kind",
    "wrong_location",
    "invented_location",
    "duplicate_rows",
    "duplicate_of_saved",
    "fabricated",
    "retracted_drafted",
]);

export const isInaccurate = (o: Outcome) => INACCURATE.has(o);

export type ItemResult = {
    itemId: string;
    type: Item["type"];
    outcome: Outcome;
    detail: string;
    rowIds: string[];
    inaccurateRows: number;
    asked: boolean;
    unnecessaryAsk: boolean;
    reportedSkip?: boolean;
};

export type CheckpointGrade = {
    items: ItemResult[];
    extras: Row[];
    rows: number;
    inaccurateRows: number;
    questions: string[];
};

// Overrides from human adjudication: a draft name (in this checkpoint) mapped to "assign:<itemId>" when it is a
// key item under a name the matcher missed. Every adjudication is recorded in adjudications.json with a reason.
export type Overrides = Record<string, string>;

const PLACEHOLDER = /^\s*(|unknown|unspecified|not specified|unassigned|tbd|n\/?a|none|no location|location unknown|\?+|-+)\s*$/i;

export function nameMatches(m: Matcher, name: string): boolean {
    return m.all.every((re) => re.test(name)) && !(m.not && m.not.test(name));
}

function locMatches(loc: Loc, location: string): boolean {
    return loc === null ? PLACEHOLDER.test(location) : loc.re.test(location);
}

const normLoc = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const GENERIC_CLARIFICATION = /rephrase|re-?state|couldn'?t (understand|make out|follow)|not sure what you mean|could you (clarify|restate) (that|your|the) message/i;

// Questions the assistant put to the supervisor: the app's numbered clarification lines plus any sentence of
// prose that ends in a question mark.
export function extractQuestions(reply: string): string[] {
    const out: string[] = [];
    let inClarifications = false;

    for (const raw of reply.split("\n")) {
        const line = raw.trim();

        if (/needs? clarification/i.test(line)) {
            inClarifications = true;
            continue;
        }

        if (inClarifications && /^\d+\.\s/.test(line)) {
            out.push(line);
            continue;
        }

        if (line.length === 0) {
            inClarifications = false;
            continue;
        }

        for (const sentence of line.replace(/([.!?])\s+/g, "$1\n").split("\n")) {
            if (sentence.includes("?")) {
                out.push(sentence.trim());
            }
        }
    }

    return out;
}

function alreadySavedSection(reply: string): string {
    const index = reply.indexOf("Already saved, not added:");

    return index === -1 ? "" : reply.slice(index).split("\n")[0];
}

function kindsOf(rows: Row[]): Set<string> {
    return new Set(rows.map((r) => r.kind));
}

function amount(rows: Row[]): number {
    const isTool = rows.every((r) => r.kind === "tool");

    return isTool ? rows.length : rows.reduce((sum, r) => sum + (r.kind === "tool" ? 1 : r.quantity ?? 0), 0);
}

function kindOk(kind: Kind, rows: Row[]): boolean {
    const kinds = kindsOf(rows);

    if (kinds.size > 1) {
        return false;
    }

    return kind === "either" || kinds.has(kind);
}

function altSatisfied(alts: Alt[] | undefined, rows: Row[]): boolean {
    if (!alts || rows.length === 0) {
        return false;
    }

    return alts.some(
        (a) =>
            rows.every((r) => nameMatches(a.names, r.name) && locMatches(a.loc, r.location)) &&
            kindOk(a.kind, rows) &&
            a.qty.includes(amount(rows)),
    );
}

function candidates(items: Item[], row: Row): Item[] {
    return items.filter((item) => {
        if (nameMatches(item.names, row.name)) {
            return true;
        }

        return (item.type === "draft" || item.type === "ask") && (item.alt ?? []).some((a) => nameMatches(a.names, row.name));
    });
}

function itemLoc(item: Item): Loc | undefined {
    if (item.type === "draft" || item.type === "skip") {
        return item.loc;
    }

    if (item.type === "ask") {
        return item.alt?.[0]?.loc;
    }

    return undefined;
}

const TYPE_ORDER: Record<Item["type"], number> = { draft: 0, ask: 1, skip: 2, absent: 3 };

function pickCandidate(found: Item[], row: Row): Item {
    const byLocation = found.filter((item) => {
        const loc = itemLoc(item);

        return loc === undefined || loc === null || loc.re.test(row.location);
    });
    const pool = byLocation.length > 0 ? byLocation : found;

    return [...pool].sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type])[0];
}

export function gradeCheckpoint(args: {
    scenarioId: string;
    truth: Item[];
    rows: Row[];
    reply: string;
    earlierReplies: string[];
    overrides?: Overrides;
}): CheckpointGrade {
    const { scenarioId, truth, rows, reply, earlierReplies, overrides = {} } = args;
    const questions = extractQuestions(reply);
    const earlierQuestions = earlierReplies.flatMap(extractQuestions);
    // A request to restate the whole message ("I couldn't understand that, could you rephrase?") asks about
    // every item in it. Grader correction G1, added after it first appeared; see README.
    const wholeMessageAsk = questions.some((qn) => GENERIC_CLARIFICATION.test(qn));
    const savedLine = alreadySavedSection(reply);
    const assigned = new Map<string, Row[]>(truth.map((item) => [item.id, []]));
    const extras: Row[] = [];

    for (const row of rows) {
        const override = overrides[row.name];

        if (override?.startsWith("assign:")) {
            const itemId = override.slice("assign:".length);

            if (assigned.has(itemId)) {
                assigned.get(itemId)!.push(row);
                continue;
            }
        }

        const found = candidates(truth, row);

        if (found.length === 0) {
            extras.push(row);
            continue;
        }

        assigned.get(pickCandidate(found, row).id)!.push(row);
    }

    const items = truth.map((item): ItemResult => {
        const rs = assigned.get(item.id) ?? [];
        const kw = item.type === "draft" ? item.kw ?? item.names.all[item.names.all.length - 1] : item.type === "ask" ? item.kw : null;
        const asked = kw !== null && (wholeMessageAsk || questions.some((qn) => kw.test(qn)));
        const base = { itemId: item.id, type: item.type, rowIds: rs.map((r) => r.id), asked };

        if (item.type === "draft") {
            const askOk = isAskOk(scenarioId, item);

            if (rs.length === 0) {
                return asked
                    ? { ...base, outcome: "ok_asked_instead", detail: "asked instead of drafting", inaccurateRows: 0, unnecessaryAsk: !askOk }
                    : { ...base, outcome: "omitted", detail: "not drafted and not asked about", inaccurateRows: 0, unnecessaryAsk: false };
            }

            if (altSatisfied(item.alt, rs)) {
                return { ...base, outcome: "ok_alt", detail: "faithful alternative representation", inaccurateRows: 0, unnecessaryAsk: false };
            }

            const problems: { outcome: Outcome; detail: string; rows: number }[] = [];

            if (!kindOk(item.kind, rs)) {
                problems.push({ outcome: "wrong_kind", detail: `expected ${item.kind}, got ${[...kindsOf(rs)].join("+")}`, rows: rs.length });
            }

            const badLoc = rs.filter((r) => !locMatches(item.loc, r.location));

            if (badLoc.length > 0) {
                problems.push({
                    outcome: item.loc === null ? "invented_location" : "wrong_location",
                    detail: `location ${[...new Set(badLoc.map((r) => r.location))].join(", ")}`,
                    rows: badLoc.length,
                });
            }

            const inventoryRows = rs.filter((r) => r.kind === "inventory");
            const locations = inventoryRows.map((r) => normLoc(r.location));
            const sharedLocation = new Set(locations).size < locations.length;

            if (inventoryRows.length > 1 && sharedLocation) {
                problems.push({ outcome: "duplicate_rows", detail: `${inventoryRows.length} rows for one item`, rows: inventoryRows.length - 1 });
            }

            const got = amount(rs);

            if (!item.qty.includes(got)) {
                const extraToolRows = rs.every((r) => r.kind === "tool") ? Math.max(0, got - item.qty[0]) : 1;
                problems.push({ outcome: "wrong_qty", detail: `expected ${item.qty.join(" or ")}, got ${got}`, rows: extraToolRows });
            }

            if (problems.length === 0) {
                const split = inventoryRows.length > 1;

                return {
                    ...base,
                    outcome: split ? "ok_split" : "ok_draft",
                    detail: split ? "split across sub-locations" : "",
                    inaccurateRows: 0,
                    unnecessaryAsk: false,
                };
            }

            return {
                ...base,
                outcome: problems[0].outcome,
                detail: problems.map((p) => `${p.outcome}: ${p.detail}`).join("; "),
                inaccurateRows: Math.min(rs.length, Math.max(...problems.map((p) => p.rows))),
                unnecessaryAsk: false,
            };
        }

        if (item.type === "ask") {
            if (rs.length === 0) {
                if (asked) {
                    return { ...base, outcome: "ok_ask", detail: "", inaccurateRows: 0, unnecessaryAsk: false };
                }

                if (item.skipOk && nameMatches(item.names, savedLine)) {
                    return { ...base, outcome: "ok_skip", detail: "treated as already saved, and said so", inaccurateRows: 0, unnecessaryAsk: false, reportedSkip: true };
                }

                const askedBefore = earlierQuestions.some((qn) => item.kw.test(qn));

                return askedBefore
                    ? { ...base, outcome: "ok_asked_earlier", detail: "asked in an earlier reply, still open", inaccurateRows: 0, unnecessaryAsk: false }
                    : { ...base, outcome: "omitted", detail: "underdetermined item neither asked about nor drafted", inaccurateRows: 0, unnecessaryAsk: false };
            }

            if (altSatisfied(item.alt, rs)) {
                return { ...base, outcome: "ok_alt", detail: "faithful alternative representation", inaccurateRows: 0, unnecessaryAsk: false };
            }

            const desc = rs.map((r) => `${r.name} (${r.kind === "tool" ? "tool" : `qty ${r.quantity}`}, ${r.location})`).join("; ");

            return { ...base, outcome: "fabricated", detail: `drafted a value the supervisor never gave: ${desc}`, inaccurateRows: rs.length, unnecessaryAsk: false };
        }

        if (item.type === "skip") {
            const reportedSkip = nameMatches(item.names, savedLine) || asked;

            return rs.length === 0
                ? { ...base, outcome: "ok_skip", detail: reportedSkip ? "reported" : "not mentioned", inaccurateRows: 0, unnecessaryAsk: false, reportedSkip }
                : { ...base, outcome: "duplicate_of_saved", detail: `drafted ${rs.map((r) => r.name).join(", ")} again`, inaccurateRows: rs.length, unnecessaryAsk: false, reportedSkip };
        }

        return rs.length === 0
            ? { ...base, outcome: "ok_absent", detail: "", inaccurateRows: 0, unnecessaryAsk: false }
            : { ...base, outcome: "retracted_drafted", detail: `drafted ${rs.map((r) => r.name).join(", ")}`, inaccurateRows: rs.length, unnecessaryAsk: false };
    });

    // A row the key can't place is counted as inaccurate until a human reviews it: either it's a name the
    // matcher missed (adjudicated with an "assign:" override and graded normally) or it's a hallucination.
    return {
        items,
        extras,
        rows: rows.length,
        inaccurateRows: items.reduce((sum, r) => sum + r.inaccurateRows, 0) + extras.length,
        questions,
    };
}

export function checkpointAccurate(g: CheckpointGrade): boolean {
    return g.extras.length === 0 && g.items.every((r) => !isInaccurate(r.outcome));
}
