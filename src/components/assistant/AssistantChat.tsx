"use client";

import { useEffect, useRef, useState} from "react";
import { useAssistantChat } from "./useAssistantChat";
import DraftTable from "./DraftTable";
import MicButton from "./MicButton";
import { ChatIcon, SendIcon } from "@/components/layout/icons";
import type { AssistantContextKey } from "@/lib/ai/contexts";

function AssistantAvatar() {
    return (
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <ChatIcon className="h-4 w-4" />
        </span>
    );
}

export default function AssistantChat({ propertyId, greeting, context }: { propertyId: string, greeting: string, context: AssistantContextKey }) {
    const { messages, drafts, confirmErrors, isPending, isConfirming, error, send, updateDraft, removeDraft, confirm } = useAssistantChat(propertyId, context);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const box = scrollRef.current;

        box?.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
    }, [messages, isPending]);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const text = input;
        setInput("");

        const sent = await send(text);

        if (!sent) {
            setInput(text);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
        }
    }

    function handleVoiceResult(text: string) {
        setInput((current) => (current.trim().length > 0 ? `${current.trim()} ${text}` : text));
    }

    return (
        <div className="grid items-start gap-5 lg:grid-cols-2">
            <section aria-label="Conversation" className="card flex h-[70vh] min-h-[480px] flex-col">
                <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-5">
                    <div className="flex max-w-[90%] items-start gap-2.5">
                        <AssistantAvatar />
                        <p className="rounded-[4px_14px_14px_14px] bg-canvas px-3.5 py-3 text-sm leading-relaxed">{greeting}</p>
                    </div>

                    {messages.map((message, index) =>
                        message.role === "user" ? (
                            <div
                                key={index}
                                className="max-w-[85%] self-end whitespace-pre-wrap rounded-[14px_4px_14px_14px] bg-ink px-3.5 py-3 text-sm leading-relaxed text-white"
                            >
                                {message.content}
                            </div>
                        ) : (
                            <div key={index} className="flex max-w-[90%] items-start gap-2.5">
                                <AssistantAvatar />
                                <div className="whitespace-pre-wrap rounded-[4px_14px_14px_14px] bg-canvas px-3.5 py-3 text-sm leading-relaxed">
                                    {message.content}
                                </div>
                            </div>
                        ),
                    )}

                    {isPending && (
                        <div className="flex items-start gap-2.5">
                            <AssistantAvatar />
                            <p className="rounded-[4px_14px_14px_14px] bg-canvas px-3.5 py-3 text-sm text-muted">Thinking...</p>
                        </div>
                    )}
                </div>

                {error && <p className="px-5 pb-2 text-sm text-red-600">{error}</p>}

                <form onSubmit={handleSubmit} className="flex items-end gap-2.5 border-t border-line p-3.5">
                    <label className="flex min-w-0 flex-1">
                        <span className="sr-only">Message</span>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={2}
                            placeholder="Type a message, or tap the mic and talk"
                            className="input min-h-0 flex-1 resize-none py-2.5 leading-relaxed"
                        />
                    </label>
                    <MicButton onResult={handleVoiceResult} />
                    <button
                        type="submit"
                        disabled={isPending}
                        className="btn btn-primary shrink-0"
                    >
                        Send
                        <SendIcon className="h-4 w-4" />
                    </button>
                </form>
            </section>

            <DraftTable
                drafts={drafts}
                confirmErrors={confirmErrors}
                isPending={isConfirming}
                onEdit={updateDraft}
                onRemove={removeDraft}
                onConfirm={confirm}
            />
        </div>
    );
}
