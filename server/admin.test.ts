import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { buildUserRefreshUpdateSet, isProtectedAdminTarget } from "./db";
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
    vi.spyOn(db, "listUsers").mockResolvedValue([]);
    const caller = appRouter.createCaller(contextFor({ ...baseUser, email: "dr.seleam@gmail.com" }));
    const result = await caller.admin.users();
    expect(Array.isArray(result)).toBe(true);
  });

  it("keeps core field-operation records out of Warehouse Hero access while Administrators retain surgery oversight", async () => {
    const hero = { ...baseUser, id: 88, role: "warehouse_hero" as const, email: "hero@example.com" };
    const heroCaller = appRouter.createCaller(contextFor(hero));
    await expect(heroCaller.operations.tasks()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(heroCaller.operations.surgeries()).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.spyOn(db, "listAllSurgeries").mockResolvedValue([{ id: 61, delegateId: 7, procedureName: "Knee replacement" }] as never);
    const adminCaller = appRouter.createCaller(contextFor({ ...baseUser, id: 1, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(adminCaller.operations.surgeries()).resolves.toMatchObject([{ id: 61 }]);
  });

  it("blocks Warehouse Heroes from clinical record mutations while preserving Administrator surgery updates", async () => {
    const heroCaller = appRouter.createCaller(contextFor({ ...baseUser, id: 89, role: "warehouse_hero", email: "hero@example.com" }));
    await expect(heroCaller.operations.submitVisitPlan({ clientId: 5, proposedAt: new Date("2026-09-01") })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(heroCaller.operations.addSurgery({ clientId: 5, surgeryDate: new Date("2026-09-01"), procedureName: "Knee replacement" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(heroCaller.operations.addSurgeryImplant({ surgeryId: 61, implantName: "Cortical screw", quantity: 1, unitPrice: 25, currency: "SAR" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(heroCaller.operations.updateSurgery({ id: 61, status: "collected" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.spyOn(db, "getSurgeryById").mockResolvedValue({ id: 61, delegateId: 7, status: "pending" } as never);
    vi.spyOn(db, "updateSurgery").mockResolvedValue({ id: 61, delegateId: 7, status: "collected" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const adminCaller = appRouter.createCaller(contextFor({ ...baseUser, id: 1, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(adminCaller.operations.updateSurgery({ id: 61, status: "collected" })).resolves.toMatchObject({ id: 61, status: "collected" });
  });

  it("reserves client, doctor, and surgery deletion for Administrators", async () => {
    const manager = appRouter.createCaller(contextFor({ ...baseUser, id: 11, role: "manager", email: "manager@example.com" }));
    await expect(manager.operations.removeClient({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(manager.operations.removeDoctor({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(manager.operations.removeSurgery({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks an Administrator from deleting a hospital or doctor with linked surgery work", async () => {
    const admin = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    vi.spyOn(db, "getClientById").mockResolvedValue({ id: 5, name: "City Hospital" } as never);
    vi.spyOn(db, "getClientDeletionDependencies").mockResolvedValue({ doctors: 1, tasks: 2, surgeries: 1, visitPlans: 0 });
    vi.spyOn(db, "getDoctorById").mockResolvedValue({ id: 8, clientId: 5, name: "Dr. Example" } as never);
    vi.spyOn(db, "getDoctorDeletionDependencies").mockResolvedValue({ surgeries: 1 });
    const removeClient = vi.spyOn(db, "removeClient");
    const removeDoctor = vi.spyOn(db, "removeDoctor");
    await expect(admin.operations.removeClient({ id: 5 })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(admin.operations.removeDoctor({ id: 8 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(removeClient).not.toHaveBeenCalled();
    expect(removeDoctor).not.toHaveBeenCalled();
  });

  it("lets an Administrator delete a surgery and records the associated clinical-resource cleanup", async () => {
    const admin = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    vi.spyOn(db, "getSurgeryById").mockResolvedValue({ id: 41, clientId: 5, delegateId: 9 } as never);
    vi.spyOn(db, "removeSurgeryWithResources").mockResolvedValue({ success: true, implantsRemoved: 2, deliveryProofsRemoved: 1 });
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    await expect(admin.operations.removeSurgery({ id: 41 })).resolves.toEqual({ success: true, implantsRemoved: 2, deliveryProofsRemoved: 1 });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "surgery.removed", entityId: 41, metadata: expect.stringContaining("implantsRemoved") }));
  });

  it("rejects non-admin addUser, setRole, and removeUser attempts", async () => {
    const caller = appRouter.createCaller(contextFor(baseUser));
    await expect(caller.admin.addUser({ email: "new@example.com", role: "delegate" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setRole({ id: 2, role: "manager" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.removeUser({ id: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reserves department structures and member department assignments for Administrators", async () => {
    const nonAdmin = appRouter.createCaller(contextFor(baseUser));
    await expect(nonAdmin.admin.createDepartment({ name: "Clinical Operations" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(nonAdmin.admin.assignUserDepartment({ userId: 2, departmentId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.spyOn(db, "listDepartments").mockResolvedValue([] as never);
    vi.spyOn(db, "createDepartment").mockResolvedValue({ id: 7, name: "Clinical Operations", parentDepartmentId: null, isActive: true } as never);
    vi.spyOn(db, "getUserById").mockResolvedValue({ id: 2, openId: "member-2", email: "member@example.com", department: null } as never);
    vi.spyOn(db, "getDepartmentById").mockResolvedValue({ id: 7, name: "Clinical Operations", isActive: true } as never);
    vi.spyOn(db, "updateUserDepartment").mockResolvedValue({ id: 2, department: "Clinical Operations" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const admin = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(admin.admin.createDepartment({ name: "Clinical Operations" })).resolves.toMatchObject({ id: 7, name: "Clinical Operations" });
    await expect(admin.admin.assignUserDepartment({ userId: 2, departmentId: 7 })).resolves.toMatchObject({ id: 2, department: "Clinical Operations" });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "department.member_assigned", entityId: 2 }));
  });

  it("keeps department dashboard totals and department audit CSV export Administrator-only and spreadsheet-safe", async () => {
    const nonAdmin = appRouter.createCaller(contextFor(baseUser));
    await expect(nonAdmin.admin.departmentDashboardTotals()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(nonAdmin.admin.departmentAuditExport()).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.spyOn(db, "getDepartmentDashboardTotals").mockResolvedValue([{ id: 7, name: "Clinical", memberCount: 2, taskCount: 5, weeklyPlanCount: 1, dailyReportCount: 3 }] as never);
    vi.spyOn(db, "listDepartmentAuditEvents").mockResolvedValue([{ id: 9, createdAt: new Date("2026-08-23T12:00:00.000Z"), actorName: "=Administrator", actorEmail: "admin@example.com", action: "department.created", entityType: "department", entityId: 7, metadata: "=Clinical" }] as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const admin = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(admin.admin.departmentDashboardTotals()).resolves.toMatchObject([{ id: 7, taskCount: 5 }]);
    await expect(admin.admin.departmentAuditExport()).resolves.toMatchObject({ rowCount: 1, csv: expect.stringContaining("'=Administrator") });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "department.audit_exported" }));
  });

  it("passes validated inclusive date ranges to department totals and audit export procedures", async () => {
    const filters = { from: "2026-08-01", to: "2026-08-23" };
    vi.spyOn(db, "getDepartmentDashboardTotals").mockResolvedValue([] as never);
    vi.spyOn(db, "listDepartmentAuditEvents").mockResolvedValue([] as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const admin = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(admin.admin.departmentDashboardTotals(filters)).resolves.toEqual([]);
    await expect(admin.admin.departmentAuditExport(filters)).resolves.toMatchObject({ filename: "ffm-department-audit-2026-08-01-to-2026-08-23.csv" });
    await expect(admin.admin.departmentAuditEvents({ from: "2026-08-23", to: "2026-08-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.getDepartmentDashboardTotals).toHaveBeenCalledWith(filters);
    expect(db.listDepartmentAuditEvents).toHaveBeenCalledWith(filters);
  });

  it("generates Administrator-only monthly department summary data from the exact calendar month and audits the request", async () => {
    const nonAdmin = appRouter.createCaller(contextFor(baseUser));
    await expect(nonAdmin.admin.departmentMonthlySummary({ month: "2026-08" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.spyOn(db, "getDepartmentDashboardTotals").mockResolvedValue([{ id: 7, name: "Clinical", taskCount: 4, weeklyPlanCount: 2, dailyReportCount: 5 }] as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const admin = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(admin.admin.departmentMonthlySummary({ month: "2026-08" })).resolves.toMatchObject({ month: "2026-08", from: "2026-08-01", to: "2026-08-31", totals: [{ id: 7 }] });
    await expect(admin.admin.departmentMonthlySummary({ month: "2026-13" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.getDepartmentDashboardTotals).toHaveBeenCalledWith({ from: "2026-08-01", to: "2026-08-31" });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "department.monthly_summary_generated", metadata: expect.stringContaining("2026-08") }));
  });

  it("protects the designated administrator and the acting administrator account", () => {
    expect(isProtectedAdminTarget({ email: "DR.SELEAM@GMAIL.COM", openId: "other" }, "actor")).toBe(true);
    expect(isProtectedAdminTarget({ email: "other@example.com", openId: "actor" }, "actor")).toBe(true);
    expect(isProtectedAdminTarget({ email: "other@example.com", openId: "other" }, "actor")).toBe(false);
  });

  it("preserves registered identity fields during an auth refresh that only supplies an open ID", () => {
    const refreshedAt = new Date("2026-08-20T17:45:00.000Z");
    const updateSet = buildUserRefreshUpdateSet({ openId: "warehouse-hero-identity", lastSignedIn: refreshedAt }, refreshedAt);
    expect(updateSet).toEqual({ lastSignedIn: refreshedAt });
    expect(updateSet).not.toHaveProperty("name");
    expect(updateSet).not.toHaveProperty("email");
    expect(updateSet).not.toHaveProperty("loginMethod");
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

  it("keeps Manager seniority and Top Manager scopes Administrator-only", async () => {
    const managerCaller = appRouter.createCaller(contextFor({ ...baseUser, id: 40, role: "manager", email: "manager@example.com" }));
    await expect(managerCaller.admin.setManagerSeniority({ managerId: 40, level: "top_manager" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(managerCaller.admin.assignManagerToTopManager({ topManagerId: 40, managerId: 41 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.spyOn(db, "getUserById").mockResolvedValue({ ...baseUser, id: 40, role: "manager", email: "top@example.com" } as never);
    vi.spyOn(db, "setManagerSeniority").mockResolvedValue({ id: 1, managerId: 40, level: "top_manager", setBy: 1, setAt: new Date() } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const adminCaller = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(adminCaller.admin.setManagerSeniority({ managerId: 40, level: "top_manager" })).resolves.toMatchObject({ managerId: 40, level: "top_manager" });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "manager_seniority.updated", entityId: 40 }));
  });

  it("allows a designated Top Manager to direct only Managers assigned to their scope", async () => {
    const topManager = { ...baseUser, id: 40, role: "manager" as const, email: "top@example.com" };
    const caller = appRouter.createCaller(contextFor(topManager));
    vi.spyOn(db, "isTopManager").mockResolvedValue(true);
    vi.spyOn(db, "isManagerDirectedByTopManager").mockResolvedValue(false);
    await expect(caller.operations.createManagerDirection({ managerId: 41, title: "Confirm theatre schedule" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    vi.spyOn(db, "isManagerDirectedByTopManager").mockResolvedValue(true);
    vi.spyOn(db, "createManagerDirection").mockResolvedValue({ id: 91, topManagerId: 40, managerId: 41, title: "Confirm theatre schedule", status: "open", createdAt: new Date() } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    await expect(caller.operations.createManagerDirection({ managerId: 41, title: "Confirm theatre schedule", dueDate: "2026-09-01" })).resolves.toMatchObject({ id: 91, managerId: 41 });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "top_manager.direction_created", entityId: 91 }));
  });

  it("does not expose seniority fields to an ordinary Manager direction workspace", async () => {
    const manager = { ...baseUser, id: 41, role: "manager" as const, email: "manager@example.com" };
    vi.spyOn(db, "isTopManager").mockResolvedValue(false);
    vi.spyOn(db, "listManagerDirectionsForManager").mockResolvedValue([{ id: 91, topManagerId: 40, managerId: 41, title: "Confirm theatre schedule", status: "open", topManagerName: "Lead Manager" }] as never);
    const caller = appRouter.createCaller(contextFor(manager));
    const result = await caller.operations.managerDirectionWorkspace();
    expect(result).toMatchObject({ canDirectManagers: false, managers: [], issuedDirections: [], receivedDirections: [{ id: 91, title: "Confirm theatre schedule" }] });
    expect(JSON.stringify(result)).not.toContain("top_manager");
    expect(JSON.stringify(result)).not.toContain("seniority");
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

  it("allows Warehouse Heroes to publish GPS and delivery proof without a Manager assignment", async () => {
    const warehouseHero = { ...baseUser, id: 54, openId: "warehouse-hero-54", role: "warehouse_hero" as const, locationSharing: true };
    vi.spyOn(db, "getUserById").mockResolvedValue(warehouseHero);
    vi.spyOn(db, "getWarehouseHeroLocation").mockResolvedValue(undefined);
    vi.spyOn(db, "upsertWarehouseHeroLocation").mockResolvedValue({ id: 94, warehouseHeroId: 54, latitude: "24.7136000", longitude: "46.6753000", capturedAt: new Date(), updatedAt: new Date() } as never);
    vi.mocked(storagePut).mockResolvedValue({ key: "warehouse-delivery-proofs/54/proof.jpg", url: "/manus-storage/warehouse-delivery-proofs/54/proof.jpg" });
    vi.spyOn(db, "createWarehouseDeliveryProof").mockResolvedValue({ id: 95, warehouseHeroId: 54, note: null, storageKey: "warehouse-delivery-proofs/54/proof.jpg", mimeType: "image/jpeg", sizeBytes: 22, capturedAt: new Date(), createdAt: new Date() } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.updateWarehouseHeroLocation({ latitude: "24.7136000", longitude: "46.6753000" })).resolves.toMatchObject({ id: 94, warehouseHeroId: 54 });
    await expect(caller.operations.uploadWarehouseDeliveryProof({ fileName: "proof.jpg", mimeType: "image/jpeg", captureSource: "live_camera", base64: "data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUA==" })).resolves.toMatchObject({ proofId: 95 });
  });

  it("rejects out-of-range Warehouse Hero GPS coordinates before persistence", async () => {
    const warehouseHero = { ...baseUser, id: 55, openId: "warehouse-hero-55", role: "warehouse_hero" as const, locationSharing: true };
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.updateWarehouseHeroLocation({ latitude: "91", longitude: "46.6753000" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.operations.updateWarehouseHeroLocation({ latitude: "24.7136000", longitude: "181" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns shared Warehouse delivery proofs to every authenticated FFM member", async () => {
    vi.spyOn(db, "listSharedWarehouseDeliveryProofs").mockResolvedValue([{ id: 93, warehouseHeroId: 52, warehouseHeroName: "Hero", warehouseHeroEmail: "hero@example.com", note: "Delivered", storageKey: "warehouse-delivery-proofs/52/proof.jpg", mimeType: "image/jpeg", sizeBytes: 1200, capturedAt: new Date(), url: "/manus-storage/warehouse-delivery-proofs/52/proof.jpg" }] as never);
    const caller = appRouter.createCaller(contextFor(baseUser));
    await expect(caller.operations.warehouseDeliveryProofs()).resolves.toHaveLength(1);
    expect(db.listSharedWarehouseDeliveryProofs).toHaveBeenCalledWith(undefined);
  });

  it("passes valid delivery-proof date filters through the shared query", async () => {
    vi.spyOn(db, "listSharedWarehouseDeliveryProofs").mockResolvedValue([] as never);
    const caller = appRouter.createCaller(contextFor(baseUser));
    await expect(caller.operations.warehouseDeliveryProofs({ from: "2026-08-01", to: "2026-08-20" })).resolves.toEqual([]);
    expect(db.listSharedWarehouseDeliveryProofs).toHaveBeenCalledWith({ from: "2026-08-01", to: "2026-08-20" });
  });

  it("exports shared delivery proofs with the selected audit filters", async () => {
    vi.spyOn(db, "listSharedWarehouseDeliveryProofs").mockResolvedValue([{ id: 100, warehouseHeroId: 71, warehouseHeroName: "Hero", warehouseHeroEmail: "hero@example.com", note: "=Handover", storageKey: "warehouse-delivery-proofs/71/proof.jpg", mimeType: "image/jpeg", sizeBytes: 1200, capturedAt: new Date("2026-08-10T12:00:00.000Z"), url: "/manus-storage/warehouse-delivery-proofs/71/proof.jpg" }, { id: 101, warehouseHeroId: 72, warehouseHeroName: "Other Hero", warehouseHeroEmail: "other@example.com", note: "Other", storageKey: "warehouse-delivery-proofs/72/proof.jpg", mimeType: "image/jpeg", sizeBytes: 1000, capturedAt: new Date("2026-08-11T12:00:00.000Z"), url: "/manus-storage/warehouse-delivery-proofs/72/proof.jpg" }] as never);
    const caller = appRouter.createCaller(contextFor(baseUser));
    const csv = await caller.operations.exportWarehouseDeliveryProofsCsv({ from: "2026-08-01", to: "2026-08-20", warehouseHeroId: 71 });
    expect(db.listSharedWarehouseDeliveryProofs).toHaveBeenCalledWith({ from: "2026-08-01", to: "2026-08-20", warehouseHeroId: 71 });
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
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ actorId: 74, action: "manager_surgery.created", entityType: "surgery", entityId: 102, metadata: expect.stringContaining('"delegateId":75') }));
  });

  it("lets every ordinary Manager create a self-owned surgery without assigning a Delegate", async () => {
    const manager = { ...baseUser, id: 79, role: "manager" as const, email: "manager@example.com" };
    vi.spyOn(db, "isTopManager").mockResolvedValue(false);
    vi.spyOn(db, "getClientById").mockResolvedValue({ id: 5, name: "City Hospital" } as never);
    vi.spyOn(db, "createSurgery").mockResolvedValue({ id: 131, assignedManagerId: 79, delegateId: null, clientId: 5 } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.operations.createManagerSurgery({ clientId: 5, surgeryDate: new Date("2026-09-04"), procedureName: "Independent surgery" })).resolves.toMatchObject({ id: 131, assignedManagerId: 79 });
    expect(db.createSurgery).toHaveBeenCalledWith(expect.objectContaining({ assignedManagerId: 79, createdBy: 79 }));
    expect((db.createSurgery as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0][0]).not.toHaveProperty("delegateId");
  });

  it("lets a Delegate create an independently owned surgery", async () => {
    const delegate = { ...baseUser, id: 80, role: "delegate" as const, email: "delegate@example.com" };
    vi.spyOn(db, "createSurgery").mockResolvedValue({ id: 132, delegateId: 80, assignedManagerId: null, clientId: 5 } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(delegate));
    await expect(caller.operations.addSurgery({ clientId: 5, surgeryDate: new Date("2026-09-05"), procedureName: "Delegate surgery" })).resolves.toMatchObject({ id: 132, delegateId: 80 });
    expect(db.createSurgery).toHaveBeenCalledWith(expect.objectContaining({ delegateId: 80, createdBy: 80 }));
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

  it("keeps Warehouse Heroes outside clinical surgery planning", async () => {
    const warehouseHero = appRouter.createCaller(contextFor({ ...baseUser, id: 78, role: "warehouse_hero" as const, email: "hero@example.com" }));
    await expect(warehouseHero.operations.createManagerSurgery({ delegateId: 75, clientId: 5, surgeryDate: new Date("2026-09-01"), procedureName: "Knee replacement" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows every authenticated role to read the shared surgery calendar while keeping clinical resources field-only", async () => {
    vi.spyOn(db, "listAllSurgeries").mockResolvedValue([{ id: 121, delegateId: 75, procedureName: "Knee replacement", surgeryDate: new Date("2026-09-01"), calendarStatus: "notified" }] as never);
    const warehouseHero = appRouter.createCaller(contextFor({ ...baseUser, id: 120, role: "warehouse_hero" as const, email: "hero@example.com" }));
    const standardUser = appRouter.createCaller(contextFor(baseUser));
    await expect(warehouseHero.operations.surgeryCalendar()).resolves.toHaveLength(1);
    await expect(standardUser.operations.surgeryCalendar()).resolves.toHaveLength(1);
    await expect(warehouseHero.operations.surgeryResources({ surgeryId: 121 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets an assigned Manager and the Administrator update surgery calendar appointments", async () => {
    const surgery = { id: 122, delegateId: 75, surgeryDate: new Date("2026-09-01"), calendarStatus: "notified" };
    vi.spyOn(db, "getSurgeryById").mockResolvedValue(surgery as never);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([75]);
    vi.spyOn(db, "updateSurgery").mockResolvedValue({ ...surgery, calendarStatus: "confirmed" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const manager = appRouter.createCaller(contextFor({ ...baseUser, id: 74, role: "manager" as const, email: "manager@example.com" }));
    await expect(manager.operations.updateSurgerySchedule({ id: 122, surgeryDate: new Date("2026-09-02T08:00:00.000Z"), calendarStatus: "confirmed" })).resolves.toMatchObject({ id: 122, calendarStatus: "confirmed" });
    const admin = appRouter.createCaller(contextFor({ ...baseUser, id: 1, role: "admin" as const, email: "dr.seleam@gmail.com" }));
    await expect(admin.operations.updateSurgerySchedule({ id: 122, surgeryDate: new Date("2026-09-02T08:00:00.000Z"), calendarStatus: "confirmed" })).resolves.toMatchObject({ id: 122, calendarStatus: "confirmed" });
  });

  it("registers implants only within the caller's assigned surgery scope", async () => {
    const surgery = { id: 123, delegateId: 75, surgeryDate: new Date("2026-09-01"), calendarStatus: "confirmed" };
    vi.spyOn(db, "getSurgeryById").mockResolvedValue(surgery as never);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([75]);
    vi.spyOn(db, "getImplantCatalogueItem").mockResolvedValue({ id: 8, name: "Femoral stem", manufacturer: "FFM Medical", productCode: "FS-8", isActive: true } as never);
    vi.spyOn(db, "createSurgeryImplant").mockResolvedValue({ id: 10, surgeryId: 123, implantName: "Femoral stem", quantity: 1 } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const manager = appRouter.createCaller(contextFor({ ...baseUser, id: 74, role: "manager" as const, email: "manager@example.com" }));
    await expect(manager.operations.addSurgeryImplant({ surgeryId: 123, implantCatalogueId: 8, quantity: 1, unitPrice: 1250.5, currency: "sar", lotNumber: "LOT-9" })).resolves.toMatchObject({ id: 10, implantName: "Femoral stem" });
    expect(db.createSurgeryImplant).toHaveBeenCalledWith(expect.objectContaining({ surgeryId: 123, implantCatalogueId: 8, implantName: "Femoral stem", unitPrice: "1250.50", currency: "SAR", registeredBy: 74, lotNumber: "LOT-9" }));
  });

  it("allows clinical users to register multiple separate implant lines for one surgery", async () => {
    const surgery = { id: 124, delegateId: 75, surgeryDate: new Date("2026-09-01"), calendarStatus: "confirmed" };
    vi.spyOn(db, "getSurgeryById").mockResolvedValue(surgery as never);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([75]);
    vi.spyOn(db, "getImplantCatalogueItem").mockImplementation(async (id) => ({ id, name: id === 18 ? "Locking plate" : "Cancellous screw", isActive: true }) as never);
    vi.spyOn(db, "createSurgeryImplant").mockImplementation(async (input) => ({ id: input.implantCatalogueId === 18 ? 18 : 19, surgeryId: input.surgeryId, implantName: input.implantName, quantity: input.quantity }) as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const manager = appRouter.createCaller(contextFor({ ...baseUser, id: 74, role: "manager" as const, email: "manager@example.com" }));
    await expect(manager.operations.addSurgeryImplant({ surgeryId: 124, implantCatalogueId: 18, quantity: 1, unitPrice: 1200, currency: "SAR" })).resolves.toMatchObject({ surgeryId: 124 });
    await expect(manager.operations.addSurgeryImplant({ surgeryId: 124, implantCatalogueId: 19, quantity: 6, unitPrice: 55, currency: "SAR" })).resolves.toMatchObject({ surgeryId: 124 });
    expect(db.createSurgeryImplant).toHaveBeenCalledTimes(2);
    expect(db.createSurgeryImplant).toHaveBeenNthCalledWith(1, expect.objectContaining({ surgeryId: 124, implantName: "Locking plate", quantity: 1 }));
    expect(db.createSurgeryImplant).toHaveBeenNthCalledWith(2, expect.objectContaining({ surgeryId: 124, implantName: "Cancellous screw", quantity: 6 }));
  });

  it("calculates surgery implant totals separately for each recorded currency", () => {
    expect(db.calculateSurgeryImplantTotals([{ quantity: 2, unitPrice: "1250.50", currency: "SAR" }, { quantity: 1, unitPrice: 99.99, currency: "SAR" }, { quantity: 3, unitPrice: 10, currency: "USD" }])).toEqual([{ currency: "SAR", total: 2600.99 }, { currency: "USD", total: 30 }]);
  });

  it("lets a Delegate search imported catalogue products without an approval gate", async () => {
    vi.spyOn(db, "searchImplantCatalogue").mockResolvedValue([{ id: 501, name: "Femoral nail", productCode: "2-07-321-340", source: "Altamamproductsforuploading.xlsx / Medgal" }] as never);
    const delegate = appRouter.createCaller(contextFor({ ...baseUser, id: 75, role: "delegate" as const, email: "delegate@example.com" }));
    await expect(delegate.operations.implantCatalogue({ query: "Femoral" })).resolves.toMatchObject([{ id: 501, productCode: "2-07-321-340" }]);
    expect(db.searchImplantCatalogue).toHaveBeenCalledWith("Femoral");
  });

  it("allows a listed catalogue implant without an approval-state gate", async () => {
    const surgery = { id: 125, delegateId: 75, surgeryDate: new Date("2026-09-01"), calendarStatus: "confirmed" };
    vi.spyOn(db, "getSurgeryById").mockResolvedValue(surgery as never);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([75]);
    vi.spyOn(db, "getImplantCatalogueItem").mockResolvedValue({ id: 9, name: "Retired implant", isActive: false } as never);
    vi.spyOn(db, "createSurgeryImplant").mockResolvedValue({ id: 11, surgeryId: 125, implantName: "Retired implant" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const manager = appRouter.createCaller(contextFor({ ...baseUser, id: 74, role: "manager" as const, email: "manager@example.com" }));
    await expect(manager.operations.addSurgeryImplant({ surgeryId: 125, implantCatalogueId: 9, quantity: 1, unitPrice: 100, currency: "SAR" })).resolves.toMatchObject({ id: 11 });
  });

  it("lets a Delegate create and register a missing implant directly during an assigned surgery", async () => {
    const delegate = { ...baseUser, id: 75, role: "delegate" as const, email: "delegate@example.com" };
    vi.spyOn(db, "getSurgeryById").mockResolvedValue({ id: 126, delegateId: 75, surgeryDate: new Date("2026-09-01"), calendarStatus: "confirmed" } as never);
    vi.spyOn(db, "createImplantCatalogueItem").mockResolvedValue({ id: 44, name: "Custom trauma plate", productCode: "CTP-1" } as never);
    vi.spyOn(db, "createSurgeryImplant").mockResolvedValue({ id: 12, surgeryId: 126, implantName: "Custom trauma plate" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(delegate));
    await expect(caller.operations.addSurgeryImplant({ surgeryId: 126, implantName: "Custom trauma plate", productCode: "CTP-1", quantity: 2, unitPrice: 250, currency: "SAR" })).resolves.toMatchObject({ id: 12 });
    expect(db.createImplantCatalogueItem).toHaveBeenCalledWith(expect.objectContaining({ name: "Custom trauma plate", productCode: "CTP-1", source: "Direct clinical entry", createdBy: 75 }));
  });

  it("requires a reason and new future date before postponing a surgery on its scheduled day", async () => {
    const delegate = { ...baseUser, id: 75, role: "delegate" as const, email: "delegate@example.com" };
    const surgeryDate = new Date();
    vi.spyOn(db, "getSurgeryById").mockResolvedValue({ id: 126, delegateId: 75, surgeryDate, calendarStatus: "confirmed" } as never);
    const caller = appRouter.createCaller(contextFor(delegate));
    await expect(caller.operations.resolveSurgeryLifecycle({ id: 126, action: "postponed" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.operations.resolveSurgeryLifecycle({ id: 126, action: "postponed", reason: "Operating room unavailable", rescheduledDate: new Date(surgeryDate.getTime()) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires an implant and patient-sheet proof before completing a surgery", async () => {
    const delegate = { ...baseUser, id: 75, role: "delegate" as const, email: "delegate@example.com" };
    vi.spyOn(db, "getSurgeryById").mockResolvedValue({ id: 127, delegateId: 75, surgeryDate: new Date(), calendarStatus: "confirmed" } as never);
    vi.spyOn(db, "listSurgeryImplants").mockResolvedValue([] as never);
    vi.spyOn(db, "listSurgeryDeliveryProofs").mockResolvedValue([] as never);
    const updateSurgery = vi.spyOn(db, "updateSurgery");
    const caller = appRouter.createCaller(contextFor(delegate));
    await expect(caller.operations.resolveSurgeryLifecycle({ id: 127, action: "completed" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(updateSurgery).not.toHaveBeenCalled();
  });

  it("completes a surgery only after approved implants and patient-sheet proof are present", async () => {
    const delegate = { ...baseUser, id: 75, role: "delegate" as const, email: "delegate@example.com" };
    const surgery = { id: 128, delegateId: 75, surgeryDate: new Date(), calendarStatus: "confirmed" };
    vi.spyOn(db, "getSurgeryById").mockResolvedValue(surgery as never);
    vi.spyOn(db, "listSurgeryImplants").mockResolvedValue([{ id: 1, surgeryId: 128, implantCatalogueId: 8 }] as never);
    vi.spyOn(db, "listSurgeryDeliveryProofs").mockResolvedValue([{ id: 2, surgeryId: 128, storageKey: "surgery-delivery-proofs/128/patient-sheet.pdf" }] as never);
    vi.spyOn(db, "updateSurgery").mockResolvedValue({ ...surgery, calendarStatus: "completed" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(delegate));
    await expect(caller.operations.resolveSurgeryLifecycle({ id: 128, action: "completed", reason: "Procedure successful" })).resolves.toMatchObject({ id: 128, calendarStatus: "completed" });
    expect(db.updateSurgery).toHaveBeenCalledWith(128, expect.objectContaining({ calendarStatus: "completed" }));
  });

  it("stores an authorized Delegate patient-sheet proof in managed storage before persisting surgery metadata", async () => {
    const delegate = { ...baseUser, id: 75, role: "delegate" as const, email: "delegate@example.com" };
    vi.spyOn(db, "getSurgeryById").mockResolvedValue({ id: 124, delegateId: 75, surgeryDate: new Date("2026-09-01") } as never);
    vi.mocked(storagePut).mockResolvedValue({ key: "surgery-delivery-proofs/124/patient-sheet.pdf", url: "/manus-storage/surgery-delivery-proofs/124/patient-sheet.pdf" });
    vi.spyOn(db, "createSurgeryDeliveryProof").mockResolvedValue({ id: 11, surgeryId: 124, storageKey: "surgery-delivery-proofs/124/patient-sheet.pdf", originalName: "patient-sheet.pdf", mimeType: "application/pdf", sizeBytes: 10, uploadedBy: 75, createdAt: new Date() } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(delegate));
    await expect(caller.operations.uploadSurgeryDeliveryProof({ surgeryId: 124, fileName: "patient sheet.pdf", mimeType: "application/pdf", base64: "data:application/pdf;base64,QUJDREVGR0hJSktMTU5PUA==", note: "Hospital delivery sheet" })).resolves.toMatchObject({ proofId: 11 });
    expect(storagePut).toHaveBeenCalledWith(expect.stringContaining("surgery-delivery-proofs/124/"), expect.any(Buffer), "application/pdf");
    expect(db.createSurgeryDeliveryProof).toHaveBeenCalledWith(expect.objectContaining({ surgeryId: 124, uploadedBy: 75, originalName: "patient_sheet.pdf" }));
  });

  it("returns only the signed-in Warehouse Hero's own delivery-proof history", async () => {
    const warehouseHero = { ...baseUser, id: 66, role: "warehouse_hero" as const, email: "hero@example.com" };
    vi.spyOn(db, "listWarehouseDeliveryProofsForHero").mockResolvedValue([{ id: 96, note: "Hospital handover", storageKey: "warehouse-delivery-proofs/66/proof.jpg", mimeType: "image/jpeg", sizeBytes: 1200, capturedAt: new Date(), url: "/manus-storage/warehouse-delivery-proofs/66/proof.jpg" }] as never);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.myWarehouseDeliveryProofs()).resolves.toHaveLength(1);
    expect(db.listWarehouseDeliveryProofsForHero).toHaveBeenCalledWith(66);
  });

  it("reports every signed-in Warehouse Hero as available without a Manager assignment", async () => {
    const warehouseHero = { ...baseUser, id: 68, role: "warehouse_hero" as const, email: "hero@example.com" };
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.warehouseHeroAssignmentStatus()).resolves.toEqual({ assigned: true, available: true });
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
    await expect(caller.operations.uploadWarehouseDeliveryProof({ fileName: "proof.jpg", mimeType: "image/jpeg", captureSource: "live_camera", base64: "data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUA==", note: "Delivered" })).resolves.toMatchObject({ proofId: 94, url: "/manus-storage/warehouse-delivery-proofs/72/proof_hash.jpg" });
    expect(storagePut).toHaveBeenCalled();
    expect(db.createWarehouseDeliveryProof).toHaveBeenCalledWith(expect.objectContaining({ warehouseHeroId: 72, mimeType: "image/jpeg", captureSource: "live_camera", note: "Delivered" }));
  });

  it("stores recipient identity, a digital signature, and grouped live-camera photos for a signed hospital handover", async () => {
    const warehouseHero = { ...baseUser, id: 75, openId: "warehouse-hero-75", role: "warehouse_hero" as const, email: "hero@example.com" };
    vi.mocked(storagePut).mockResolvedValueOnce({ key: "warehouse-handovers/75/signature.png", url: "/manus-storage/warehouse-handovers/75/signature.png" }).mockResolvedValueOnce({ key: "warehouse-delivery-proofs/75/proof.jpg", url: "/manus-storage/warehouse-delivery-proofs/75/proof.jpg" });
    vi.spyOn(db, "createWarehouseHandover").mockResolvedValue({ id: 301, warehouseHeroId: 75, recipientName: "Hospital Recipient", signatureStorageKey: "warehouse-handovers/75/signature.png", signatureMimeType: "image/png", createdAt: new Date() } as never);
    vi.spyOn(db, "createWarehouseDeliveryProof").mockResolvedValue({ id: 302, warehouseHeroId: 75, handoverId: 301, storageKey: "warehouse-delivery-proofs/75/proof.jpg", mimeType: "image/jpeg", sizeBytes: 10, capturedAt: new Date(), createdAt: new Date() } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.submitWarehouseHandover({ recipientName: "Hospital Recipient", signatureBase64: `data:image/png;base64,${"QUJD".repeat(50)}`, proofs: [{ fileName: "proof.jpg", base64: "data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUA==" }] })).resolves.toMatchObject({ handoverId: 301, proofIds: [302] });
    expect(db.createWarehouseHandover).toHaveBeenCalledWith(expect.objectContaining({ warehouseHeroId: 75, recipientName: "Hospital Recipient", signatureMimeType: "image/png" }));
    expect(db.createWarehouseDeliveryProof).toHaveBeenCalledWith(expect.objectContaining({ handoverId: 301, captureSource: "live_camera" }));
  });

  it("restricts handover acknowledgement to Managers and Administrators and records the acknowledgement", async () => {
    vi.spyOn(db, "acknowledgeWarehouseHandover").mockResolvedValue({ id: 301, warehouseHeroId: 75, recipientName: "Hospital Recipient", acknowledgedBy: 11, acknowledgedAt: new Date() } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const regular = appRouter.createCaller(contextFor(baseUser));
    await expect(regular.operations.acknowledgeWarehouseHandover({ handoverId: 301 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const manager = appRouter.createCaller(contextFor({ ...baseUser, id: 11, role: "manager", email: "manager@example.com" }));
    await expect(manager.operations.acknowledgeWarehouseHandover({ handoverId: 301 })).resolves.toMatchObject({ id: 301 });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "warehouse_handover.acknowledged", entityId: 301 }));
  });

  it("restricts weekly handover analytics export to Managers and Administrators and audits the export", async () => {
    vi.spyOn(db, "getWeeklyWarehouseHandoverAnalytics").mockResolvedValue({ weekStart: "2026-08-17", weekEnd: "2026-08-24", totalHandovers: 1, acknowledgedHandovers: 1, awaitingAcknowledgement: 0, totalProofPhotos: 2, rows: [{ id: 301, completedAt: new Date("2026-08-20T10:00:00.000Z"), warehouseHeroName: "Hero", warehouseHeroEmail: "hero@example.com", recipientName: "Recipient", proofCount: 2, acknowledgementStatus: "acknowledged", acknowledgedAt: new Date("2026-08-20T11:00:00.000Z"), acknowledgedByName: "Manager", note: null }] } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const regular = appRouter.createCaller(contextFor(baseUser));
    await expect(regular.operations.exportWarehouseHandoverWeeklyAnalyticsCsv({ weekStart: "2026-08-17" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const manager = appRouter.createCaller(contextFor({ ...baseUser, id: 11, role: "manager", email: "manager@example.com" }));
    await expect(manager.operations.exportWarehouseHandoverWeeklyAnalyticsCsv({ weekStart: "2026-08-17" })).resolves.toMatchObject({ filename: "ffm-weekly-handover-analytics-2026-08-17.csv", summary: { totalHandovers: 1 } });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "warehouse_handover.weekly_analytics_exported" }));
  });

  it("neutralizes spreadsheet-formula text in weekly handover analytics CSV output", () => {
    const csv = db.warehouseHandoverAnalyticsCsv({ weekStart: "2026-08-17", weekEnd: "2026-08-24", totalHandovers: 1, acknowledgedHandovers: 0, awaitingAcknowledgement: 1, totalProofPhotos: 1, rows: [{ id: 44, completedAt: new Date("2026-08-20T10:00:00.000Z"), warehouseHeroName: "=HYPERLINK(\"https://unsafe.example\")", warehouseHeroEmail: "hero@example.com", recipientName: "Recipient", proofCount: 1, acknowledgementStatus: "awaiting_acknowledgement", acknowledgedAt: null, acknowledgedByName: null, note: null }] });
    expect(csv).toContain("'=HYPERLINK");
  });

  it("rejects delivery-proof payloads larger than the server-side 8 MB limit", async () => {
    const warehouseHero = { ...baseUser, id: 73, openId: "warehouse-hero-73", role: "warehouse_hero" as const, email: "hero@example.com" };
    vi.spyOn(db, "hasManagerForWarehouseHero").mockResolvedValue(true);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.uploadWarehouseDeliveryProof({ fileName: "large.jpg", mimeType: "image/jpeg", captureSource: "live_camera", base64: "A".repeat(11_200_000) })).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("rejects device-library proof contracts that are not live-camera JPEG captures", async () => {
    const warehouseHero = { ...baseUser, id: 74, openId: "warehouse-hero-74", role: "warehouse_hero" as const, email: "hero@example.com" };
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.operations.uploadWarehouseDeliveryProof({ fileName: "proof.png", mimeType: "image/png" as never, captureSource: "live_camera", base64: "data:image/png;base64,QUJDREVGR0hJSktMTU5PUA==" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.operations.uploadWarehouseDeliveryProof({ fileName: "proof.jpg", mimeType: "image/jpeg", captureSource: "legacy_upload" as never, base64: "data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUA==" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
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

  it("creates and resolves expiring monthly report shares only for Administrators", async () => {
    const totals = [{ id: 7, name: "Clinical", isActive: true, memberCount: 4, managerCount: 1, delegateCount: 2, warehouseHeroCount: 1, taskCount: 9, openTaskCount: 3, weeklyPlanCount: 2, dailyReportCount: 6 }];
    vi.spyOn(db, "getDepartmentDashboardTotals").mockResolvedValue(totals as never);
    vi.spyOn(db, "createMonthlyDepartmentReportShare").mockResolvedValue({ id: 41, tokenHash: "hashed", createdBy: 1, month: "2026-08", commentary: "Focus on coverage", reportPayload: JSON.stringify({ month: "2026-08", from: "2026-08-01", to: "2026-08-31", generatedAt: new Date(), totals }), expiresAt: new Date("2026-09-01"), createdAt: new Date() } as never);
    vi.spyOn(db, "getActiveMonthlyDepartmentReportShare").mockResolvedValue({ id: 41, tokenHash: "hashed", createdBy: 1, month: "2026-08", commentary: "Focus on coverage", reportPayload: JSON.stringify({ month: "2026-08", from: "2026-08-01", to: "2026-08-31", generatedAt: new Date(), totals }), expiresAt: new Date("2026-09-01"), createdAt: new Date() } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const regular = appRouter.createCaller(contextFor(baseUser));
    await expect(regular.admin.createMonthlyDepartmentReportShare({ month: "2026-08", commentary: "No access" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const admin = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(admin.admin.createMonthlyDepartmentReportShare({ month: "2026-08", commentary: "Focus on coverage" })).resolves.toMatchObject({ token: expect.any(String) });
    await expect(admin.admin.resolveMonthlyDepartmentReportShare({ token: "x".repeat(32) })).resolves.toMatchObject({ month: "2026-08", commentary: "Focus on coverage", totals: [{ id: 7 }] });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "department.monthly_report_shared" }));
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "department.monthly_report_share_accessed" }));
  });

  it("lets only Administrators list and revoke shared monthly report links", async () => {
    vi.spyOn(db, "listMonthlyDepartmentReportShares").mockResolvedValue([{ id: 51, month: "2026-08", createdAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000), createdByName: "Administrator", createdByEmail: "dr.seleam@gmail.com", active: true }] as never);
    vi.spyOn(db, "revokeMonthlyDepartmentReportShare").mockResolvedValue({ deleted: 1 });
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const regular = appRouter.createCaller(contextFor(baseUser));
    await expect(regular.admin.monthlyDepartmentReportShares()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(regular.admin.revokeMonthlyDepartmentReportShare({ id: 51 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const admin = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(admin.admin.monthlyDepartmentReportShares()).resolves.toMatchObject([{ id: 51, active: true }]);
    await expect(admin.admin.revokeMonthlyDepartmentReportShare({ id: 51 })).resolves.toEqual({ success: true });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "department.monthly_report_share_revoked", entityId: 51 }));
  });

  it("lets only Administrators extend active report-share expiry dates and audits the change", async () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    vi.spyOn(db, "updateMonthlyDepartmentReportShareExpiry").mockResolvedValue({ id: 51, expiresAt: future } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const regular = appRouter.createCaller(contextFor(baseUser));
    await expect(regular.admin.updateMonthlyDepartmentReportShareExpiry({ id: 51, expiresOn: future.toISOString().slice(0, 10) })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const admin = appRouter.createCaller(contextFor({ ...baseUser, role: "admin", email: "dr.seleam@gmail.com" }));
    await expect(admin.admin.updateMonthlyDepartmentReportShareExpiry({ id: 51, expiresOn: future.toISOString().slice(0, 10) })).resolves.toMatchObject({ id: 51 });
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "department.monthly_report_share_expiry_updated", entityId: 51 }));
  });

  it("returns Warehouse Hero lead activity only to Osama Ahmed or an Administrator", async () => {
    const activity = [{ id: 61, name: "Hero", email: "hero@example.com", todayTaskCount: 1, openTaskCount: 2, completedTaskCount: 3, recentProofCount: 1, recentProofs: [], latestLocationAt: null }];
    vi.spyOn(db, "getWarehouseHeroLeadActivity").mockResolvedValue(activity as never);
    vi.spyOn(db, "listUsers").mockResolvedValue([{ ...baseUser, id: 7770030, email: "osamaahmed@altamammed.com", role: "manager" }] as never);
    const ordinaryManager = appRouter.createCaller(contextFor({ ...baseUser, role: "manager", email: "manager@example.com" }));
    await expect(ordinaryManager.operations.warehouseHeroLeadActivity()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const designatedLead = appRouter.createCaller(contextFor({ ...baseUser, id: 7770030, role: "manager", email: "osamaahmed@altamammed.com" }));
    await expect(designatedLead.operations.warehouseHeroLeadActivity()).resolves.toMatchObject([{ id: 61, openTaskCount: 2 }]);
    expect(db.getWarehouseHeroLeadActivity).toHaveBeenCalledWith(7770030);
  });

  it("exports spreadsheet-safe Hero Lead activity only to Osama Ahmed or an Administrator", async () => {
    const activity = [{ id: 61, name: "=Hero", email: "hero@example.com", todayTaskCount: 1, openTaskCount: 2, completedTaskCount: 3, overdueProofTaskCount: 1, overdueProofTasks: [{ id: 7, scheduledAt: new Date("2026-08-01"), status: "completed" }], recentProofCount: 1, recentProofs: [], latestLocationAt: null }];
    vi.spyOn(db, "getWarehouseHeroLeadActivity").mockResolvedValue(activity as never);
    vi.spyOn(db, "listUsers").mockResolvedValue([{ ...baseUser, id: 7770030, email: "osamaahmed@altamammed.com", role: "manager" }] as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const ordinaryManager = appRouter.createCaller(contextFor({ ...baseUser, role: "manager", email: "manager@example.com" }));
    await expect(ordinaryManager.operations.exportWarehouseHeroLeadActivityCsv()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const designatedLead = appRouter.createCaller(contextFor({ ...baseUser, id: 7770030, role: "manager", email: "osamaahmed@altamammed.com" }));
    await expect(designatedLead.operations.exportWarehouseHeroLeadActivityCsv()).resolves.toContain("'=Hero");
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "warehouse_hero.lead_activity_exported", entityId: 7770030 }));
  });

});
