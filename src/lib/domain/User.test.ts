import { describe, it, expect } from "vitest";
import { User } from "./User";
import { AssetRecord } from "./AssetRecord";
import { Role } from "@/generated/prisma/enums";

describe("User", () => {
	it("returns the values passed into its constructor", () => {
		const user = new User("user-1", Role.TECHNICIAN, null);

		expect(user.getId()).toBe("user-1");
		expect(user.getRole()).toBe(Role.TECHNICIAN);
	});

	it("starts with a null deletedAt when constructed that way", () => {
		const user = new User("user-1", Role.TECHNICIAN, null);
		expect(user.getDeletedAt()).toBeNull();
	});

	it("reflects an existing deletedAt passed into the constructor", () => {
		const existingDate = new Date("2026-01-01");
		const user = new User("user-1", Role.TECHNICIAN, existingDate);

		expect(user.getDeletedAt()).toBe(existingDate);
	});

	it("sets deletedAt when deleted", () => {
		const user = new User("user-1", Role.TECHNICIAN, null);
		user.delete();

		expect(user.getDeletedAt()).toBeInstanceOf(Date);
	});

	it("does not extend AssetRecord, since a person is not a trackable asset", () => {
		const user = new User("user-1", Role.TECHNICIAN, null);
		expect(user).not.toBeInstanceOf(AssetRecord);
	});
});