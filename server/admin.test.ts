import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
  it("rejects regular users from the user directory", async () => {
    const caller = appRouter.createCaller(contextFor(baseUser));
    await expect(caller.admin.users()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("recognizes the designated email as an administrator", async () => {
    const caller = appRouter.createCaller(contextFor({ ...baseUser, email: "dr.seleam@gmail.com" }));
    const result = await caller.admin.users();
    expect(Array.isArray(result)).toBe(true);
  });

});
