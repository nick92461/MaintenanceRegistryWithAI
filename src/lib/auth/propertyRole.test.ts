import { describe, it, expect } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resolvePropertyRole, canRemoveFromCompany } from "./propertyRole";

const tech = { id: "u1", companyId: "c1", isCompanyAdmin: false };
const admin = { id: "u2", companyId: "c1", isCompanyAdmin: true };

describe("resolvePropertyRole", () => {
	it("returns the user's membership role at a property in their company", () => {
		const property = { companyId: "c1", memberships: [{ userId: "u1", role: Role.TECHNICIAN }] };

		expect(resolvePropertyRole(tech, property)).toBe(Role.TECHNICIAN);
	});

	it("gives a company admin Manager access to any property in their company, with no membership", () => {
		expect(resolvePropertyRole(admin, { companyId: "c1", memberships: [] })).toBe(Role.MANAGER);
	});

	it("returns Guest for a pending member, so callers can tell pending apart from no access", () => {
		const property = { companyId: "c1", memberships: [{ userId: "u1", role: Role.GUEST }] };

		expect(resolvePropertyRole(tech, property)).toBe(Role.GUEST);
	});

	it("denies a user with no membership at the property", () => {
		expect(resolvePropertyRole(tech, { companyId: "c1", memberships: [] })).toBeNull();
	});

	it("ignores a membership that belongs to someone else", () => {
		const property = { companyId: "c1", memberships: [{ userId: "someone-else", role: Role.MANAGER }] };

		expect(resolvePropertyRole(tech, property)).toBeNull();
	});

	it("denies another company's property, even if a membership row somehow exists", () => {
		const property = { companyId: "c2", memberships: [{ userId: "u1", role: Role.MANAGER }] };

		expect(resolvePropertyRole(tech, property)).toBeNull();
	});

	it("denies a company admin access to another company's property", () => {
		expect(resolvePropertyRole(admin, { companyId: "c2", memberships: [] })).toBeNull();
	});

	it("denies a property that doesn't exist", () => {
		expect(resolvePropertyRole(tech, null)).toBeNull();
		expect(resolvePropertyRole(admin, null)).toBeNull();
	});
});

describe("canRemoveFromCompany", () => {
	it("always allows a company admin", () => {
		expect(canRemoveFromCompany({ isCompanyAdmin: true, managedPropertyIds: [] }, ["a", "b"])).toBe(true);
	});

	it("allows a manager who manages every property the person belongs to", () => {
		expect(canRemoveFromCompany({ isCompanyAdmin: false, managedPropertyIds: ["a", "b", "c"] }, ["a", "b"])).toBe(true);
	});

	it("denies a manager when the person also belongs to a property they don't manage", () => {
		expect(canRemoveFromCompany({ isCompanyAdmin: false, managedPropertyIds: ["a", "b"] }, ["a", "c"])).toBe(false);
	});

	it("denies when the person belongs to no properties at all", () => {
		expect(canRemoveFromCompany({ isCompanyAdmin: false, managedPropertyIds: ["a"] }, [])).toBe(false);
	});
});