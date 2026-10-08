import { describe, it, expect } from "vitest";
import { isAuthorizedCronRequest } from "./cronAuth";

const SECRET = "a-long-random-secret-value";

describe("isAuthorizedCronRequest", () => {
    it("accepts the right secret", () => {
        expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true);
    });

    it("rejects a wrong secret, a missing header, and a header without Bearer", () => {
        expect(isAuthorizedCronRequest("Bearer something-else-entirely", SECRET)).toBe(false);
        expect(isAuthorizedCronRequest(null, SECRET)).toBe(false);
        expect(isAuthorizedCronRequest(SECRET, SECRET)).toBe(false);
        expect(isAuthorizedCronRequest("", SECRET)).toBe(false);
    });

    it("rejects a near miss: a prefix or an extra character", () => {
        expect(isAuthorizedCronRequest(`Bearer ${SECRET.slice(0, -1)}`, SECRET)).toBe(false);
        expect(isAuthorizedCronRequest(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    });

    it("refuses everything when no secret is configured, even a matching empty one", () => {
        expect(isAuthorizedCronRequest("Bearer undefined", undefined)).toBe(false);
        expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
        expect(isAuthorizedCronRequest("Bearer ", undefined)).toBe(false);
    });

    it("refuses a secret that is too short to be safe", () => {
        expect(isAuthorizedCronRequest("Bearer short", "short")).toBe(false);
    });
});