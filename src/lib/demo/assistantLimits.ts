import { isRateLimited, recordRateLimitHit } from "../auth/rateLimit";

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEMO_ASSISTANT_MESSAGES_PER_SANDBOX = 10;
export const DEMO_ASSISTANT_MESSAGES_PER_ADDRESS = 15;
export const DEMO_ASSISTANT_MESSAGES_PER_DAY = 40;

export type AssistantSettings = {
    maxUserMessageLength: number;
    maxToolRounds: number;
    maxOutputTokens?: number;
};

export function getAssistantSettings(demo: boolean): AssistantSettings {
    if (demo) {
        return { maxUserMessageLength: 1500, maxToolRounds: 6, maxOutputTokens: 4000 };
    }

    return { maxUserMessageLength: 50000, maxToolRounds: 15 };
}

export const DEMO_MESSAGES = {
    perSandbox: `You've used all ${DEMO_ASSISTANT_MESSAGES_PER_SANDBOX} assistant messages in this private demo. Everything else still works.`,
    perAddress: "You've reached today's assistant limit for the demo. Please come back tomorrow.",
    perDay: "The demo assistant has reached its daily limit. Everything else in the demo still works, and the assistant resets tomorrow.",
    unavailable: "The assistant isn't available right now, and may have reached its budget. Everything else in the demo still works.",
    tooLong: (limit: number) => `Messages are limited to ${limit.toLocaleString("en-US")} characters in the demo. Try a shorter list.`,
};

//Checks for any user message from messages array that is is oversized. Only one instance needs to be found to return true.
export function hasOversizedUserMessage(messages: unknown, limit: number): boolean {
    return (
        Array.isArray(messages) && messages.some((m) => typeof m === "object" && m !== null && m.role === "user" && typeof m.content === "string" && m.content.length > limit)
    );
}

//Counts all three demo limits and if none is hit counts this message agauinst each.
//It counts before the assistant runs so a call that fails still uses up its share.
//Returns the message to show the visitor when a limit is hit, otherwise null.
export async function countDemoAssistantMessage(companyId: string, address: string): Promise<string | null> {
    const sandboxKey = `assistant-sandbox:${companyId}`;
    const addressKey = `assistant-address:${address}`;
    const dayKey = "assistant-day";

    if (await isRateLimited(sandboxKey, DEMO_ASSISTANT_MESSAGES_PER_SANDBOX, DAY_MS)) {
        return DEMO_MESSAGES.perSandbox;
    }

    if (await isRateLimited(addressKey, DEMO_ASSISTANT_MESSAGES_PER_ADDRESS, DAY_MS)) {
        return DEMO_MESSAGES.perAddress;
    }

    if (await isRateLimited(dayKey, DEMO_ASSISTANT_MESSAGES_PER_DAY, DAY_MS)) {
        return DEMO_MESSAGES.perDay;
    }

    await recordRateLimitHit(sandboxKey, DAY_MS);
    await recordRateLimitHit(addressKey, DAY_MS);
    await recordRateLimitHit(dayKey, DAY_MS);

    return null;
}