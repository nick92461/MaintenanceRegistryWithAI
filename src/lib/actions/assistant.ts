"use server";

import { ASSISTANT_CONTEXTS, isAssistantContextKey, type AssistantContextKey } from "../ai/contexts";
import { getCurrentUserAndRenewSession } from "../auth/sessions";
import { Role } from "@/generated/prisma/enums";
import { askClaude, type ChatMessage } from "../ai/claude";

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4000;

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
        m.content.length <= MAX_MESSAGE_LENGTH, 
    );

    return allWellFormed && messages[messages.length - 1].role === "user";
}

export async function sendAssistantMessage(context: AssistantContextKey, messages: ChatMessage[]) {
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

    const reply = await askClaude(messages, ASSISTANT_CONTEXTS[context].systemPrompt);

    return { reply };
}