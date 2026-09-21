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
});