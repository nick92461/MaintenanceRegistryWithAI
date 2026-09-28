import { describe, it, expect } from "vitest";
import { rejectSavedDuplicate, renderReport, runLedgerTool, type LedgerEvent } from "./ledger";
import type { Draft } from "./drafts";
import type { ExistingRecords } from "./records";

const existing: ExistingRecords = {
	inventory: [
		{ name: "AA Batteries", category: "Batteries", location: "Shop 1", quantity: 1241, reorderThreshold: 20 },
		{ name: "Zip Ties (pack)", category: "Fasteners", location: "Shop 1", quantity: 605, reorderThreshold: 12 },
	],
	tools: [{ name: "Cordless Drill", category: "Power Tools", location: "Shop 1" }],
};

const drafts: Draft[] = [
	{ id: "d1", kind: "inventory", name: "Duct Tape", category: "Tape", location: "Shop 1", quantity: 12, reorderThreshold: 4 },
];

describe("runLedgerTool skip_existing", () => {
	it("records a skipped saved item with the quantity from the database", () => {
		const events: LedgerEvent[] = [];

		const result = runLedgerTool("skip_existing", { mentioned: "AA batteries", existingName: "AA Batteries", location: "Shop 1" }, existing, [], events);

		expect(result).toBe("Recorded.");
		expect(events).toEqual([{ kind: "skipped", source: "saved", name: "AA Batteries", location: "Shop 1", quantity: 1241 }]);
	});

	it("matches ignoring case, punctuation, and word order", () => {
		const events: LedgerEvent[] = [];

		runLedgerTool("skip_existing", { mentioned: "zip ties", existingName: "pack zip ties", location: "shop 1" }, existing, [], events);

		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({ name: "Zip Ties (pack)", quantity: 605 });
	});

	it("records a skipped saved tool without a quantity", () => {
		const events: LedgerEvent[] = [];

		runLedgerTool("skip_existing", { mentioned: "drill", existingName: "Cordless Drill", location: "Shop 1" }, existing, [], events);

		expect(events).toEqual([{ kind: "skipped", source: "saved", name: "Cordless Drill", location: "Shop 1" }]);
	});

	it("records a skipped draft", () => {
		const events: LedgerEvent[] = [];

		runLedgerTool("skip_existing", { mentioned: "duct tape", existingName: "Duct Tape", location: "Shop 1" }, existing, drafts, events);

		expect(events).toEqual([{ kind: "skipped", source: "draft", name: "Duct Tape", location: "Shop 1" }]);
	});

	it("rejects a claim that does not match any record, and records nothing", () => {
		const events: LedgerEvent[] = [];

		const result = runLedgerTool("skip_existing", { mentioned: "hammer", existingName: "Claw Hammer", location: "Shop 1" }, existing, drafts, events);

		expect(result.toLowerCase()).toContain("error");
		expect(events).toHaveLength(0);
	});

	it("rejects a match in the wrong location", () => {
		const events: LedgerEvent[] = [];

		const result = runLedgerTool("skip_existing", { mentioned: "AA", existingName: "AA Batteries", location: "Shop 2" }, existing, [], events);

		expect(result.toLowerCase()).toContain("error");
		expect(events).toHaveLength(0);
	});

	it("records the same skipped item only once", () => {
		const events: LedgerEvent[] = [];
		const input = { mentioned: "AA", existingName: "AA Batteries", location: "Shop 1" };

		runLedgerTool("skip_existing", input, existing, [], events);
		runLedgerTool("skip_existing", input, existing, [], events);

		expect(events).toHaveLength(1);
	});
});

describe("runLedgerTool ask_clarification", () => {
	it("records a question", () => {
		const events: LedgerEvent[] = [];

		const result = runLedgerTool("ask_clarification", { item: "light bulbs", question: "What color temperature?" }, existing, [], events);

		expect(result).toBe("Recorded.");
		expect(events).toEqual([{ kind: "question", item: "light bulbs", question: "What color temperature?" }]);
	});

	it("reports an error for missing fields and records nothing", () => {
		const events: LedgerEvent[] = [];

		const result = runLedgerTool("ask_clarification", { item: "light bulbs" }, existing, [], events);

		expect(result.toLowerCase()).toContain("error");
		expect(events).toHaveLength(0);
	});
});

describe("rejectSavedDuplicate", () => {
	it("rejects an item that matches a saved record by name and location, and reports it as skipped", () => {
		const events: LedgerEvent[] = [];

		const result = rejectSavedDuplicate({ name: "batteries, aa", location: "shop 1" }, existing, events);

		expect(result).toContain("already saved");
		expect(events).toEqual([{ kind: "skipped", source: "saved", name: "AA Batteries", location: "Shop 1", quantity: 1241 }]);
	});

	it("allows the same item in a different location", () => {
		const events: LedgerEvent[] = [];

		expect(rejectSavedDuplicate({ name: "AA Batteries", location: "Shop 3" }, existing, events)).toBeUndefined();
		expect(events).toHaveLength(0);
	});

	it("ignores input it cannot read", () => {
		expect(rejectSavedDuplicate({ name: "AA Batteries" }, existing, [])).toBeUndefined();
		expect(rejectSavedDuplicate(null, existing, [])).toBeUndefined();
	});
});

describe("renderReport", () => {
	it("reports only the count when that is all there is", () => {
		expect(renderReport(20, [], "NO_REPLY")).toBe("20 items added to the draft.");
	});

	it("uses the singular for one item", () => {
		expect(renderReport(1, [], "")).toBe("1 item added to the draft.");
	});

	it("lists skipped saved items with their quantities", () => {
		const events: LedgerEvent[] = [
			{ kind: "skipped", source: "saved", name: "AA Batteries", location: "Shop 1", quantity: 1241 },
			{ kind: "skipped", source: "saved", name: "Cordless Drill", location: "Shop 1" },
			{ kind: "skipped", source: "draft", name: "Duct Tape", location: "Shop 1" },
		];

		expect(renderReport(2, events, "")).toBe(
			"2 items added to the draft.\n\nAlready saved, not added: AA Batteries (Shop 1, qty 1241); Cordless Drill (Shop 1); Duct Tape (already in your draft).",
		);
	});

	it("numbers the questions and states a count equal to how many were asked", () => {
		const events: LedgerEvent[] = [
			{ kind: "question", item: "light bulbs", question: "What color temperature?" },
			{ kind: "question", item: "paint", question: "Interior or exterior?" },
		];

		expect(renderReport(15, events, "")).toBe(
			"15 items added to the draft.\n\n2 items need clarification. Could you tell me:\n1. light bulbs: What color temperature?\n2. paint: Interior or exterior?",
		);
	});

	it("uses the singular for one question", () => {
		const events: LedgerEvent[] = [{ kind: "question", item: "paint", question: "Interior or exterior?" }];

		expect(renderReport(0, events, "")).toContain("1 item needs clarification.");
	});

	it("drops the NO_REPLY marker but keeps real text from Claude", () => {
		expect(renderReport(3, [], "NO_REPLY")).toBe("3 items added to the draft.");
		expect(renderReport(0, [], "  That is outside what I can help with.  ")).toBe("That is outside what I can help with.");
	});

	it("never returns an empty reply", () => {
		expect(renderReport(0, [], "")).toBe("Done.");
		expect(renderReport(0, [], "NO_REPLY")).toBe("Done.");
	});
});