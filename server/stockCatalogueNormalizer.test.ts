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
    expect(report.exclusions).toEqual({ nonImplant: 1, unsupportedProduct: 0, invalidReference: 0, duplicateReference: 1 });
    expect(JSON.stringify(records)).not.toMatch(/quantity|price/i);
  });

  it("rejects tool labels embedded after a reference code and promotes true product labels when family text is malformed", () => {
    const { records, report } = normalizeStockCatalogue({
      "Madison — Trauma: Plates & Screws": {
        "MOI MCKINLEY-01": {
          "MOI MCKINLEY-01": [
            { refSS: "MOI 2000008 T-Handle with Quick Coupling", specs: { "LEN (mm)": "10" } },
            { refSS: "MOI 2000002 Nail Inserter", specs: { "LEN (mm)": "3" } },
            { refSS: "MOI 2000100 Femoral Nail", specs: { DIAMETER: "10 mm", LENGTH: "320 mm" } },
          ],
        },
      },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ productCode: "MOI 2000100", name: "Femoral Nail — DIAMETER: 10 mm · LENGTH: 320 mm" });
    expect(records[0]?.description).toContain("Exact reference: MOI 2000100");
    expect(report.exclusions.nonImplant).toBe(2);
  });

  it("uses specification notes to repair parenthetical family labels while excluding chisel and sleeve tooling", () => {
    const { records, report } = normalizeStockCatalogue({
      "Madison — Trauma": {
        "LENA": {
          "(MOI-LENA-01)": [
            { refSS: "MOI 9000001", specs: { NOTE: "K-Wire 2.0 mm", "LEN (mm)": "4" } },
            { refSS: "MOI 9000002", specs: { NOTE: "Osteotomy Chisel 20 mm", "LEN (mm)": "2" } },
            { refSS: "MOI 9000003", specs: { NOTE: "Centering Sleeve for K-Wire 2.0 mm", "LEN (mm)": "1" } },
          ],
        },
      },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ productCode: "MOI 9000001", name: "K-Wire 2.0 mm — NOTE: K-Wire 2.0 mm · LEN (mm): 4" });
    expect(report.exclusions.nonImplant).toBe(2);
  });

  it("excludes plural trays and containers without mistaking a Hammertoe implant for a hammer tool", () => {
    const { records, report } = normalizeStockCatalogue({
      "Madison — Trauma": {
        External: {
          "Ring Fixator (Adult) — Containers": [{ refSS: "MOI 9100001", specs: { NOTE: "Containers" } }],
          "URANUS Hammertoe Fixation Implant": [{ refSS: "MOI 9100002", specs: { NOTE: "2.8 X 9 mm" } }],
        },
      },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ productCode: "MOI 9100002", name: "URANUS Hammertoe Fixation Implant — NOTE: 2.8 X 9 mm" });
    expect(report.exclusions.nonImplant).toBe(1);
  });
});
