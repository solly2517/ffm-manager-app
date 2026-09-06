export type WarehouseDeliveryProofFilterRecord = {
  warehouseHeroId: number;
};

/** Keeps Manager delivery-proof review limited to the server-returned assignment scope. */
export function filterWarehouseDeliveryProofs<T extends WarehouseDeliveryProofFilterRecord>(proofs: T[], selectedHeroId: string) {
  if (selectedHeroId === "all") return proofs;
  const heroId = Number(selectedHeroId);
  return Number.isInteger(heroId) && heroId > 0 ? proofs.filter((proof) => proof.warehouseHeroId === heroId) : proofs;
}
