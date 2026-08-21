import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { addAuditEvent, getSurgeryDeliveryProofById, getWarehouseDeliveryProofById, listSurgeryDeliveryProofsForCleanup, listWarehouseDeliveryProofsForCleanup, removeSurgeryDeliveryProof, removeWarehouseDeliveryProof } from "./db";

const ADMIN_EMAIL = "dr.seleam@gmail.com";
const administratorOnly = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access required" });
  }
  return next({ ctx });
});

export const evidenceCleanupRouter = router({
  list: administratorOnly.query(async () => ({
    warehouseDeliveryProofs: await listWarehouseDeliveryProofsForCleanup(),
    surgeryDeliveryProofs: await listSurgeryDeliveryProofsForCleanup(),
  })),
  removeWarehouseDeliveryProof: administratorOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const proof = await getWarehouseDeliveryProofById(input.id);
    if (!proof) throw new TRPCError({ code: "NOT_FOUND", message: "Warehouse Hero delivery proof not found" });
    await removeWarehouseDeliveryProof(input.id);
    await addAuditEvent({ actorId: ctx.user.id, action: "warehouse_hero.delivery_proof_removed", entityType: "warehouseDeliveryProof", entityId: input.id, metadata: JSON.stringify({ warehouseHeroId: proof.warehouseHeroId, storageKey: proof.storageKey, sizeBytes: proof.sizeBytes, cleanup: "reference_removed" }) });
    return { success: true as const, bytesUnlinked: proof.sizeBytes };
  }),
  removeSurgeryDeliveryProof: administratorOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const proof = await getSurgeryDeliveryProofById(input.id);
    if (!proof) throw new TRPCError({ code: "NOT_FOUND", message: "Surgery patient-sheet proof not found" });
    await removeSurgeryDeliveryProof(input.id);
    await addAuditEvent({ actorId: ctx.user.id, action: "surgery.delivery_proof_removed", entityType: "surgery", entityId: proof.surgeryId, metadata: JSON.stringify({ proofId: proof.id, storageKey: proof.storageKey, originalName: proof.originalName, sizeBytes: proof.sizeBytes, cleanup: "reference_removed" }) });
    return { success: true as const, bytesUnlinked: proof.sizeBytes };
  }),
});
