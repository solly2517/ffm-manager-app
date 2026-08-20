import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { isProtectedAdminTarget } from "./db";
import * as db from "./db";
import { storagePut } from "./storage";

vi.mock("./storage", () => ({ storagePut: vi.fn() }));

function contextFor(user: NonNullable<TrpcContext["user"]>): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const baseUser = {
  id: 1,
  openId: "user-1",
  email: "user@example.com",
  name: "User",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("admin access control", () => {
  afterEach(() => vi.restoreAllMocks());
  it("rejects regular users from the user directory", async () => {
    const caller = appRouter.createCaller(contextFor(baseUser));
    await expect(caller.admin.users()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("recognizes the designated email as an administrator", async () => {
    const caller = appRouter.createCaller(contextFor({ ...baseUser, email: "dr.seleam@gmail.com" }));
    const result = await caller.admin.users();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects non-admin addUser, setRole, and removeUser attempts", async () => {
    const caller = appRouter.createCaller(contextFor(baseUser));
    await expect(caller.admin.addUser({ email: "new@example.com", role: "delegate" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setRole({ id: 2, role: "manager" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.removeUser({ id: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("protects the designated administrator and the acting administrator account", () => {
    expect(isProtectedAdminTarget({ email: "DR.SELEAM@GMAIL.COM", openId: "other" }, "actor")).toBe(true);
    expect(isProtectedAdminTarget({ email: "other@example.com", openId: "actor" }, "actor")).toBe(true);
    expect(isProtectedAdminTarget({ email: "other@example.com", openId: "other" }, "actor")).toBe(false);
  });

  it("assigns and unassigns a manager–delegate pair through the admin router", async () => {
    const manager = { ...baseUser, id: 11, role: "manager" as const, email: "manager@example.com" };
    const delegate = { ...baseUser, id: 22, role: "delegate" as const, email: "delegate@example.com" };
    vi.spyOn(db, "getUserById").mockImplementation(async (id) => id === 11 ? manager : delegate);
    vi.spyOn(db, "isDelegateAssignedToManager").mockResolvedValue(false);
    vi.spyOn(db, "createManagerDelegateAssignment").mockResolvedValue({ id: 77, managerId: 11, delegateId: 22, assignedBy: 1, createdAt: new Date() } as never);
    vi.spyOn(db, "removeManagerDelegateAssignment").mockResolvedValue({ success: true });
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(caller.admin.assignDelegate({ managerId: 11, delegateId: 22 })).resolves.toMatchObject({ id: 77, managerId: 11, delegateId: 22 });
    await expect(caller.admin.unassignDelegate({ id: 77 })).resolves.toEqual({ success: true });
  });

  it("assigns and unassigns a manager–Warehouse Hero pair through the admin router", async () => {
    const manager = { ...baseUser, id: 31, role: "manager" as const, email: "manager@example.com" };
    const warehouseHero = { ...baseUser, id: 32, role: "warehouse_hero" as const, email: "hero@example.com" };
    vi.spyOn(db, "getUserById").mockImplementation(async (id) => id === 31 ? manager : warehouseHero);
    vi.spyOn(db, "isWarehouseHeroAssignedToManager").mockResolvedValue(false);
    vi.spyOn(db, "createManagerWarehouseHeroAssignment").mockResolvedValue({ id: 78, managerId: 31, warehouseHeroId: 32, assignedBy: 1, createdAt: new Date() } as never);
    vi.spyOn(db, "removeManagerWarehouseHeroAssignment").mockResolvedValue({ success: true });
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(caller.admin.assignWarehouseHero({ managerId: 31, warehouseHeroId: 32 })).resolves.toMatchObject({ id: 78, managerId: 31, warehouseHeroId: 32 });
    await expect(caller.admin.unassignWarehouseHero({ id: 78 })).resolves.toEqual({ success: true });
  });

  it("allows a Warehouse Hero with location consent to publish the latest GPS point", async () => {
    const warehouseHero = { ...baseUser, id: 52, openId: "warehouse-hero-52", role: "warehouse_hero" as const, locationSharing: true };
    vi.spyOn(db, "getUserById").mockResolvedValue(warehouseHero);
    vi.spyOn(db, "hasManagerForWarehouseHero").mockResolvedValue(true);
    vi.spyOn(db, "getWarehouseHeroLocation").mockResolvedValue(undefined);
    vi.spyOn(db, "upsertWarehouseHeroLocation").mockResolvedValue({ id: 92, warehouseHeroId: 52, latitude: "24.7136000", longitude: "46.6753000", capturedAt: new Date(), updatedAt: new Date() } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.updateWarehouseHeroLocation({ latitude: "24.7136000", longitude: "46.6753000" })).resolves.toMatchObject({ id: 92, warehouseHeroId: 52 });
  });

  it("rejects unassigned Warehouse Heroes from publishing GPS or delivery proof", async () => {
    const warehouseHero = { ...baseUser, id: 54, openId: "warehouse-hero-54", role: "warehouse_hero" as const, locationSharing: true };
    vi.spyOn(db, "getUserById").mockResolvedValue(warehouseHero);
    vi.spyOn(db, "hasManagerForWarehouseHero").mockResolvedValue(false);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.updateWarehouseHeroLocation({ latitude: "24.7136000", longitude: "46.6753000" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.operations.uploadWarehouseDeliveryProof({ fileName: "proof.jpg", mimeType: "image/jpeg", base64: "data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUA==" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects out-of-range Warehouse Hero GPS coordinates before persistence", async () => {
    const warehouseHero = { ...baseUser, id: 55, openId: "warehouse-hero-55", role: "warehouse_hero" as const, locationSharing: true };
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.updateWarehouseHeroLocation({ latitude: "91", longitude: "46.6753000" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.operations.updateWarehouseHeroLocation({ latitude: "24.7136000", longitude: "181" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns Warehouse delivery proofs through the Manager-only assignment-scoped query", async () => {
    const manager = { ...baseUser, id: 63, role: "manager" as const, email: "manager@example.com" };
    vi.spyOn(db, "listWarehouseDeliveryProofsForManager").mockResolvedValue([{ id: 93, warehouseHeroId: 52, warehouseHeroName: "Hero", warehouseHeroEmail: "hero@example.com", note: "Delivered", storageKey: "warehouse-delivery-proofs/52/proof.jpg", mimeType: "image/jpeg", sizeBytes: 1200, capturedAt: new Date(), url: "/manus-storage/warehouse-delivery-proofs/52/proof.jpg" }] as never);
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.operations.warehouseDeliveryProofs()).resolves.toHaveLength(1);
    expect(db.listWarehouseDeliveryProofsForManager).toHaveBeenCalledWith(63, false, undefined);
  });

  it("passes valid delivery-proof date filters through the Manager-scoped query", async () => {
    const manager = { ...baseUser, id: 64, role: "manager" as const, email: "manager@example.com" };
    vi.spyOn(db, "listWarehouseDeliveryProofsForManager").mockResolvedValue([] as never);
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.operations.warehouseDeliveryProofs({ from: "2026-08-01", to: "2026-08-20" })).resolves.toEqual([]);
    expect(db.listWarehouseDeliveryProofsForManager).toHaveBeenCalledWith(64, false, { from: "2026-08-01", to: "2026-08-20" });
  });

  it("exports only assignment-scoped delivery proofs with the selected audit filters", async () => {
    const manager = { ...baseUser, id: 70, role: "manager" as const, email: "manager@example.com" };
    vi.spyOn(db, "listWarehouseDeliveryProofsForManager").mockResolvedValue([{ id: 100, warehouseHeroId: 71, warehouseHeroName: "Hero", warehouseHeroEmail: "hero@example.com", note: "=Handover", storageKey: "warehouse-delivery-proofs/71/proof.jpg", mimeType: "image/jpeg", sizeBytes: 1200, capturedAt: new Date("2026-08-10T12:00:00.000Z"), url: "/manus-storage/warehouse-delivery-proofs/71/proof.jpg" }, { id: 101, warehouseHeroId: 72, warehouseHeroName: "Other Hero", warehouseHeroEmail: "other@example.com", note: "Other", storageKey: "warehouse-delivery-proofs/72/proof.jpg", mimeType: "image/jpeg", sizeBytes: 1000, capturedAt: new Date("2026-08-11T12:00:00.000Z"), url: "/manus-storage/warehouse-delivery-proofs/72/proof.jpg" }] as never);
    const caller = appRouter.createCaller(contextFor(manager));
    const csv = await caller.operations.exportWarehouseDeliveryProofsCsv({ from: "2026-08-01", to: "2026-08-20", warehouseHeroId: 71 });
    expect(db.listWarehouseDeliveryProofsForManager).toHaveBeenCalledWith(70, false, { from: "2026-08-01", to: "2026-08-20", warehouseHeroId: 71 });
    expect(csv).toContain("proof_id,warehouse_hero,note");
    expect(csv).toContain("\"'=Handover\"");
    expect(csv).not.toContain("Other Hero");
  });

  it("rejects a delivery-proof date range whose end precedes its start", async () => {
    const manager = { ...baseUser, id: 65, role: "manager" as const, email: "manager@example.com" };
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.operations.warehouseDeliveryProofs({ from: "2026-08-20", to: "2026-08-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("creates a surgery for a Delegate within the Manager assignment scope", async () => {
    const manager = { ...baseUser, id: 74, role: "manager" as const, email: "manager@example.com" };
    vi.spyOn(db, "getClientById").mockResolvedValue({ id: 5, name: "City Hospital" } as never);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([75]);
    vi.spyOn(db, "createSurgery").mockResolvedValue({ id: 102, delegateId: 75, clientId: 5, procedureName: "Knee replacement", surgeryDate: new Date("2026-09-01"), createdBy: 74 } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.operations.createManagerSurgery({ delegateId: 75, clientId: 5, surgeryDate: new Date("2026-09-01"), procedureName: "Knee replacement", hospital: "City Hospital" })).resolves.toMatchObject({ id: 102, delegateId: 75, clientId: 5 });
    expect(db.createSurgery).toHaveBeenCalledWith(expect.objectContaining({ delegateId: 75, clientId: 5, createdBy: 74 }));
  });

  it("rejects Manager surgery creation for an unassigned Delegate", async () => {
    const manager = { ...baseUser, id: 76, role: "manager" as const, email: "manager@example.com" };
    vi.spyOn(db, "getClientById").mockResolvedValue({ id: 5, name: "City Hospital" } as never);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([]);
    const createSurgery = vi.spyOn(db, "createSurgery");
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.operations.createManagerSurgery({ delegateId: 77, clientId: 5, surgeryDate: new Date("2026-09-01"), procedureName: "Knee replacement" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(createSurgery).not.toHaveBeenCalled();
  });

  it("returns only the signed-in Warehouse Hero's own delivery-proof history", async () => {
    const warehouseHero = { ...baseUser, id: 66, role: "warehouse_hero" as const, email: "hero@example.com" };
    vi.spyOn(db, "listWarehouseDeliveryProofsForHero").mockResolvedValue([{ id: 96, note: "Hospital handover", storageKey: "warehouse-delivery-proofs/66/proof.jpg", mimeType: "image/jpeg", sizeBytes: 1200, capturedAt: new Date(), url: "/manus-storage/warehouse-delivery-proofs/66/proof.jpg" }] as never);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.myWarehouseDeliveryProofs()).resolves.toHaveLength(1);
    expect(db.listWarehouseDeliveryProofsForHero).toHaveBeenCalledWith(66);
  });

  it("returns only the signed-in Warehouse Hero's Manager assignment readiness", async () => {
    const warehouseHero = { ...baseUser, id: 68, role: "warehouse_hero" as const, email: "hero@example.com" };
    vi.spyOn(db, "hasManagerForWarehouseHero").mockResolvedValue(false);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.warehouseHeroAssignmentStatus()).resolves.toEqual({ assigned: false });
    expect(db.hasManagerForWarehouseHero).toHaveBeenCalledWith(68);
  });

  it("rejects non-Warehouse-Hero accounts from assignment readiness", async () => {
    const caller = appRouter.createCaller(contextFor({ ...baseUser, id: 69, role: "manager" as const, email: "manager@example.com" }));
    await expect(caller.operations.warehouseHeroAssignmentStatus()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects non-Warehouse-Hero accounts from personal delivery-proof history", async () => {
    const caller = appRouter.createCaller(contextFor({ ...baseUser, id: 67, role: "manager" as const, email: "manager@example.com" }));
    await expect(caller.operations.myWarehouseDeliveryProofs()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stores Warehouse Hero delivery-proof photos in managed storage before recording metadata", async () => {
    const warehouseHero = { ...baseUser, id: 72, openId: "warehouse-hero-72", role: "warehouse_hero" as const, email: "hero@example.com" };
    vi.spyOn(db, "hasManagerForWarehouseHero").mockResolvedValue(true);
    vi.mocked(storagePut).mockResolvedValue({ key: "warehouse-delivery-proofs/72/proof_hash.jpg", url: "/manus-storage/warehouse-delivery-proofs/72/proof_hash.jpg" });
    vi.spyOn(db, "createWarehouseDeliveryProof").mockResolvedValue({ id: 94, warehouseHeroId: 72, note: "Delivered", storageKey: "warehouse-delivery-proofs/72/proof_hash.jpg", mimeType: "image/jpeg", sizeBytes: 10, capturedAt: new Date(), createdAt: new Date() } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.uploadWarehouseDeliveryProof({ fileName: "proof.jpg", mimeType: "image/jpeg", base64: "data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUA==", note: "Delivered" })).resolves.toMatchObject({ proofId: 94, url: "/manus-storage/warehouse-delivery-proofs/72/proof_hash.jpg" });
    expect(storagePut).toHaveBeenCalled();
    expect(db.createWarehouseDeliveryProof).toHaveBeenCalledWith(expect.objectContaining({ warehouseHeroId: 72, mimeType: "image/jpeg", note: "Delivered" }));
  });

  it("rejects delivery-proof payloads larger than the server-side 8 MB limit", async () => {
    const warehouseHero = { ...baseUser, id: 73, openId: "warehouse-hero-73", role: "warehouse_hero" as const, email: "hero@example.com" };
    vi.spyOn(db, "hasManagerForWarehouseHero").mockResolvedValue(true);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.uploadWarehouseDeliveryProof({ fileName: "large.jpg", mimeType: "image/jpeg", base64: "A".repeat(11_200_000) })).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("blocks duplicate manager–delegate assignments", async () => {
    vi.spyOn(db, "getUserById").mockResolvedValue({ ...baseUser, role: "delegate" } as never);
    vi.spyOn(db, "isDelegateAssignedToManager").mockResolvedValue(true);
    const caller = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(caller.admin.assignDelegate({ managerId: 11, delegateId: 22 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects admin mutation targets that are not valid positive user ids", async () => {
    const caller = appRouter.createCaller(contextFor({ ...baseUser, email: "dr.seleam@gmail.com" }));
    await expect(caller.admin.setRole({ id: 0, role: "manager" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.admin.removeUser({ id: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
