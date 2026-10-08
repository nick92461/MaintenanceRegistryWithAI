// Free checks of the answer key and grader, run before any paid call:
//   oracle - a perfect draft table built from the key must grade 100% accurate on every checkpoint
//   null   - an empty table and empty reply must fail every checkpoint that expects a draft or a question
//   wrong  - one wrong quantity, a wrong location, a duplicate of a saved record, and a hallucinated row must each fail

import { describe, expect, it } from "vitest";
import { checkpointAccurate, gradeCheckpoint, nameMatches, type Row } from "./grade";
import { SCENARIOS, type Item } from "./scenarios";

let counter = 0;
const id = () => `row-${++counter}`;

function sampleFromRegex(re: RegExp): string {
    return re.source
        .split("|")[0]
        .replace(/\\s[*+?]?/g, " ")
        .replace(/\\b/g, "")
        .replace(/[\\^$()?*+[\]]/g, "")
        .trim();
}

function oracleRows(truth: Item[]): Row[] {
    const rows: Row[] = [];

    for (const item of truth) {
        if (item.type !== "draft") {
            continue;
        }

        const location = item.loc?.ex ?? "";
        const qty = item.qty[0];

        if (item.kind === "tool") {
            for (let i = 1; i <= qty; i++) {
                rows.push({ id: id(), kind: "tool", name: qty > 1 ? `${item.ex} ${i}` : item.ex, category: "Test", location });
            }
        } else {
            rows.push({ id: id(), kind: "inventory", name: item.ex, category: "Test", location, quantity: qty });
        }
    }

    return rows;
}

function oracleReply(truth: Item[]): string {
    const asks = truth.filter((item) => item.type === "ask");

    if (asks.length === 0) {
        return "Done.";
    }

    const lines = asks.map((item, i) => `${i + 1}. ${item.type === "ask" ? sampleFromRegex(item.kw) : ""}: how many exactly?`);

    return [`${asks.length} items need clarification. Could you tell me:`, ...lines].join("\n");
}

const checkpoints = SCENARIOS.flatMap((s) => s.turns.map((turn, index) => ({ s, turn, index })));

describe("answer key self-consistency", () => {
    it("every draft example name matches its own matcher", () => {
        const bad = checkpoints.flatMap(({ s, turn }) =>
            turn.truth.filter((item) => item.type === "draft" && !nameMatches(item.names, item.ex)).map((item) => `${s.id}:${item.id}`),
        );

        expect(bad).toEqual([]);
    });

    it("item ids are unique within each checkpoint", () => {
        const bad = checkpoints.filter(({ turn }) => new Set(turn.truth.map((i) => i.id)).size !== turn.truth.length).map(({ s }) => s.id);

        expect(bad).toEqual([]);
    });

    it("scenario ids are unique and demo-mode messages fit the demo's 1,500-character cap", () => {
        expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);

        const tooLong = SCENARIOS.filter((s) => s.mode === "demo" && s.turns.some((t) => t.say.length > 1500)).map((s) => s.id);

        expect(tooLong).toEqual([]);
    });
});

describe("oracle: a perfect answer passes every checkpoint", () => {
    it.each(checkpoints.map(({ s, turn, index }) => [`${s.id} turn ${index + 1}`, s.id, turn.truth] as const))("%s", (_label, scenarioId, truth) => {
        const grade = gradeCheckpoint({ scenarioId, truth: [...truth], rows: oracleRows([...truth]), reply: oracleReply([...truth]), earlierReplies: [] });

        expect({ extras: grade.extras, bad: grade.items.filter((r) => !r.outcome.startsWith("ok_")) }).toEqual({ extras: [], bad: [] });
        expect(checkpointAccurate(grade)).toBe(true);
    });
});

describe("null baseline: no drafts and no questions fails wherever something was expected", () => {
    it("fails every checkpoint that expects a draft or a question, and only those", () => {
        for (const { s, turn } of checkpoints) {
            const grade = gradeCheckpoint({ scenarioId: s.id, truth: turn.truth, rows: [], reply: "", earlierReplies: [] });
            const expectsSomething = turn.truth.some((item) => item.type === "draft" || item.type === "ask");

            expect(checkpointAccurate(grade), s.id).toBe(!expectsSomething);
        }
    });
});

