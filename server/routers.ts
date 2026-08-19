import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getUserById, listUsers, removeUser, updateUserRole, upsertInvitedUser } from "./db";

const adminEmail = "dr.seleam@gmail.com";
const ensureAdmin = (email?: string | null, role?: string) => email?.toLowerCase() === adminEmail || role === "admin";
const adminOnly = protectedProcedure.use(({ ctx, next }) => {
  if (!ensureAdmin(ctx.user.email, ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access required" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  admin: router({
    users: adminOnly.query(async () => listUsers()),
    addUser: adminOnly.input(z.object({ email: z.string().email(), name: z.string().trim().min(1).max(120).optional() })).mutation(async ({ input }) => {
      const email = input.email.toLowerCase();
      if (email === adminEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "The protected administrator account already exists." });
      return upsertInvitedUser({ email, name: input.name || null });
    }),
    setRole: adminOnly.input(z.object({ id: z.number().int().positive(), role: z.enum(["user", "admin"]) })).mutation(async ({ input, ctx }) => {
      const target = await getUserById(input.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      if (target.email?.toLowerCase() === adminEmail || target.openId === ctx.user.openId) throw new TRPCError({ code: "FORBIDDEN", message: "The protected administrator role cannot be changed." });
      return updateUserRole(input.id, input.role);
    }),
    removeUser: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const target = await getUserById(input.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      if (target.email?.toLowerCase() === adminEmail || target.openId === ctx.user.openId) throw new TRPCError({ code: "FORBIDDEN", message: "The protected administrator account cannot be removed." });
      await removeUser(input.id);
      return { success: true } as const;
    }),
  }),
});


export type AppRouter = typeof appRouter;
