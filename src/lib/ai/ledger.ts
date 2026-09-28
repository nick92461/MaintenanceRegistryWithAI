import type Anthropic from "@anthropic-ai/sdk";
import { executeTool, isRecord, normalizeForMatch, type Draft } from "./drafts";
import type { ExistingRecords } from "./records";

export const NO_REPLY = "NO_REPLY";

export type SkippedEvent = {
    kind: "skipped";
    source: "saved" | "draft";
    name: string;
    location: string;
    quantity?: number;
};

export type QuestionEvent = {
    kind: "question";
    item: string;
    question: string;
};

export type UpdatedEvent = {
    kind: "updated";
    name: string;
    changes: string[];
};

export type RemovedEvent = {
    kind: "removed";
    name: string;
};

export type LedgerEvent = SkippedEvent | QuestionEvent | UpdatedEvent | RemovedEvent;

export const LEDGER_TOOLS: Anthropic.Tool[] = [
    {
        name: "skip_existing",
        description: "Record that you are not drafting an item the supervisor mentioned because it already exists as a saved record or a draft. Call once per skipped item. Use the exact record name and location shown by list_records or the draft list.",
        input_schema: {
            type: "object",
            properties: {
                mentioned: { type: "string", description: "What the supervisor called the item" },
                existingName: { type: "string", description: "Exact name of the existing record" },
                location: { type: "string", description: "Location of that existing record" },
            },
            required: ["mentioned", "existingName", "location"],
        },
    },
    {
        name: "ask_clarification",
        description: "Record that an item the supervisor mentioned needs clarification before it can be drafted. Call once per item, with one short question. Do not draft that item yet. Also call it again for any earlier question the supervisor has not answered yet.",
        input_schema: {
            type: "object",
            properties: {
                item: { type: "string", description: "The item as the supervisor described it" },
                question: { type: "string", description: "One short question" },
            },
            required: ["item", "question"],
        },
    },
];

function eventKey(event: LedgerEvent): string {
    switch (event.kind) {
        case "skipped":
            return `skipped|${normalizeForMatch(event.name)}|${normalizeForMatch(event.location)}`;
        case "question":
            return `question|${normalizeForMatch(event.item)}`;
        case "updated":
            return `updated|${normalizeForMatch(event.name)}|${event.changes.join(",")}`;
        case "removed":
            return `removed|${normalizeForMatch(event.name)}`;
    }
}

function addEvent(events: LedgerEvent[], event: LedgerEvent) {
    if (!events.some((existing) => eventKey(existing) === eventKey(event))) {
        events.push(event);
    }
}

export function runLedgerTool(
    name: string,
    input: unknown,
    existing: ExistingRecords,
    drafts: Draft[],
    events: LedgerEvent[],
): string {
    if (!isRecord(input)) {
        return "Error: missing input.";
    }

    if (name === "skip_existing") {
        const { existingName, location } = input;

        if (typeof existingName !== "string" || typeof location !== "string") {
            return "Error: skip_existing need existingName and location.";
        }

        const wantedName = normalizeForMatch(existingName);
        const wantedLocation = normalizeForMatch(location);
        const matches = (record: { name: string; location: string; }) =>
            normalizeForMatch(record.name) === wantedName && normalizeForMatch(record.location) === wantedLocation;

        const inventoryItem = existing.inventory.find(matches);
        const tool = existing.tools.find(matches);
        const draft = drafts.find(matches);

        if (inventoryItem) {
            addEvent(events, {
                kind: "skipped",
                source: "saved",
                name: inventoryItem.name,
                location: inventoryItem.location,
                quantity: inventoryItem.quantity,
            });
        } else if (tool) {
            addEvent(events, {
                kind: "skipped",
                source: "saved",
                name: tool.name,
                location: tool.location,
            });
        } else if (draft) {
            addEvent(events, {
                kind: "skipped",
                source: "draft",
                name: draft.name,
                location: draft.location,
            });
        } else {
            return `Error: no saved record or draft named "${existingName}" in ${location}. Use the exact name and location shown by list_records, or draft the item.`;
        }

        return "Recorded.";
    }

    if (name === "ask_clarification") {
        const { item, question } = input;

        if (typeof item !== "string" || typeof question !== "string") {
            return "Error: ask_clarification needs item and question.";
        }

        addEvent(events, { kind: "question", item, question });

        return "Recorded.";
    }

    return `Error: unknown tool ${name}.`;
}

