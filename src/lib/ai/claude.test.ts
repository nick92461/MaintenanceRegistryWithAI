import { describe, it, expect } from "vitest";
import { askClaude } from "./claude";

describe("askClaude", () => {
	it("gets a real reply back from Claude", async () => {
		const turn = await askClaude([{ role: "user", content: "Reply with exactly the word: pong" }]);

		expect(turn.text.toLowerCase()).toContain("pong");
		expect(turn.toolUses).toHaveLength(0);
	});

	it("remembers earlier messages in the conversation", async () => {
		const turn = await askClaude([
			{ role: "user", content: "My favorite color is teal. Just say OK." },
			{ role: "assistant", content: "OK" },
			{ role: "user", content: "What is my favorite color? One word." },
		]);

		expect(turn.text.toLowerCase()).toContain("teal");
	});

	it("follows a system prompt", async () => {
		const turn = await askClaude(
			[{ role: "user", content: "What is 2 + 2?" }],
			{ system: "No matter what the user asks, reply with only the word banana." },
		);

		expect(turn.text.toLowerCase()).toContain("banana");
	});

	it("calls a tool when the situation calls for it", async () => {
		const turn = await askClaude(
			[{ role: "user", content: "Please call the ping tool right now with no arguments." }],
			{
				tools: [
					{
						name: "ping",
						description: "A test tool with no purpose besides being called.",
						input_schema: { type: "object", properties: {} },
					},
				],
			},
		);

		expect(turn.toolUses.length).toBeGreaterThan(0);
		expect(turn.toolUses[0].name).toBe("ping");
	});
});