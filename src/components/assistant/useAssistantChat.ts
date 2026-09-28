"use client";

import { useRef, useState } from "react";
import { sendAssistantMessage } from "@/lib/actions/assistant";
import { confirmDrafts } from "@/lib/actions/drafts";
import type { ChatMessage } from "@/lib/ai/claude";
import type { AssistantContextKey } from "@/lib/ai/contexts";
import type { Draft } from "@/lib/ai/drafts";

export type DraftEdit = {
    name?: string;
    category?: string;
    location?: string;
    quantity?: number;
    reorderThreshold?: number;
};

export function useAssistantChat(context: AssistantContextKey) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [drafts, setDrafts] = useState<Draft[]>([]);
	const [confirmErrors, setConfirmErrors] = useState<Record<string, string>>({});
	const [isPending, setIsPending] = useState(false);
	const [isConfirming, setIsConfirming] = useState(false);
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

        try {
            const result = await sendAssistantMessage(context, nextMessages, drafts);

            if (!result.reply) {
                setMessages(previousMessages);
                setError(result.error ?? "Something went wrong");
                return false;
            }

            setMessages([...nextMessages, { role: "assistant", content: result.reply }]);

            if (result.drafts) {
                setDrafts(result.drafts);
            }

            return true;
        } catch (err) {
            console.error(err);
            setMessages(previousMessages);
            setError("Something went wrong");
            return false;
        } finally {
            inFlight.current = false;
            setIsPending(false);
        }
    }

    function updateDraft(id: string, changes: DraftEdit) {
        setDrafts((current) => current.map((draft) => (draft.id === id? ({ ...draft, ...changes } as Draft) : draft)));

        setConfirmErrors((current) => {
            if (!(id in current)) {
                return current;
            }

            const next = { ...current };
            delete next[id];
            return next;
        });
    }

    function removeDraft(id: string) {
        setDrafts((current) => current.filter((draft) => draft.id !== id));

        setConfirmErrors((current) => {
            if (!(id in current)) {
                return current;
            }

            const next = { ...current };
            delete next[id];
            return next;
        });
    }

    async function confirm() {
        if (drafts.length === 0 || isConfirming) {
            return;
        }

        setIsConfirming(true);
        setError(null);

        try {
            const result = await confirmDrafts(drafts);

            if ("error" in result) {
                setError(result.error);
                return;
            }

            const failedIds = new Set(result.failed.map((f) => f.draftId));

            setDrafts((current) => current.filter((draft) => failedIds.has(draft.id)));
            setConfirmErrors(Object.fromEntries(result.failed.map((f) => [f.draftId, f.reason])));

            if (result.createdCount > 0) {
                setMessages((current) => [
                    ...current,
                    {
                        role: "assistant",
                        content: `${result.createdCount} record${result.createdCount === 1 ? "" : "s"} saved.`,
                    },
                ]);
            }
        } catch (err) {
            console.error(err);
            setError("Something went wrong while saving");
        } finally {
            setIsConfirming(false);
        }
    }

    return { messages, drafts, confirmErrors, isPending, isConfirming, error, send, updateDraft, removeDraft, confirm };
}