function describeChanges(before: Draft, after: Draft): string[] {
    const changes: string[] = [];

    if (before.name !== after.name) changes.push(`renamed from ${before.name}`);
    if (before.category !== after.category) changes.push(`category ${before.category} to ${after.category}`);
    if (before.location !== after.location) changes.push(`location ${before.location} to ${after.location}`);

    if (before.kind === "inventory" && after.kind === "inventory") {
        if (before.quantity !== after.quantity) changes.push(`quantity ${before.quantity} to ${after.quantity}`);
        if (before.reorderThreshold !== after.reorderThreshold) changes.push(`reorder level ${before.reorderThreshold} to ${after.reorderThreshold}`);
    }
    return changes;
}

export function runDraftEdit(
    name: "update_draft" | "remove_draft",
    input: unknown,
    drafts: Draft[],
    events: LedgerEvent[],
): string {
    const draftId = isRecord(input) ? input.draftId : undefined;
    const found = typeof draftId === "string" ? drafts.find((d) => d.id === draftId) : undefined;
    const before = found ? { ...found } : undefined;

    const result = executeTool(name, input, drafts);

    if (!before || result.startsWith("Error")) {
        return result;
    }

    if (name === "remove_draft") {
        addEvent(events, { kind: "removed", name: before.name });

        return result;
    }

    const after = drafts.find((d) => d.id === before.id);
    const changes = after ? describeChanges(before, after) : [];

    if (after && changes.length > 0) {
        addEvent(events, { kind: "updated", name: after.name, changes });
    }

    return result;
}

export function rejectSavedDuplicate(input: unknown, existing: ExistingRecords, events: LedgerEvent[]): string | undefined {
    if (!isRecord(input)) {
        return undefined;
    }

    const { name, location } = input;

    if (typeof name !== "string" || typeof location !== "string") {
        return undefined;
    }

    const wantedName = normalizeForMatch(name);
    const wantedLocation = normalizeForMatch(location);
    const saved = existing.inventory.find(
        (item) => normalizeForMatch(item.name) === wantedName && normalizeForMatch(item.location) === wantedLocation,
    );

    if (!saved) {
        return undefined;
    }

    addEvent(events, { kind: "skipped", source: "saved", name: saved.name, location: saved.location, quantity: saved.quantity });

    return `Error: "${saved.name}" in ${saved.location} is already saved (qty ${saved.quantity}), so it was not drafted. The supervisor is told automatically.`;
}

export function renderReport(addedCount: number, events: LedgerEvent[], claudeText: string): string {
    const parts: string[] = [];

    if (addedCount > 0) {
        parts.push(`${addedCount} ${addedCount === 1? "item" : "items"} added to the draft.`);
    }

    const updated = events.filter((event): event is UpdatedEvent => event.kind === "updated");

    if (updated.length > 0) {
        const list = updated.map((event) => `${event.name} (${event.changes.join(", ")})`).join("; ");

        parts.push(`Updated in the draft: ${list}.`);
    }

    const removed = events.filter((event): event is RemovedEvent => event.kind === "removed");

    if (removed.length > 0) {
        parts.push(`Removed from the draft: ${removed.map((event) => event.name).join(", ")}.`);
    }

    const skipped = events.filter((event): event is SkippedEvent => event.kind === "skipped");

    if (skipped.length > 0) {
        const list = skipped
            .map((event) => {
                if (event.source === "draft") {
                    return `${event.name} (already in your draft)`;
                }

                const quantity = event.quantity !== undefined ? `, qty ${event.quantity}` : "";

                return `${event.name} (${event.location}${quantity})`;
            }).join("; ");

            parts.push(`Already saved, not added: ${list}.`);
    }

    const questions = events.filter((event): event is QuestionEvent => event.kind === "question");

    if (questions.length > 0) {
        const heading = `${questions.length} ${questions.length === 1 ? "item needs" : "items need"} clarification. Could you tell me:`;

        const lines = questions.map((event, index) => `${index + 1}. ${event.item}: ${event.question}`);

        parts.push([heading, ...lines].join("\n"));
    }

    const text = claudeText.trim();

    if (text.length > 0 && text !== NO_REPLY) {
        parts.push(text);
    }

    return parts.length > 0 ? parts.join("\n\n") : "Done.";
}