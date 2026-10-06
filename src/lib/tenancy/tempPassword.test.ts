import { describe, it, expect } from "vitest";
import { generateTempPassword } from "./tempPassword";

describe("generateTempPassword", () => {
	it("is 16 characters long", () => {
		expect(generateTempPassword()).toHaveLength(16);
	});

	it("never uses look-alike characters", () => {
		for (let i = 0; i < 200; i++) {
			expect(generateTempPassword()).not.toMatch(/[IiLlOo01]/);
		}
	});

	it("only uses letters and digits", () => {
		for (let i = 0; i < 200; i++) {
			expect(generateTempPassword()).toMatch(/^[A-Za-z0-9]+$/);
		}
	});

	it("is different every time", () => {
		const passwords = new Set(Array.from({ length: 200 }, () => generateTempPassword()));

		expect(passwords.size).toBe(200);
	});
});