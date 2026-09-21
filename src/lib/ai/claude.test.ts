import { describe, it, expect } from "vitest";
import { askClaude } from "./claude";

describe("askClaude", () => {
    it("gets a real reply back from Claude", async () => {
        const reply = await askClaude([{ role: "user", content: "Reply with exactly the word: pong"}]);

        expect (reply.toLowerCase()).toContain("pong");
    });

    it("remembers earlier messages in the conversation", async () => {
        const reply = await askClaude([
            { role: "user", content: "My favorite color is teal. Just say OK." },
            { role: "assistant", content: "OK" },
            { role: "user", content: "What is my favorite color? One word." },
        ]);

        expect(reply.toLowerCase()).toContain("teal");
    });

    it("follows a system prompt", async () => {
        const reply = await askClaude(
            [{ role: "user", content: "What is 2 + 2?" }],
            "No matter what the user asks, reply with only the word banana.",
        );

        expect(reply.toLowerCase()).toContain("banana");
    });
});