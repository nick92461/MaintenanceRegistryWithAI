import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

export type ClaudeTurn = {
    text: string;
    toolUses: Anthropic.ToolUseBlock[];
};

export async function askClaude(
    messages: Anthropic.MessageParam[],
    options?: { system?: string; tools?: Anthropic.Tool[] },
): Promise<ClaudeTurn> {
    const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        thinking: { type: "disabled" },
        max_tokens: 16000,
        system: options?.system,
        tools: options?.tools,
        messages,
    });

    const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

    const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    return { text, toolUses };
}