import { describe, it, expect, afterEach, vi } from "vitest";
import { getMaxActiveDemos, isDemoMode } from "./demoMode";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("isDemoMode", () => {
	it("is off by default", () => {
		vi.stubEnv("DEMO_MODE", "");

		expect(isDemoMode()).toBe(false);
	});

	it("is on only for the exact value true", () => {
		vi.stubEnv("DEMO_MODE", "true");
		expect(isDemoMode()).toBe(true);

		for (const value of ["TRUE", "True", "1", "yes", "on", " true", "false", "tru"]) {
			vi.stubEnv("DEMO_MODE", value);
			expect(isDemoMode()).toBe(false);
		}
	});
});

describe("getMaxActiveDemos", () => {
	it("defaults to 100", () => {
		vi.stubEnv("DEMO_MAX_ACTIVE", "");

		expect(getMaxActiveDemos()).toBe(100);
	});

	it("uses a valid whole number from the environment", () => {
		vi.stubEnv("DEMO_MAX_ACTIVE", "25");

		expect(getMaxActiveDemos()).toBe(25);
	});

	it("ignores anything that isn't a positive whole number", () => {
		for (const value of ["0", "-5", "2.5", "lots", "NaN"]) {
			vi.stubEnv("DEMO_MAX_ACTIVE", value);
			expect(getMaxActiveDemos()).toBe(100);
		}
	});
});