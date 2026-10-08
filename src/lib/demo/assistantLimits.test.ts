import { describe, it, expect } from "vitest";
import { getAssistantSettings, hasOversizedUserMessage } from "./assistantLimits";

describe("getAssistantSettings", () => {
	it("keeps the real app's limits when demo mode is off", () => {
		expect(getAssistantSettings(false)).toEqual({ maxUserMessageLength: 50000, maxToolRounds: 15 });
	});

	it("tightens everything in demo mode", () => {
		expect(getAssistantSettings(true)).toEqual({ maxUserMessageLength: 1500, maxToolRounds: 6, maxOutputTokens: 4000 });
	});

	it("leaves the output cap unset outside demo mode, so the default applies", () => {
		expect(getAssistantSettings(false).maxOutputTokens).toBeUndefined();
	});
});

describe("hasOversizedUserMessage", () => {
	const message = (role: string, length: number) => ({ role, content: "a".repeat(length) });

	it("allows a message of exactly the limit and rejects one character more", () => {
		expect(hasOversizedUserMessage([message("user", 1500)], 1500)).toBe(false);
		expect(hasOversizedUserMessage([message("user", 1501)], 1500)).toBe(true);
	});

	it("finds an oversized message anywhere in the conversation", () => {
		expect(hasOversizedUserMessage([message("user", 10), message("assistant", 10), message("user", 2000)], 1500)).toBe(true);
	});

	it("ignores the assistant's own long replies", () => {
		expect(hasOversizedUserMessage([message("user", 10), message("assistant", 5000), message("user", 10)], 1500)).toBe(false);
	});

	it("says no for anything that isn't a list of messages", () => {
		expect(hasOversizedUserMessage(undefined, 1500)).toBe(false);
		expect(hasOversizedUserMessage("hello", 1500)).toBe(false);
		expect(hasOversizedUserMessage([null, 5, { role: "user", content: 12345 }], 1500)).toBe(false);
	});
});