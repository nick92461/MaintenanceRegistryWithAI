import { describe, it, expect } from "vitest";
import { normalizeProvisionInput } from "./provision";

const valid = { propertyName: "The Oaks", adminName: "Pat Lee", adminEmail: "pat@oaks.com" };

describe("normalizeProvisionInput", () => {
	it("names the company after the property when no company name is given", () => {
		expect(normalizeProvisionInput(valid).companyName).toBe("The Oaks");
	});

	it("keeps a separate company name when one is given", () => {
		expect(normalizeProvisionInput({ ...valid, companyName: "Summit Residential" }).companyName).toBe("Summit Residential");
	});

	it("treats a blank company name as not given", () => {
		expect(normalizeProvisionInput({ ...valid, companyName: "   " }).companyName).toBe("The Oaks");
	});

	it("trims every field", () => {
		const clean = normalizeProvisionInput({ propertyName: "  The Oaks ", adminName: " Pat Lee  ", adminEmail: "  pat@oaks.com " });

		expect(clean).toEqual({ companyName: "The Oaks", propertyName: "The Oaks", adminName: "Pat Lee", adminEmail: "pat@oaks.com" });
	});

	it("does not change the email's capitalization, since login matches it exactly", () => {
		expect(normalizeProvisionInput({ ...valid, adminEmail: "Pat@Oaks.com" }).adminEmail).toBe("Pat@Oaks.com");
	});

	it("rejects blank required fields", () => {
		expect(() => normalizeProvisionInput({ ...valid, propertyName: " " })).toThrow("required");
		expect(() => normalizeProvisionInput({ ...valid, adminName: "" })).toThrow("required");
		expect(() => normalizeProvisionInput({ ...valid, adminEmail: "" })).toThrow("required");
	});

	it("rejects something that isn't an email address", () => {
		expect(() => normalizeProvisionInput({ ...valid, adminEmail: "not-an-email" })).toThrow("doesn't look like an email");
		expect(() => normalizeProvisionInput({ ...valid, adminEmail: "a@b" })).toThrow("doesn't look like an email");
	});
});