describe("known-wrong answers fail", () => {
    const a01 = SCENARIOS.find((s) => s.id === "A01")!.turns[0].truth;
    const b01 = SCENARIOS.find((s) => s.id === "B01")!.turns[0].truth;

    it("a wrong quantity", () => {
        const rows = oracleRows(a01).map((r) => (r.name === "Wire Nuts" ? { ...r, quantity: 15 } : r));

        expect(gradeCheckpoint({ scenarioId: "A01", truth: a01, rows, reply: "", earlierReplies: [] }).items.find((r) => r.itemId === "wire-nuts")?.outcome).toBe("wrong_qty");
    });

    it("a wrong location", () => {
        const rows = oracleRows(a01).map((r) => (r.name === "Zip Ties" ? { ...r, location: "Shop B" } : r));

        expect(gradeCheckpoint({ scenarioId: "A01", truth: a01, rows, reply: "", earlierReplies: [] }).items.find((r) => r.itemId === "zip-ties")?.outcome).toBe("wrong_location");
    });

    it("an extra tool record", () => {
        const rows = [...oracleRows(a01), { id: id(), kind: "tool" as const, name: "Hammer Drill 3", category: "Test", location: "Shop A" }];

        expect(gradeCheckpoint({ scenarioId: "A01", truth: a01, rows, reply: "", earlierReplies: [] }).items.find((r) => r.itemId === "hammer-drills")?.outcome).toBe("wrong_qty");
    });

    it("a duplicate of a saved record", () => {
        const rows = [...oracleRows(b01), { id: id(), kind: "inventory" as const, name: "9 Volt Batteries", category: "Test", location: "Shop 1", quantity: 10 }];

        expect(gradeCheckpoint({ scenarioId: "B01", truth: b01, rows, reply: "", earlierReplies: [] }).items.find((r) => r.itemId === "9v")?.outcome).toBe("duplicate_of_saved");
    });

    it("a hallucinated row", () => {
        const rows = [...oracleRows(a01), { id: id(), kind: "inventory" as const, name: "Drywall Nails", category: "Test", location: "Shop A", quantity: 5 }];
        const grade = gradeCheckpoint({ scenarioId: "A01", truth: a01, rows, reply: "", earlierReplies: [] });

        expect(grade.extras.map((r) => r.name)).toEqual(["Drywall Nails"]);
        expect(checkpointAccurate(grade)).toBe(false);
    });

    it("a guessed value for an underdetermined item", () => {
        const b15 = SCENARIOS.find((s) => s.id === "B15")!.turns[0].truth;
        const rows: Row[] = [{ id: id(), kind: "inventory", name: "AA Batteries", category: "Test", location: "Shop 4", quantity: 36 }];

        expect(gradeCheckpoint({ scenarioId: "B15", truth: b15, rows, reply: "", earlierReplies: [] }).items[0].outcome).toBe("fabricated");
    });

    it("an invented location when none was given", () => {
        const b56 = SCENARIOS.find((s) => s.id === "B56")!.turns[0].truth;
        const rows: Row[] = [{ id: id(), kind: "inventory", name: "Door Stops", category: "Test", location: "Shop 1", quantity: 12 }];

        expect(gradeCheckpoint({ scenarioId: "B56", truth: b56, rows, reply: "", earlierReplies: [] }).items[0].outcome).toBe("invented_location");
    });

    it("the right item under a reasonable alternative name and a faithful box count still passes", () => {
        const a10 = SCENARIOS.find((s) => s.id === "A10")!.turns[0].truth;
        const rows: Row[] = [
            { id: id(), kind: "inventory", name: "Drywall Screws (Box)", category: "Fasteners", location: "Shop A", quantity: 3 },
            { id: id(), kind: "inventory", name: "Deck Screws - Box", category: "Fasteners", location: "Shop A", quantity: 2 },
        ];
        const grade = gradeCheckpoint({ scenarioId: "A10", truth: a10, rows, reply: "", earlierReplies: [] });

        expect(grade.items.map((r) => r.outcome)).toEqual(["ok_alt", "ok_alt"]);
    });
});
