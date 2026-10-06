import { describe, it, expect } from "vitest";
import { checkNewPassword, MIN_PASSWORD_LENGTH } from "./passwordRules";

describe("checkNewPassword", () => {
	it("accepts a long enough password that matches its confirmation", () => {
		expect(checkNewPassword("longenough1", "longenough1")).toBeNull();
	});

	it("accepts a password of exactly the minimum length", () => {
		const exact = "a".repeat(MIN_PASSWORD_LENGTH);

		expect(checkNewPassword(exact, exact)).toBeNull();
	});

	it("rejects a password one character too short", () => {
		const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);

		expect(checkNewPassword(short, short)).toBe("Password must be at least 8 characters");
	});

	it("rejects a confirmation that doesn't match", () => {
		expect(checkNewPassword("longenough1", "longenough2")).toBe("Passwords do not match");
	});

	it("checks the length before the match, so a short mismatch reports the length", () => {
		expect(checkNewPassword("short", "different")).toBe("Password must be at least 8 characters");
	});

	it("treats capitalization and spaces as part of the password", () => {
		expect(checkNewPassword("Password 1", "password 1")).toBe("Passwords do not match");
	});
});