"use client";

import { useRef, useState } from "react";
import { sendAssistantMessage } from "@/lib/actions/assistant";
import { ChatMessage } from "@/lib/ai/claude";

export function useAssistantChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inFlight = useRef(false);

    async function send(text: string) {
        const trimmed = text.trim();

        if (trimmed.length === 0 || inFlight.current) {
            return false;
        }

        inFlight.current = true;

        const previousMessages = messages;
        const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];

        setMessages(nextMessages);
        setIsPending(true);
        setError(null);

        const result = await sendAssistantMessage(nextMessages);

        inFlight.current = false;
        setIsPending(false);

        if (!result.reply) {
            setMessages(previousMessages);
            setError(result.error ?? "Something went wrong");
            return false;
        }

        setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
        return true;
    }

    return { messages, isPending, error, send };
}