import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

function contextFor(user: NonNullable<TrpcContext["user"]>): TrpcContext {
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

const now = new Date("2026-08-23T12:00:00.000Z");
const superManager = { id: 301, openId: "super-manager", email: "m.selim@altamammed.com", name: "Super Manager", loginMethod: "manus", role: "manager" as const, createdAt: now, updatedAt: now, lastSignedIn: now };
const ordinaryManager = { ...superManager, id: 302, openId: "ordinary-manager", email: "ordinary.manager@example.com", name: "Ordinary Manager" };

describe("Super Manager roster oversight", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns all Manager, Delegate, and Warehouse Hero records for an allowlisted Super Manager", async () => {
    vi.spyOn(db, "listManagers").mockResolvedValue([{ id: 1, email: "manager@example.com" }] as never);
    vi.spyOn(db, "listDelegates").mockResolvedValue([{ id: 2, email: "delegate@example.com" }] as never);
    vi.spyOn(db, "listWarehouseHeroes").mockResolvedValue([{ id: 3, email: "hero@example.com" }] as never);
    const assignedDelegates = vi.spyOn(db, "listDelegatesForManager").mockResolvedValue([] as never);
    const caller = appRouter.createCaller(contextFor(superManager));
    await expect(caller.operations.superManagerRoster()).resolves.toMatchObject({ managers: [{ id: 1 }], delegates: [{ id: 2 }], warehouseHeroes: [{ id: 3 }] });
    await expect(caller.operations.delegates()).resolves.toEqual([{ id: 2, email: "delegate@example.com" }]);
    expect(assignedDelegates).not.toHaveBeenCalled();
  });

  it("does not grant roster oversight to an ordinary Manager", async () => {
    vi.spyOn(db, "listDelegatesForManager").mockResolvedValue([] as never);
    const allDelegates = vi.spyOn(db, "listDelegates").mockResolvedValue([] as never);
    const caller = appRouter.createCaller(contextFor(ordinaryManager));
    await expect(caller.operations.superManagerRoster()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.operations.delegates()).resolves.toEqual([]);
    expect(allDelegates).not.toHaveBeenCalled();
  });
});
