import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

export async function askClaude(messages: ChatMessage[], system?: string) {
    const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system,
        messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");

    return textBlock?.text ?? "";
}