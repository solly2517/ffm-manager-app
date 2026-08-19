import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "user" | "manager" | "delegate" | "admin" = "user"): TrpcContext {
  return {
    user: { id: 999999, openId: `test-${role}`, name: "Test User", email: `${role}@example.com`, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("expanded FFM permissions", () => {
  it("blocks non-admin invitation creation", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.admin.createInvitation({ email: "new@example.com", role: "delegate" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid invitation tokens", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.invitations.preview({ token: "x".repeat(64) })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("blocks delegates from manager-only task creation", async () => {
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.operations.addTask({ delegateId: 1, clientId: 1, scheduledAt: new Date() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
