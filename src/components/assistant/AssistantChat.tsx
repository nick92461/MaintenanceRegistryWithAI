"use client";

import { useEffect, useRef, useState } from "react";
import { useAssistantChat } from "./useAssistantChat";

export default function AssistantChat({ greeting }: { greeting: string }) {
    const { messages, isPending, error, send } = useAssistantChat();
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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

    return (
        <div className="flex h-full min-h-0 flex-col gap-4">
            <p className="text-sm text-gray-500">{greeting}</p>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={
                            message.role === "user"
                                ? "max-w-[85%] self-end whitespace-pre-wrap rounded-xl text-black bg-gray-200 px-3 py-2"
                                : "max-w-[85%] self-start whitespace-pre-wrap rounded-xl border px-3 py-2"
                        }
                    >
                        {message.content}
                    </div>
                ))}
                {isPending && <p className="self-start text-sm text-gray-500">Thinking...</p>}
                <div ref={bottomRef} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <form onSubmit={handleSubmit} className ="flex items-end gap-2">
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    placeholder="Type a message"
                    className="flex-1 resize-none rounded border px-3 py-2"
                />
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded bg-gray-700 px-4 py-2 text-white disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </div>
    );
}