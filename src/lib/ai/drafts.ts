import { randomUUID } from "crypto";
import type Anthropic from "@anthropic-ai/sdk";

const MAX_TOOLS_PER_CALL = 100;

export type InventoryDraft = {
    id: string;
    kind: "inventory";
    name: string;
    category: string;
    location: string;
    quantity: number;
    reorderThreshold: number;
};

export type ToolDraft = {
    id: string;
    kind: "tool";
    name: string;
    category: string;
    location: string;
};

export type Draft = InventoryDraft | ToolDraft;

export const DRAFT_TOOLS: Anthropic.Tool[] = [
    {
        name: "propose_inventory_item",
        description: "Add a new supply item (something tracked by quantity, like batteries), to the draft list for the supervisor to review. Does not save anything yet.",
        input_schema: {
            type: "object",
            properties: {
                name: { type: "string", description: "General, recognizable name, e.g. '9V Batteries'" },
                category: { type: "string" },
                location: { type: "string", description: "Per your system prompt, locations are to be defined by the user. If you are confused you can infer locations based on conversation context, but only if it is a very plausible inference. Refer to the system prompt contexts if you are unsure what to do." },
                quantity: { type: "number", description: "Total individual units, not boxes or packs. Ask for quantity per package if you are unsure." },
                reorderThreshold: { type: "number", description: "Suggested low-stock threshold." }
            },
            required: ["name", "category", "location", "quantity", "reorderThreshold"],
        },
    },
    {
        name: "propose_tool",
        description: "Add one or more physical tools (equipment that gets checked out, like drills and ladders) to the draft list. Each one becomes its own separate record. Does not save anything yet.",
        input_schema: {
            type: "object",
            properties: {
                name: { type: "string", description: "General name, e.g. 'Impact Driver', you should distinguish between tools like 'Impact Driver' and 'Hammer Drill', where possible. Tools that are clearly duplicates should be separate, numbered records entirely like 'Impact Driver 1, Impact Driver 2', etc." },
                category: { type: "string" },
                location: { type: "string", description: "Per your system prompt, locations are to be defined by the user. If you are confused you can infer locations based on conversation context, but only if it is a very plausible inference. Refer to the system prompt contexts if you are unsure what to do." },
                count: { type: "number", description: "How many identical ones to create minimum 1. E.g multiple Hammer Drills exist, and will need their own records so they can be checked out individually by different users." },
            },
            required: ["name", "category", "location", "count"],
        },
    },
    {
        name: "update_draft",
        description: "Correct a draft that was already proposed earlier in this conversation, instead of creating a duplicate. Only include the fields you are changing.",
        input_schema: {
            type: "object",
            properties: {
                draftId: { type: "string" },
                name: { type: "string" },
                category: { type: "string" },
                location: { type: "string" },
                quantity: { type: "number" },
                reorderThreshold: { type: "number" },
            },
            required: ["draftId"],
        },
    },
    {
        name: "remove_draft",
        description: "Take back a draft that was proposed in this conversation and shouldn't be added after all.",
        input_schema: {
            type: "object",
            properties: { draftId: { type: "string" }, },
            required: ["draftId"],
        },
    },
];

function highestTakenNumber(baseName: string, names: string[]): number {
    const base = baseName.trim().toLowerCase();
    let highest = 0;

    for (const name of names) {
        const lower = name.trim().toLowerCase();

        if (lower === base) {
            highest = Math.max(highest, 1);
        } else if (lower.startsWith(base + " ")) {
            const suffix = lower.slice(base.length + 1);

            if (/^\d+$/.test(suffix)) {
                highest = Math.max(highest, Number(suffix));
            }
        }
    }

    return highest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function executeTool(name: string, input: unknown, drafts: Draft[], existingToolNames: string[] = []): string {
    if (!isRecord(input)) {
        return "Error: missing input";
    }

    switch (name) {
        case "propose_inventory_item": {
            const { name: itemName, category, location, quantity, reorderThreshold } = input;

            if (
                typeof itemName !== "string" ||
                typeof category !== "string" ||
                typeof location !== "string" ||
                typeof quantity !== "number" ||
                typeof reorderThreshold !== "number"
            ) {
                return "Error: propose_inventory_item is missing a required field."
            }

            const draft: InventoryDraft = {
                id: randomUUID(),
                kind: "inventory",
                name: itemName,
                category,
                location,
                quantity,
                reorderThreshold,
            };

            drafts.push(draft);

            return `Added draft ${draft.id}: ${itemName} (qty ${quantity}).`;
        }

        case "propose_tool": {
			const { name: toolName, category, location, count } = input;

			if (
				typeof toolName !== "string" ||
				typeof category !== "string" ||
				typeof location !== "string" ||
				typeof count !== "number"
			) {
				return "Error: propose_tool is missing a required field.";
			}

			if (!Number.isInteger(count) || count < 1 || count > MAX_TOOLS_PER_CALL) {
				return `Error: propose_tool count must be a whole number from 1 to ${MAX_TOOLS_PER_CALL}.`;
			}

			const takenNames = [...existingToolNames, ...drafts.filter((d) => d.kind === "tool").map((d) => d.name)];
			const highestTaken = highestTakenNumber(toolName, takenNames);
			const isNumbered = highestTaken > 0 || count > 1;
			const created: ToolDraft[] = [];

			for (let i = 1; i <= count; i++) {
				const draft: ToolDraft = {
					id: randomUUID(),
					kind: "tool",
					name: isNumbered ? `${toolName} ${highestTaken + i}` : toolName,
					category,
					location,
				};

				drafts.push(draft);
				created.push(draft);
			}

			return `Added ${created.length} draft tool(s): ${created.map((d) => `${d.id} (${d.name})`).join(", ")}.`;
		}
        
        case "update_draft": {
            const { draftId } = input;

            if (typeof draftId !== "string") {
                return "Error: update_draft requires draftId.";
            }

            const draft = drafts.find((d) => d.id === draftId);

            if (!draft) {
                return `Error: no draft with id ${draftId}.`;
            }

            if (typeof input.name === "string") draft.name = input.name;
            if (typeof input.category === "string") draft.category = input.category;
            if (typeof input.location === "string") draft.location = input.location;

            if (draft.kind === "inventory") {
                if (typeof input.quantity === "number") draft.quantity = input.quantity;
                if (typeof input.reorderThreshold === "number") draft.reorderThreshold = input.reorderThreshold;
            }

            return `Updated draft ${draftId}.`;
        }

        case "remove_draft": {
            const { draftId } = input;

            if (typeof draftId !== "string") {
                return "Error: remove_draft requires draftId.";
            }

            const index = drafts.findIndex((d) => d.id === draftId);


            if (index === -1) {
                return `Error: no draft with id ${draftId}.`;
            }

            drafts.splice(index, 1);

            return `Removed draft ${draftId}.`;
        }

        default:
            return `Error: unknown tool ${name}.`;
    }
}