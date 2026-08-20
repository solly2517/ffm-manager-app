import { describe, expect, it } from "vitest";
import { filterWarehouseDeliveryProofs } from "./warehouseProofs";

describe("filterWarehouseDeliveryProofs", () => {
  const proofs = [
    { id: 1, warehouseHeroId: 20, note: "Hospital A" },
    { id: 2, warehouseHeroId: 21, note: "Hospital B" },
    { id: 3, warehouseHeroId: 20, note: "Hospital C" },
  ];

  it("returns the full server-returned assignment scope when all Heroes are selected", () => {
    expect(filterWarehouseDeliveryProofs(proofs, "all")).toEqual(proofs);
  });

  it("shows only records for the selected assigned Warehouse Hero", () => {
    expect(filterWarehouseDeliveryProofs(proofs, "20").map((proof) => proof.id)).toEqual([1, 3]);
  });

  it("does not widen the result when the selected value is invalid", () => {
    expect(filterWarehouseDeliveryProofs(proofs, "not-an-id")).toEqual(proofs);
  });
});
