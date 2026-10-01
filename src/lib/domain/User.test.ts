import { describe, it, expect } from "vitest";
import { User } from "./User";
import { AssetRecord } from "./AssetRecord";

describe("User", () => {
	it("returns the values passed into its constructor", () => {
		const user = new User("user-1", null);

		expect(user.getId()).toBe("user-1");
	});

	it("starts with a null deletedAt when constructed that way", () => {
		const user = new User("user-1", null);
		expect(user.getDeletedAt()).toBeNull();
	});

	it("reflects an existing deletedAt passed into the constructor", () => {
		const existingDate = new Date("2026-01-01");
		const user = new User("user-1", existingDate);

		expect(user.getDeletedAt()).toBe(existingDate);
	});

	it("sets deletedAt when deleted", () => {
		const user = new User("user-1", null);
		user.delete();

		expect(user.getDeletedAt()).toBeInstanceOf(Date);
	});

	it("does not extend AssetRecord, since a person is not a trackable asset", () => {
		const user = new User("user-1", null);
		expect(user).not.toBeInstanceOf(AssetRecord);
	});
});