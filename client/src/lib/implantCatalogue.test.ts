import { describe, expect, it } from "vitest";
import { getCatalogueSearchInput } from "./implantCatalogue";

describe("implant catalogue search input", () => {
  it("waits for a meaningful query instead of showing a capped default slice of the catalogue", () => {
    expect(getCatalogueSearchInput("")).toBeUndefined();
    expect(getCatalogueSearchInput("a")).toBeUndefined();
    expect(getCatalogueSearchInput("  nail  ")).toEqual({ query: "nail" });
  });
});
