import { describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  activateInvitedUser: vi.fn(async () => ({ id: 22, openId: "invite:m.selim@example.com", email: "m.selim@example.com", name: null, role: "manager", loginMethod: "ffm-magic-link" })),
  addAuditEvent: vi.fn(),
  addEvidence: vi.fn(),
  createClient: vi.fn(),
  createInvitation: vi.fn(async (input: { email: string; role: string }) => ({ id: 7, email: input.email, role: input.role, acceptedAt: null })),
  createTask: vi.fn(),
  getClientById: vi.fn(),
  getInvitationByHash: vi.fn(),
  getOperationalSummary: vi.fn(),
  getTaskById: vi.fn(),
  getUserById: vi.fn(),
  getVisitByTaskId: vi.fn(),
  listAllTasks: vi.fn(),
  listAuditEvents: vi.fn(),
  listClients: vi.fn(),
  listInvitations: vi.fn(),
  listTasksForDelegate: vi.fn(),
  listUsers: vi.fn(),
  removeUser: vi.fn(),
  updateTaskStatus: vi.fn(),
  updateUserRole: vi.fn(),
  upsertUser: vi.fn(),
  upsertVisit: vi.fn(),
}));

vi.mock("./db", () => dbMock);

const { appRouter } = await import("./routers");
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "@shared/const";

function adminContext(): TrpcContext {

  return {
    user: { id: 1, openId: "admin-open-id", email: "dr.seleam@gmail.com", name: "FFM Administrator", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("invitations.acceptMagic", () => {
  it("activates the invited role and issues a short-lived FFM session cookie", async () => {
    const cookie = vi.fn();
    const caller = appRouter.createCaller({
      ...adminContext(),
      user: null,
      res: { cookie } as unknown as TrpcContext["res"],
    });
    dbMock.getInvitationByHash.mockResolvedValueOnce({ id: 9, email: "m.selim@example.com", role: "manager", acceptedAt: null, expiresAt: new Date(Date.now() + 60_000) });
    const result = await caller.invitations.acceptMagic({ token: "a".repeat(64) });
    expect(result).toEqual({ success: true, role: "manager" });
    expect(dbMock.acceptInvitation).toHaveBeenCalledWith(9);
    expect(cookie).toHaveBeenCalledWith(COOKIE_NAME, expect.any(String), expect.objectContaining({ maxAge: 43_200_000 }));
  });
});

describe("admin.createInvitation", () => {
  it("creates a Delegate invitation with a usable secure link", async () => {
    const caller = appRouter.createCaller(adminContext());
    const result = await caller.admin.createInvitation({ email: "delegate@example.com", role: "delegate" });

    expect(result.invitation?.role).toBe("delegate");
    expect(result.invitation?.email).toBe("delegate@example.com");
    expect(result.inviteUrl).toMatch(/^\/invite\/[a-f0-9]{64}$/);
    expect(dbMock.createInvitation).toHaveBeenCalledWith(expect.objectContaining({ email: "delegate@example.com", role: "delegate", invitedBy: 1 }));
  });
});
