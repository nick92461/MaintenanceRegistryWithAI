"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { ASSISTANT_CONTEXTS, isAssistantContextKey, type AssistantContextKey } from "../ai/contexts";
import { getCurrentUserAndRenewSession } from "../auth/sessions";
import { Role } from "@/generated/prisma/enums";
import { askClaude, type ChatMessage } from "../ai/claude";
import { executeTool, type Draft } from "../ai/drafts";

const MAX_MESSAGES = 50;
const MAX_USER_MESSAGE_LENGTH = 50000;
const MAX_TOOL_ROUNDS = 15;

function isValidTranscript(messages: unknown): messages is ChatMessage[] {
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
			(m.role !== "user" || m.content.length <= MAX_USER_MESSAGE_LENGTH),
	);

	return allWellFormed && messages[messages.length - 1].role === "user";
}

export async function sendAssistantMessage(
	context: AssistantContextKey,
	messages: ChatMessage[],
	drafts: Draft[] = [],
) {
	const currentUser = await getCurrentUserAndRenewSession();

	if (!currentUser) {
		return { error: "You must be logged in" };
	}

	if (currentUser.role !== Role.SUPERVISOR && currentUser.role !== Role.MANAGER) {
		return { error: "You do not have permission to do that" };
	}

	if (!isAssistantContextKey(context) || !isValidTranscript(messages)) {
		return { error: "Invalid conversation" };
	}

	const contextDef = ASSISTANT_CONTEXTS[context];
	const conversation: Anthropic.MessageParam[] = [...messages];
	const workingDrafts: Draft[] = [...drafts];

	for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
		const turn = await askClaude(conversation, { system: contextDef.systemPrompt, tools: contextDef.tools });

		if (turn.toolUses.length === 0) {
			return { reply: turn.text, drafts: workingDrafts };
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

		conversation.push({
			role: "user",
			content: turn.toolUses.map((toolUse) => ({
				type: "tool_result" as const,
				tool_use_id: toolUse.id,
				content: executeTool(toolUse.name, toolUse.input, workingDrafts),
			})),
		});
	}

	return { error: "The assistant is stuck making changes. Try rephrasing your last message.", drafts: workingDrafts };
}