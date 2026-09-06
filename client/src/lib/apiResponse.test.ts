import { describe, expect, it } from "vitest";
import { isJsonContentType, responseDiagnostic } from "./apiResponse";

describe("API response diagnostics", () => {
  it("recognizes JSON responses", () => {
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonContentType("text/html")).toBe(false);
  });

  it("captures status and a short HTML snippet for non-JSON responses", async () => {
    const diagnostic = await responseDiagnostic(new Response("<!doctype html><title>Permission denied</title>", { status: 403, headers: { "content-type": "text/html" } }));
    expect(diagnostic.message).toContain("API returned non-JSON response (403)");
    expect(diagnostic.message).toContain("Permission denied");
  });
});
