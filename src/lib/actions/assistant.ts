"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { ASSISTANT_CONTEXTS, isAssistantContextKey, type AssistantContextKey } from "../ai/contexts";
import { requirePropertyRole } from "../auth/access";
import { LEAD_ROLES } from "../auth/propertyRole";
import { askClaude, type ChatMessage, type ClaudeTurn } from "../ai/claude";
import { countNewDrafts,executeTool, type Draft } from "../ai/drafts";
import { rejectSavedDuplicate, renderReport, runDraftEdit, runLedgerTool, type LedgerEvent } from "../ai/ledger";
import { withDraftList, formatRecords, type ExistingRecords } from "../ai/records";
import { getActiveInventoryItems } from "../data/inventory";
import { getActiveTools } from "../data/tools";
import { getClientAddress } from "../auth/clientAddress";
import { countDemoAssistantMessage, DEMO_MESSAGES, getAssistantSettings, hasOversizedUserMessage } from "../demo/assistantLimits";
import { isDemoMode } from "../demo/demoMode";

const MAX_MESSAGES = 50;

function isValidTranscript(messages: unknown, maxUserMessageLength: number): messages is ChatMessage[] {
	if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
		return false;
	}

	const allWellFormed = messages.every(
		(m) =>
			typeof m === "object" &&
		m !== null &&
		(m.role === "user" || m.role === "assistant") &&
		typeof m.content === "string" &&
		m.content.trim().length > 0 &&
		(m.role !== "user" || m.content.length <= maxUserMessageLength),
	);

	return allWellFormed && messages[messages.length - 1].role === "user";
}

export async function sendAssistantMessage(
	propertyId: string,
	context: AssistantContextKey,
	messages: ChatMessage[],
	drafts: Draft[] = [],
) {
	const access = await requirePropertyRole(propertyId, LEAD_ROLES);

	if ("error" in access) {
		return { error: access.error };
	}

	const verifiedPropertyId = access.propertyId;

	const demo = isDemoMode();
	const settings = getAssistantSettings(demo);

	if (demo && hasOversizedUserMessage(messages, settings.maxUserMessageLength)) {
		return { error: DEMO_MESSAGES.tooLong(settings.maxUserMessageLength) };
	}

	if (!isAssistantContextKey(context) || !isValidTranscript(messages, settings.maxUserMessageLength)) {
		return { error: "Invalid conversation" };
	}

	if (demo) {
		const limitMessage = await countDemoAssistantMessage(access.user.companyId, await getClientAddress());

		if (limitMessage) {
			return { error: limitMessage };
		}
	}

	const contextDef = ASSISTANT_CONTEXTS[context];
	const conversation: Anthropic.MessageParam[] = [...messages];
	const workingDrafts: Draft[] = [...drafts];
	const systemPrompt = withDraftList(contextDef.systemPrompt, drafts);
	const events: LedgerEvent[] = [];

	let existingRecords: Promise<ExistingRecords> | undefined;

	function loadExistingRecords() {
		if (!existingRecords) {
			existingRecords = Promise.all([getActiveInventoryItems(verifiedPropertyId), getActiveTools(verifiedPropertyId)]).then(([inventory, tools]) => ({ inventory, tools }));
		}

		return existingRecords;
	}

	async function runTool(name: string, input: unknown): Promise<string> {
		try {
			if (name === "list_records") {
				return formatRecords(await loadExistingRecords(), workingDrafts);
			}

			if (name === "skip_existing" || name === "ask_clarification") {
				return runLedgerTool(name, input, await loadExistingRecords(), workingDrafts, events);
			}

			if (name === "update_draft" || name === "remove_draft") {
				return runDraftEdit(name, input, workingDrafts, events);
			}

			if (name === "propose_inventory_item") {
				const duplicate = rejectSavedDuplicate(input, await loadExistingRecords(), events);

				if (duplicate) {
					return duplicate;
				}
			}

			const existingToolNames = name === "propose_tool" ? (await loadExistingRecords()).tools.map((tool) => tool.name) : [];

			return executeTool(name, input, workingDrafts, existingToolNames);
		} catch (err) {
			console.error(err);
			return "Error: could not read the existing records right now.";
		}
	}

	for (let round = 0; round < settings.maxToolRounds; round++) {
		let turn: ClaudeTurn;

		try {
			turn = await askClaude(conversation, {
				system: systemPrompt,
				tools: contextDef.tools,
				maxTokens: settings.maxOutputTokens,
			});
		} catch (err) {
			console.error(err);

			return {
				error: demo ? DEMO_MESSAGES.unavailable : "The assistant couldn't respond right now. Please try again.",
				drafts: workingDrafts,
			};
		}

		if (turn.stopReason === "max_tokens") {
			return { error: "That was too much to handle in one go. Try a shorter list.", drafts: workingDrafts };
		}

		if (turn.toolUses.length === 0) {
			return { reply: renderReport(countNewDrafts(drafts, workingDrafts), events, turn.text), drafts: workingDrafts };
		}

		conversation.push({
			role: "assistant",
			content: [
				...(turn.text ? [{ type: "text" as const, text: turn.text }] : []),
				...turn.toolUses.map((toolUse) => ({
					type: "tool_use" as const,
					id: toolUse.id,
					name: toolUse.name,
					input: toolUse.input,
				})),
			],
		});

		const toolResults: Anthropic.ToolResultBlockParam[] = [];

		for (const toolUse of turn.toolUses) {
			toolResults.push({
				type: "tool_result",
				tool_use_id: toolUse.id,
				content: await runTool(toolUse.name, toolUse.input),
			});
		}

		conversation.push({ role: "user", content: toolResults });
	}

	return { error: "The assistant is stuck making changes. Try rephrasing your last message.", drafts: workingDrafts };
}