import { describe, expect, it } from "vitest";
import { normalizeStockCatalogue } from "../scripts/stockCatalogueNormalizer.mjs";

describe("stock catalogue normalizer", () => {
  it("keeps distinct stainless-steel and titanium references while preserving clinical specifications", () => {
    const { records, report } = normalizeStockCatalogue({
      "Madison — Trauma": {
        Plates: {
          "LCP plate 3.5 mm": [{ refSS: "MOI 15142006", refTIT: "MOI 35142006", specs: { DIRECTION: "Left", LENGTH: "70 mm" }, page: 8 }],
        },
      },
    });
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.productCode)).toEqual(["MOI 15142006", "MOI 35142006"]);
    expect(records[0]).toMatchObject({ manufacturer: "Madison", name: "LCP plate 3.5 mm — DIRECTION: Left · LENGTH: 70 mm" });
    expect(records[0]?.description).toContain("Source page: 8");
    expect(report.validRecords).toBe(2);
  });

  it("excludes surgical instrument references and safely deduplicates repeated product codes", () => {
    const { records, report } = normalizeStockCatalogue({
      "AAP — Primary Knee": {
        Knee: {
          "Femoral component": [{ refSS: "KNEE-101", specs: { SIZE: "4" } }, { refTIT: "knee 101", specs: { SIZE: "4" } }],
          "Instrument Set": [{ refSS: "KIT-001", specs: { NOTE: "Alignment guide" } }],
        },
      },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ productCode: "KNEE-101", manufacturer: "AAP" });
    expect(report.exclusions).toEqual({ nonImplant: 1, invalidReference: 0, duplicateReference: 1 });
    expect(JSON.stringify(records)).not.toMatch(/quantity|price/i);
  });
});
