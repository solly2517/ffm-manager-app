import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME, FFM_MAGIC_SESSION_COOKIE } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  acceptInvitation,
  activateInvitedUser,
  addAuditEvent,
  addEvidence,
  createClient,
  updateClient,
  removeClient,
  createDoctor,
  getDoctorById,
  updateDoctor,
  removeDoctor,
  createGeography,
  getGeographyById,
  updateGeography,
  removeGeography,
  createInvitation,
  canUserUpdateTask,
  canManagerAccessDelegate,
  normalizeVisitReport,
  createTask,
  getClientById,
  getClientDeletionDependencies,
  getDoctorDeletionDependencies,
  getInvitationByHash,
  getOperationalSummary,
  getDetailedSurgeryReport,
  getTaskById,
  getUserById,
  getVisitById,
  getVisitByTaskId,
  getVisitPlanById,
  getSurgeryById,
  listAllSurgeries,
  listAllTasks,
  listAuditEvents,
  listClients,
  listDelegates,
  listDelegatesForManager,
  listWarehouseHeroes,
  listWarehouseHeroesForManager,
  listWarehouseHeroLocationsForManager,
  listWarehouseDeliveryProofsForManager,
  listWarehouseDeliveryProofsForHero,
  listSharedWarehouseDeliveryProofs,
  listSharedWarehouseHeroLocations,
  createWarehouseDeliveryProof,
  createWarehouseHandover,
  listWarehouseHandovers,
  acknowledgeWarehouseHandover,
  getWeeklyWarehouseHandoverAnalytics,
  warehouseHandoverAnalyticsCsv,
  listDoctors,
  listGeography,
  listInvitations,
  listMessages,
  listMessageRecipients,
  listSurgeriesForDelegate,
  listSurgeriesForManager,
  listTasksForDelegate,
  listTasksForManager,
  listDelegateIdsForManager,
  listWarehouseHeroIdsForManager,
  listUsers,
  listManagers,
  listManagerSenioritiesForAdmin,
  setManagerSeniority,
  isTopManager,
  listManagerDirectionScopes,
  createTopManagerManagerAssignment,
  removeTopManagerManagerAssignment,
  isManagerDirectedByTopManager,
  listManagersForTopManager,
  createManagerDirection,
  listManagerDirectionsForTopManager,
  listManagerDirectionsForManager,
  completeManagerDirection,
  listDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  removeDepartment,
  updateUserDepartment,
  getDepartmentDashboardTotals,
  listDepartmentAuditEvents,
  listSuperManagerReportFilterPresets,
  createSuperManagerReportFilterPreset,
  removeSuperManagerReportFilterPreset,
  createMonthlyDepartmentReportShare,
  getActiveMonthlyDepartmentReportShare,
  listMonthlyDepartmentReportShares,
  revokeMonthlyDepartmentReportShare,
  updateMonthlyDepartmentReportShareExpiry,
  getWarehouseHeroLeadActivity,
  warehouseHeroLeadActivityCsv,
  listManagerAssignments,
  listManagerWarehouseHeroAssignments,
  listVisitPlansForDelegate,
  listVisitPlansForManager,
  listAllVisitPlans,
  listLiveDelegatePositionsForManager,
  createMessage,
  createSurgery,
  createVisitPlan,
  removeSurgeryWithResources,
  updateSurgery,
  updateVisitPlan,
  updateNotificationPreferences,
  updateUserDefaultLanguage,
  removeUser,
  removeManagerDelegateAssignment,
  createManagerDelegateAssignment,
  createManagerWarehouseHeroAssignment,
  removeManagerWarehouseHeroAssignment,
  isDelegateAssignedToManager,
  isWarehouseHeroAssignedToManager,
  hasManagerForWarehouseHero,
  getWarehouseHeroLocation,
  upsertWarehouseHeroLocation,
  updateTaskStatus,
  updateUserDisplayName,
  updateUserRole,
  upsertUser,
  upsertVisit,
  isProtectedAdminTarget,
  operationalSummaryCsv,
  warehouseDeliveryProofsCsv,
  prepareVisitReport,
  captureClientError,
  dismissAllClientErrors,
  dismissClientError,
  listClientErrors,
  getMonitoringHealth,
  getWeeklyBackupReminderSchedule,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markMessagesRead,
  listSurgeryTimeline,
} from "./db";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";
import {
  createDailyActivityReport,
  createWeeklyVisitPlan,
  getDailyActivityReportById,
  getWeeklyVisitPlanById,
  listAllDailyActivityReports,
  listAllWeeklyVisitPlans,
  listDailyActivityReportsForDelegate,
  listDailyActivityReportsForAuthor,
  listDailyActivityReportsForManager,
  listWeeklyVisitPlansForDelegate,
  listWeeklyVisitPlansForAuthor,
  listWeeklyVisitPlansForManager,
  updateDailyActivityReport,
  updateWeeklyVisitPlan,
} from "./db";
import { createGoogleDriveBackupArchive } from "./googleDriveBackup";
import { getGoogleDriveBackupConnection, listBackupArchives } from "./db";
import { getDb } from "./db";
import {
  warehouseDeliveryProofs,
  surgeryDeliveryProofs,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  calculateSurgeryImplantTotals,
  createSurgeryDeliveryProof,
  createSurgeryImplant,
  createImplantCatalogueItem,
  getImplantCatalogueItem,
  listImplantCatalogue,
  listSurgeryDeliveryProofs,
  listSurgeryImplants,
  searchImplantCatalogue,
} from "./db";
import {
  createTravelExpenseClaim,
  getTravelExpenseClaimById,
  listTravelExpenseClaims,
  updateTravelExpenseClaim,
} from "./db";
import {
  dailyReportValidationError,
  parseWeeklySchedule,
  weeklyPlanValidationError,
} from "../shared/workLogRules";
import { overdueWorkLogSummary } from "../shared/workLogOverdue";
import { claimsWithinTravelExpenseRange, travelExpenseDateRangeError, travelExpenseDepartmentCurrencySummary, travelExpenseRollingMonthlyTrend } from "../shared/travelExpenseAnalytics";

const ADMIN_EMAIL = "dr.seleam@gmail.com";
const OPERATIONAL_MANAGER_EMAIL = "amreslam@altamammed.com";
const SUPER_MANAGER_EMAILS = new Set([
  "m.selim@altamammed.com",
  "amreslam@altamammed.com",
  "waleedelshamy@altamammed.com",
  "drislamtawfik@gmail.com",
]);
const WAREHOUSE_HERO_LEAD_EMAIL = "osamaahmed@altamammed.com";
const isWarehouseHeroLead = (user: { email?: string | null; role?: string }) => user.role === "manager" && user.email?.trim().toLowerCase() === WAREHOUSE_HERO_LEAD_EMAIL;
const isAdmin = (user: { email?: string | null; role?: string }) =>
  user.email?.toLowerCase() === ADMIN_EMAIL || user.role === "admin";
const isSuperManager = (user: { email?: string | null }) =>
  Boolean(user.email && SUPER_MANAGER_EMAILS.has(user.email.trim().toLowerCase()));
const canManage = (user: { email?: string | null; role?: string }) =>
  isAdmin(user) || user.role === "manager";
const adminOnly = protectedProcedure.use(({ ctx, next }) => {
  if (!isAdmin(ctx.user))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administrator access required",
    });
  return next({ ctx });
});
const managerOnly = protectedProcedure.use(({ ctx, next }) => {
  if (!canManage(ctx.user))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Manager access required",
    });
  return next({ ctx });
});
const delegateOrManagerOnly = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "delegate" && ctx.user.role !== "manager")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Delegate or Manager access required",
    });
  return next({ ctx });
});
const fieldUserOnly = protectedProcedure.use(({ ctx, next }) => {
  if (
    !isAdmin(ctx.user) &&
    ctx.user.role !== "manager" &&
    ctx.user.role !== "delegate"
  )
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Field operations access required",
    });
  return next({ ctx });
});
const delegateOnly = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "delegate")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Delegate access required",
    });
  return next({ ctx });
});
const warehouseHeroOnly = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "warehouse_hero")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Warehouse Hero access required",
    });
  return next({ ctx });
});
const canOperateTask = async (
  user: { id: number; role: string; email?: string | null },
  task: { delegateId: number }
) =>
  isAdmin(user) ||
  (user.role === "delegate" && user.id === task.delegateId) ||
  (user.role === "manager" &&
    (await listDelegateIdsForManager(user.id)).includes(task.delegateId));
const canAccessSurgery = async (
  user: { id: number; role: string; email?: string | null },
  surgery: { delegateId: number }
) =>
  isAdmin(user) ||
  (user.role === "delegate" && surgery.delegateId === user.id) ||
  (user.role === "manager" &&
    (await listDelegateIdsForManager(user.id)).includes(surgery.delegateId));
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const deliveryProofDateRangeSchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine(input => !input.from || !input.to || input.from <= input.to, {
    message: "The proof end date must not be earlier than the start date",
  });
const reportActivityStatusSchema = z.enum(["pending", "approved", "rejected", "submitted", "reviewed", "manager_recorded"]);
const superManagerActivityFilterFields = z.object({
  activityFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityStatus: reportActivityStatusSchema.optional(),
});
const superManagerActivityFilters = superManagerActivityFilterFields.refine(input => !input.activityFrom || !input.activityTo || input.activityFrom <= input.activityTo, { message: "The activity end date must not be earlier than the start date." });
const superManagerRosterExportFilters = z.object({
  activityFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityStatus: reportActivityStatusSchema.optional(),
  query: z.string().trim().max(160).optional(),
  role: z.enum(["manager", "delegate", "warehouse_hero"]).optional(),
  department: z.string().trim().max(160).optional(),
}).refine(input => !input.activityFrom || !input.activityTo || input.activityFrom <= input.activityTo, { message: "The activity end date must not be earlier than the start date." });
const superManagerFilterPresetInput = z.object({
  name: z.string().trim().min(2).max(80),
  query: z.string().trim().max(160).optional(),
  role: z.enum(["manager", "delegate", "warehouse_hero"]).optional(),
  department: z.string().trim().max(160).optional(),
  activityFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityStatus: reportActivityStatusSchema.optional(),
  isShared: z.boolean().optional(),
}).refine(input => !input.activityFrom || !input.activityTo || input.activityFrom <= input.activityTo, { message: "The activity end date must not be earlier than the start date." });
const departmentDateRangeFilters = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(input => !input.from || !input.to || input.from <= input.to, { message: "The end date must not be earlier than the start date." }).refine(input => !input.from || !input.to || new Date(`${input.to}T00:00:00.000Z`).getTime() - new Date(`${input.from}T00:00:00.000Z`).getTime() <= 366 * 24 * 60 * 60 * 1000, { message: "Select a date range of one year or less." });
const departmentSummaryMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a valid report month.");
const departmentReportCommentarySchema = z.string().trim().max(2000, "Keep commentary to 2,000 characters or fewer.").optional().transform(value => value || null);
const departmentSummaryMonthRange = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
};
const departmentName = (value: string) => value.trim().replace(/\s+/g, " ");
const departmentHierarchyHasCycle = (rows: Array<{ id: number; parentDepartmentId: number | null }>, id: number, parentDepartmentId: number | null) => {
  const byId = new globalThis.Map(rows.map(row => [row.id, row]));
  let current = parentDepartmentId;
  while (current != null) {
    if (current === id) return true;
    current = byId.get(current)?.parentDepartmentId ?? null;
  }
  return false;
};
const safeCsvCell = (value: unknown) => {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};
async function buildSuperManagerRoster(input: z.infer<typeof superManagerActivityFilters> = {}) {
  const [managers, delegates, warehouseHeroes, assignments, weeklyPlans, dailyReports] = await Promise.all([
    listManagers(), listDelegates(), listWarehouseHeroes(), listManagerAssignments(), listAllWeeklyVisitPlans(), listAllDailyActivityReports(),
  ]);
  const from = input.activityFrom ? new Date(`${input.activityFrom}T00:00:00.000Z`).getTime() : Number.NEGATIVE_INFINITY;
  const to = input.activityTo ? new Date(`${input.activityTo}T23:59:59.999Z`).getTime() : Number.POSITIVE_INFINITY;
  const recentActivity = [
    ...weeklyPlans.map(record => ({ id: `weekly-${record.id}`, type: "weekly_plan" as const, authorName: record.authorName, authorEmail: record.authorEmail, status: record.status, submittedAt: record.createdAt })),
    ...dailyReports.map(record => ({ id: `daily-${record.id}`, type: "daily_report" as const, authorName: record.authorName, authorEmail: record.authorEmail, status: record.status, submittedAt: record.createdAt })),
  ].filter(record => {
    const submittedAt = new Date(record.submittedAt).getTime();
    return submittedAt >= from && submittedAt <= to && (!input.activityStatus || record.status === input.activityStatus);
  }).sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()).slice(0, 20);
  return { managers, delegates, warehouseHeroes, assignments, recentActivity };
}
const isExpectedInvitationProbe = (input: {
  message: string;
  route?: string;
}) =>
  input.route?.startsWith("/invite/") === true &&
  /invitation is invalid or expired/i.test(input.message);
const workLogVisitInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
});
const workLogPlanDayInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visits: z.array(workLogVisitInput).min(3).max(100),
});
const travelExpenseLineInput = z.object({
  category: z.enum([
    "hotel",
    "car_taxi",
    "fuel_invoice",
    "maintenance",
    "food",
    "air_ticket",
    "others",
  ]),
  description: z.string().trim().max(240).optional(),
  days: z.number().int().min(1).max(365).optional(),
  amountPerDay: z.number().min(0).max(1_000_000),
  remarks: z.string().trim().max(3000).optional(),
  distanceKm: z.number().int().min(0).max(1_000_000).optional(),
});
const travelTripSegmentInput = z.object({
  from: z.string().trim().min(2).max(180),
  to: z.string().trim().min(2).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transportation: z.enum(["car", "plane", "car_and_plane", "other"]),
  time: z.string().trim().max(40).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (ctx.authTimedOut)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Session verification timed out. Please sign in again.",
        });
      return ctx.user;
    }),
    updateDisplayName: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(120), department: z.string().trim().max(160).optional() }))
      .mutation(async ({ input, ctx }) => {
        const result = await updateUserDisplayName(ctx.user.id, input.name, input.department || null);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "profile.identity_updated",
          entityType: "user",
          entityId: ctx.user.id,
          metadata: JSON.stringify({ name: input.name, department: input.department || null }),
        });
        return result;
      }),
    updateDefaultLanguage: protectedProcedure
      .input(z.object({ language: z.enum(["en", "ar"]) }))
      .mutation(async ({ input, ctx }) => {
        const result = await updateUserDefaultLanguage(ctx.user.id, input.language);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "profile.language_updated",
          entityType: "user",
          entityId: ctx.user.id,
          metadata: JSON.stringify({ language: input.language }),
        });
        return { defaultLanguage: result?.defaultLanguage ?? input.language };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(FFM_MAGIC_SESSION_COOKIE, {
        ...cookieOptions,
        maxAge: -1,
      });
      return { success: true } as const;
    }),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) =>
      listUserNotifications(ctx.user.id)
    ),
    markAllRead: protectedProcedure.mutation(({ ctx }) =>
      markAllNotificationsRead(ctx.user.id)
    ),
    markRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input, ctx }) =>
        markNotificationRead(ctx.user.id, input.id)
      ),
  }),
  invitations: router({
    preview: publicProcedure
      .input(z.object({ token: z.string().min(20) }))
      .query(async ({ input }) => {
        const invitation = await getInvitationByHash(tokenHash(input.token));
        if (
          !invitation ||
          invitation.acceptedAt ||
          invitation.expiresAt < new Date()
        )
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation is invalid or expired",
          });
        return {
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        };
      }),
    accept: protectedProcedure
      .input(z.object({ token: z.string().min(20) }))
      .mutation(async ({ input, ctx }) => {
        const invitation = await getInvitationByHash(tokenHash(input.token));
        if (
          !invitation ||
          invitation.acceptedAt ||
          invitation.expiresAt < new Date()
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitation is invalid or expired",
          });
        if (ctx.user.email?.toLowerCase() !== invitation.email.toLowerCase())
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This invitation belongs to a different email address",
          });
        await upsertUser({
          openId: ctx.user.openId,
          email: ctx.user.email,
          name: ctx.user.name,
          role: invitation.role,
          loginMethod: ctx.user.loginMethod,
        });
        await acceptInvitation(invitation.id);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "invitation.accepted",
          entityType: "invitation",
          entityId: invitation.id,
        });
        return { success: true, role: invitation.role } as const;
      }),
    acceptMagic: publicProcedure
      .input(z.object({ token: z.string().min(20) }))
      .mutation(async ({ input, ctx }) => {
        const invitation = await getInvitationByHash(tokenHash(input.token));
        if (
          !invitation ||
          invitation.acceptedAt ||
          invitation.expiresAt < new Date()
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitation is invalid or expired",
          });
        const invitedUser = await activateInvitedUser({
          email: invitation.email,
          role: invitation.role,
        });
        if (!invitedUser)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to activate invitation",
          });
        await acceptInvitation(invitation.id);
        if (invitation.role === "warehouse_hero") {
          const warehouseHeroLead = (await listUsers()).find(user => user.email?.trim().toLowerCase() === WAREHOUSE_HERO_LEAD_EMAIL && user.role === "manager");
          if (warehouseHeroLead && !await isWarehouseHeroAssignedToManager(warehouseHeroLead.id, invitedUser.id)) {
            await createManagerWarehouseHeroAssignment({ managerId: warehouseHeroLead.id, warehouseHeroId: invitedUser.id, assignedBy: warehouseHeroLead.id });
            await addAuditEvent({ actorId: invitedUser.id, action: "warehouse_hero.default_lead_assigned", entityType: "user", entityId: invitedUser.id, metadata: JSON.stringify({ managerId: warehouseHeroLead.id, managerEmail: WAREHOUSE_HERO_LEAD_EMAIL, invitationId: invitation.id }) });
          }
        }
        await addAuditEvent({
          actorId: invitedUser.id,
          action: "invitation.accepted_magic_link",
          entityType: "invitation",
          entityId: invitation.id,
        });
        const sessionToken = await sdk.createSessionToken(invitedUser.openId, {
          expiresInMs: 1000 * 60 * 60 * 12,
          name: invitedUser.name || invitedUser.email || invitation.email,
        });
        ctx.res.cookie(FFM_MAGIC_SESSION_COOKIE, sessionToken, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 60 * 12,
        });
        return { success: true, role: invitation.role } as const;
      }),
  }),
  delegatePlanning: router({
    weeklyPlans: fieldUserOnly.query(({ ctx }) =>
      ctx.user.role === "delegate"
        ? listWeeklyVisitPlansForDelegate(ctx.user.id)
        : isAdmin(ctx.user)
          ? listAllWeeklyVisitPlans()
        : listWeeklyVisitPlansForManager(ctx.user.id)
    ),
    dailyReports: fieldUserOnly.query(({ ctx }) =>
      ctx.user.role === "delegate"
        ? listDailyActivityReportsForDelegate(ctx.user.id)
        : isAdmin(ctx.user)
          ? listAllDailyActivityReports()
        : listDailyActivityReportsForManager(ctx.user.id)
    ),
    overdueSummary: managerOnly.query(async ({ ctx }) => {
      const allAccess = isAdmin(ctx.user);
      const [delegates, weeklyPlans, dailyReports] = await Promise.all([
        allAccess ? listDelegates() : listDelegatesForManager(ctx.user.id),
        allAccess ? listAllWeeklyVisitPlans() : listWeeklyVisitPlansForManager(ctx.user.id),
        allAccess ? listAllDailyActivityReports() : listDailyActivityReportsForManager(ctx.user.id),
      ]);
      return overdueWorkLogSummary({ delegates, weeklyPlans, dailyReports });
    }),
    overdueEmailDraft: managerOnly
      .input(z.object({ delegateId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const allAccess = isAdmin(ctx.user);
        const [delegates, weeklyPlans, dailyReports, assignments] = await Promise.all([
          allAccess ? listDelegates() : listDelegatesForManager(ctx.user.id),
          allAccess ? listAllWeeklyVisitPlans() : listWeeklyVisitPlansForManager(ctx.user.id),
          allAccess ? listAllDailyActivityReports() : listDailyActivityReportsForManager(ctx.user.id),
          allAccess ? listManagerAssignments() : Promise.resolve([]),
        ]);
        const overdue = overdueWorkLogSummary({ delegates, weeklyPlans, dailyReports }).overdueDelegates.find(item => item.delegateId === input.delegateId);
        if (!overdue) throw new TRPCError({ code: "NOT_FOUND", message: "This Delegate has no overdue Work Log item in your permitted scope." });
        const assignedManager = allAccess ? assignments.find(assignment => assignment.delegateId === input.delegateId) : undefined;
        const recipientEmail = allAccess ? assignedManager?.managerEmail : ctx.user.email;
        if (!recipientEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "No Manager email is available for this selected Delegate." });
        const subject = `FFM overdue Work Log reminder — ${overdue.delegateName}`;
        const overdueText = `${overdue.missingWeeklyPlan ? "Weekly plan is missing." : "Weekly plan is submitted."}${overdue.overdueDailyDates.length ? ` Overdue daily reports: ${overdue.overdueDailyDates.join(", ")}.` : ""}`;
        const body = `Hello,\n\nFFM Work Log requires attention for ${overdue.delegateName}${overdue.delegateEmail ? ` (${overdue.delegateEmail})` : ""}.\n\n${overdueText}\n\nPlease review the Delegate's Work Log and follow up as needed.\n\nFFM Manager`;
        await addAuditEvent({ actorId: ctx.user.id, action: "work_log.overdue_email_composed", entityType: "user", entityId: input.delegateId, metadata: JSON.stringify({ delegateId: input.delegateId, recipientEmail }) });
        return { recipientEmail, subject, body };
      }),
    submitWeeklyPlan: fieldUserOnly
      .input(
        z.object({
          weekOf: z.date(),
          objectives: z.string().trim().min(3).max(5000),
          plannedVisits: z.string().trim().min(10).max(30000),
          schedule: z.array(workLogPlanDayInput).length(6),
          supportNeeded: z.string().trim().max(3000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const validationError = weeklyPlanValidationError(
          input.schedule,
          input.weekOf
        );
        if (validationError)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validationError,
          });
        const visits = input.schedule.flatMap(day => day.visits);
        const [allClients, allDoctors] = await Promise.all([
          listClients(),
          listDoctors(),
        ]);
        const clientsById = new Map(
          allClients.map(client => [client.id, client])
        );
        const doctorsById = new Map(
          allDoctors.map(doctor => [doctor.id, doctor])
        );
        for (const visit of visits) {
          const client = clientsById.get(visit.clientId);
          const doctor = doctorsById.get(visit.doctorId);
          if (!client || !doctor || doctor.clientId !== client.id)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Choose doctors registered under their selected hospitals",
            });
        }
        const first = visits[0]!;
        const managerRecord = ctx.user.role !== "delegate";
        const result = await createWeeklyVisitPlan({
          authorId: ctx.user.id,
          delegateId: managerRecord ? null : ctx.user.id,
          clientId: first.clientId,
          doctorId: first.doctorId,
          weekOf: input.weekOf,
          objectives: input.objectives,
          plannedVisits: input.plannedVisits,
          scheduleJson: JSON.stringify(input.schedule),
          supportNeeded: input.supportNeeded || null,
          status: managerRecord ? "manager_recorded" : "pending",
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: managerRecord
            ? "weekly_visit_plan.manager_recorded"
            : "weekly_visit_plan.submitted",
          entityType: "weeklyVisitPlan",
          entityId: result?.id,
          metadata: JSON.stringify({
            days: input.schedule.length,
            hospitalsPerDay: input.schedule.map(day => day.visits.length),
          }),
        });
        return result;
      }),
    reviewWeeklyPlan: managerOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["approved", "rejected"]),
          reviewNote: z.string().trim().max(3000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getWeeklyVisitPlanById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Weekly visit plan not found",
          });
        if (existing.delegateId == null || existing.authorId === ctx.user.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Manager-authored weekly plans do not require Manager review.",
          });
        const allowed = await listDelegateIdsForManager(ctx.user.id);
        if (
          !canManagerAccessDelegate(
            ctx.user.role,
            ctx.user.id,
            existing.delegateId,
            allowed
          )
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This weekly plan is outside the Manager assignment scope",
          });
        const result = await updateWeeklyVisitPlan(input.id, {
          status: input.status,
          reviewNote: input.reviewNote || null,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "weekly_visit_plan.reviewed",
          entityType: "weeklyVisitPlan",
          entityId: input.id,
          metadata: JSON.stringify({ status: input.status }),
        });
        return result;
      }),
    submitDailyReport: fieldUserOnly
      .input(
        z.object({
          reportDate: z.date(),
          visits: z.array(workLogVisitInput).min(3).max(100),
          summary: z.string().trim().min(3).max(5000),
          outcomes: z.string().trim().min(3).max(5000),
          challenges: z.string().trim().max(3000).optional(),
          nextActions: z.string().trim().max(3000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const submittedPlans = await listWeeklyVisitPlansForAuthor(
          ctx.user.id
        );
        const plannedHospitalIds = submittedPlans
          .filter(plan => plan.status !== "rejected")
          .flatMap(plan =>
            parseWeeklySchedule(plan.scheduleJson)
              .filter(
                day => day.date === input.reportDate.toISOString().slice(0, 10)
              )
              .flatMap(day => day.visits.map(visit => visit.clientId))
          );
        const validationError = dailyReportValidationError(
          input.visits,
          input.reportDate,
          plannedHospitalIds
        );
        if (validationError)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validationError,
          });
        const [allClients, allDoctors] = await Promise.all([
          listClients(),
          listDoctors(),
        ]);
        const clientsById = new Map(
          allClients.map(client => [client.id, client])
        );
        const doctorsById = new Map(
          allDoctors.map(doctor => [doctor.id, doctor])
        );
        for (const visit of input.visits) {
          const client = clientsById.get(visit.clientId);
          const doctor = doctorsById.get(visit.doctorId);
          if (!client || !doctor || doctor.clientId !== client.id)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Choose doctors registered under their selected hospitals",
            });
        }
        const first = input.visits[0]!;
        const managerRecord = ctx.user.role !== "delegate";
        const visitText = input.visits
          .map(
            visit =>
              `${visit.date} — ${clientsById.get(visit.clientId)?.name || "Hospital"} — ${doctorsById.get(visit.doctorId)?.name || "Doctor"}`
          )
          .join("\n");
        const result = await createDailyActivityReport({
          authorId: ctx.user.id,
          delegateId: managerRecord ? null : ctx.user.id,
          clientId: first.clientId,
          doctorId: first.doctorId,
          reportDate: input.reportDate,
          summary: `Doctor visits:\n${visitText}\n\nActivity summary:\n${input.summary}`,
          outcomes: input.outcomes,
          challenges: input.challenges || null,
          nextActions: input.nextActions || null,
          status: managerRecord ? "manager_recorded" : "submitted",
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: managerRecord
            ? "daily_activity_report.manager_recorded"
            : "daily_activity_report.submitted",
          entityType: "dailyActivityReport",
          entityId: result?.id,
          metadata: JSON.stringify({
            doctorVisits: input.visits.length,
            plannedHospitalIds: Array.from(new Set(plannedHospitalIds)),
          }),
        });
        return result;
      }),
    reviewDailyReport: managerOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          managerNote: z.string().trim().max(3000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getDailyActivityReportById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Daily activity report not found",
          });
        if (existing.delegateId == null || existing.authorId === ctx.user.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Manager-authored daily reports do not require Manager review.",
          });
        const allowed = await listDelegateIdsForManager(ctx.user.id);
        if (
          !canManagerAccessDelegate(
            ctx.user.role,
            ctx.user.id,
            existing.delegateId,
            allowed
          )
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "This daily report is outside the Manager assignment scope",
          });
        const result = await updateDailyActivityReport(input.id, {
          status: "reviewed",
          managerNote: input.managerNote || null,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "daily_activity_report.reviewed",
          entityType: "dailyActivityReport",
          entityId: input.id,
        });
        return result;
      }),
  }),
  travelExpenses: router({
    claims: protectedProcedure.query(async ({ ctx }) => {
      const claims = await listTravelExpenseClaims();
      const isOperationalManager =
        ctx.user.email?.trim().toLowerCase() === OPERATIONAL_MANAGER_EMAIL;
      if (isAdmin(ctx.user) || isOperationalManager) return claims;
      if (canManage(ctx.user))
        return claims.filter(
          claim =>
            claim.claimantId === ctx.user.id ||
            claim.managerApproverId === ctx.user.id
        );
      return claims.filter(claim => claim.claimantId === ctx.user.id);
    }),
    dashboardSummary: managerOnly.query(async ({ ctx }) => {
      const month = new Date().toISOString().slice(0, 7);
      const [year, monthNumber] = month.split("-").map(Number);
      const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
      const claims = await listTravelExpenseClaims();
      const isOperationalManager = ctx.user.email?.trim().toLowerCase() === OPERATIONAL_MANAGER_EMAIL;
      const scopedClaims = isAdmin(ctx.user) || isOperationalManager ? claims : claims.filter(claim => claim.claimantId === ctx.user.id || claim.managerApproverId === ctx.user.id);
      return { month, rows: travelExpenseDepartmentCurrencySummary(claimsWithinTravelExpenseRange(scopedClaims, `${month}-01`, monthEnd)), trend: travelExpenseRollingMonthlyTrend(scopedClaims) };
    }),
    accountingExport: protectedProcedure
      .input(z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), department: z.string().trim().max(160).optional() }))
      .query(async ({ ctx, input }) => {
        const isOperationalManager = ctx.user.email?.trim().toLowerCase() === OPERATIONAL_MANAGER_EMAIL;
        if (!isAdmin(ctx.user) && !isOperationalManager) throw new TRPCError({ code: "FORBIDDEN", message: "Travel Expense accounting export is restricted to Finance administration." });
        const dateError = travelExpenseDateRangeError(input.from, input.to);
        if (dateError) throw new TRPCError({ code: "BAD_REQUEST", message: dateError });
        const normalizedDepartment = input.department?.trim().toLowerCase();
        const rangedClaims = claimsWithinTravelExpenseRange(await listTravelExpenseClaims(), input.from, input.to);
        const claims = normalizedDepartment ? rangedClaims.filter(claim => claim.department?.trim().toLowerCase() === normalizedDepartment) : rangedClaims;
        await addAuditEvent({ actorId: ctx.user.id, action: "travel_expense.range_exported", entityType: "travelExpenseClaim", metadata: JSON.stringify({ from: input.from, to: input.to, department: input.department || null, claimCount: claims.length }) });
        return claims;
      }),
    monthlyAccountingExport: protectedProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ ctx, input }) => {
        const isOperationalManager = ctx.user.email?.trim().toLowerCase() === OPERATIONAL_MANAGER_EMAIL;
        if (!isAdmin(ctx.user) && !isOperationalManager)
          throw new TRPCError({ code: "FORBIDDEN", message: "Monthly Travel Expense accounting export is restricted to Finance administration." });
        const [year, month] = input.month.split("-").map(Number);
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));
        const claims = (await listTravelExpenseClaims()).filter(claim => {
          const date = new Date(claim.claimDate);
          return date >= start && date < end;
        });
        await addAuditEvent({ actorId: ctx.user.id, action: "travel_expense.monthly_exported", entityType: "travelExpenseClaim", metadata: JSON.stringify({ month: input.month, claimCount: claims.length }) });
        return claims;
      }),
    managerApprovers: protectedProcedure.query(async ({ ctx }) => {
      const people = await listUsers();
      const managers = people.filter(
        user =>
          user.id !== ctx.user.id &&
          (user.role === "manager" || user.role === "admin")
      );
      const operationalManager = people.find(
        user => user.email?.trim().toLowerCase() === OPERATIONAL_MANAGER_EMAIL
      );
      const claimantIsOperationalManager =
        ctx.user.email?.trim().toLowerCase() === OPERATIONAL_MANAGER_EMAIL;
      if (ctx.user.role !== "delegate") {
        if (claimantIsOperationalManager)
          return managers.filter(manager => manager.role === "admin");
        return operationalManager ? [operationalManager] : [];
      }
      const assigned = await Promise.all(
        managers.map(async manager => ({
          manager,
          assigned: await isDelegateAssignedToManager(manager.id, ctx.user.id),
        }))
      );
      return assigned.filter(item => item.assigned).map(item => item.manager);
    }),
    submit: protectedProcedure
      .input(
        z.object({
          managerApproverId: z.number().int().positive(),
          claimDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          department: z.string().trim().max(160).optional(),
          jobNature: z.string().trim().max(240).optional(),
          transportMode: z.enum(["car", "plane", "car_and_plane", "other"]),
          ticketReference: z.string().trim().max(160).optional(),
          estimatedDays: z.number().int().min(1).max(365).optional(),
          tripSegments: z.array(travelTripSegmentInput).min(1).max(50),
          jobReport: z.string().trim().min(3).max(10000),
          currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
          lines: z.array(travelExpenseLineInput).min(1).max(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const people = await listUsers();
        const designatedOperationalManager = people.find(
          user => user.email?.trim().toLowerCase() === OPERATIONAL_MANAGER_EMAIL
        );
        const claimantIsOperationalManager =
          ctx.user.email?.trim().toLowerCase() === OPERATIONAL_MANAGER_EMAIL;
        const independentAdministrator = people.find(
          user =>
            user.email?.trim().toLowerCase() === ADMIN_EMAIL &&
            user.id !== ctx.user.id &&
            user.role === "admin"
        );
        if (
          !designatedOperationalManager ||
          designatedOperationalManager.role !== "manager"
        )
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The designated Operational Manager account is unavailable.",
          });
        const operationalApprover = claimantIsOperationalManager
          ? independentAdministrator
          : designatedOperationalManager;
        let managerApprover = await getUserById(input.managerApproverId);
        if (ctx.user.role !== "delegate")
          managerApprover = claimantIsOperationalManager
            ? independentAdministrator
            : designatedOperationalManager;
        if (
          !managerApprover ||
          (managerApprover.role !== "manager" && managerApprover.role !== "admin")
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Select an active FFM Manager as the Manager approver.",
          });
        if (
          !operationalApprover ||
          (operationalApprover.role !== "manager" &&
            operationalApprover.role !== "admin")
        )
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "An independent Administrator review is required before the Operational Manager can submit a claim.",
          });
        if (managerApprover.id === ctx.user.id || operationalApprover.id === ctx.user.id)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A claimant cannot approve their own travel expense.",
          });
        if (ctx.user.role === "delegate") {
          const assigned = await isDelegateAssignedToManager(
            managerApprover.id,
            ctx.user.id
          );
          if (!assigned)
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Delegate claims must be sent to the claimant's assigned Manager.",
            });
        }
        const claim = await createTravelExpenseClaim({
          claim: {
            claimantId: ctx.user.id,
            managerApproverId: managerApprover.id,
            operationalApproverId: operationalApprover.id,
            claimDate: new Date(`${input.claimDate}T00:00:00.000Z`),
            department: input.department || null,
            jobNature: input.jobNature || null,
            transportMode: input.transportMode,
            ticketReference: input.ticketReference || null,
            estimatedDays: input.estimatedDays ?? null,
            tripSegmentsJson: JSON.stringify(input.tripSegments),
            jobReport: input.jobReport,
            currency: input.currency,
          },
          lines: input.lines,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "travel_expense.submitted",
          entityType: "travelExpenseClaim",
          entityId: claim?.id,
          metadata: JSON.stringify({
            managerApproverId: managerApprover.id,
            operationalApproverId: operationalApprover.id,
            totalAmount: claim?.totalAmount,
            currency: input.currency,
          }),
        });
        return claim;
      }),
    approveManager: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (!canManage(ctx.user))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Manager approval access required.",
          });
        const claim = await getTravelExpenseClaimById(input.id);
        if (!claim)
          throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found." });
        if (claim.claimantId === ctx.user.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "A claimant cannot approve their own travel expense.",
          });
        if (claim.managerApproverId !== ctx.user.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This claim is not assigned to you for Manager approval.",
          });
        if (claim.managerApprovedAt)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Manager approval has already been recorded.",
          });
        const accepted = Boolean(claim.operationalApprovedAt);
        const result = await updateTravelExpenseClaim(input.id, {
          managerApprovedAt: new Date(),
          status: accepted ? "accepted" : "pending",
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "travel_expense.manager_approved",
          entityType: "travelExpenseClaim",
          entityId: input.id,
        });
        if (accepted)
          await addAuditEvent({
            actorId: ctx.user.id,
            action: "travel_expense.accepted",
            entityType: "travelExpenseClaim",
            entityId: input.id,
          });
        return result;
      }),
    approveOperational: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const claim = await getTravelExpenseClaimById(input.id);
        if (!claim)
          throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found." });
        const isDesignatedOperationalManager =
          ctx.user.email?.trim().toLowerCase() === OPERATIONAL_MANAGER_EMAIL;
        const isIndependentOperationalFallback =
          isAdmin(ctx.user) && claim.operationalApproverId === ctx.user.id;
        if (!isDesignatedOperationalManager && !isIndependentOperationalFallback)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the designated Operational Manager can record this approval.",
          });
        if (claim.claimantId === ctx.user.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "A claimant cannot approve their own travel expense.",
          });
        if (claim.operationalApproverId !== ctx.user.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This claim is not assigned to you for operational approval.",
          });
        if (claim.operationalApprovedAt)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Operational approval has already been recorded.",
          });
        const accepted = Boolean(claim.managerApprovedAt);
        const result = await updateTravelExpenseClaim(input.id, {
          operationalApprovedAt: new Date(),
          status: accepted ? "accepted" : "pending",
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "travel_expense.operational_approved",
          entityType: "travelExpenseClaim",
          entityId: input.id,
        });
        if (accepted)
          await addAuditEvent({
            actorId: ctx.user.id,
            action: "travel_expense.accepted",
            entityType: "travelExpenseClaim",
            entityId: input.id,
          });
        return result;
      }),
    release: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.email?.trim().toLowerCase() !== OPERATIONAL_MANAGER_EMAIL)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the designated Operational Manager can release a claim.",
          });
        const claim = await getTravelExpenseClaimById(input.id);
        if (!claim)
          throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found." });
        if (claim.claimantId === ctx.user.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "A claimant cannot release their own travel expense.",
          });
        if (claim.operationalApproverId !== ctx.user.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This claim is not assigned to you for release.",
          });
        if (claim.status !== "accepted" || !claim.managerApprovedAt || !claim.operationalApprovedAt)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Both approvals are required before the amount can be released.",
          });
        if (claim.releasedAt)
          throw new TRPCError({
            code: "CONFLICT",
            message: "This claim has already been released.",
          });
        const releasedAt = new Date();
        const result = await updateTravelExpenseClaim(input.id, {
          status: "released",
          releasedAt,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "travel_expense.released",
          entityType: "travelExpenseClaim",
          entityId: input.id,
          metadata: JSON.stringify({ releasedAt: releasedAt.toISOString() }),
        });
        return result;
      }),
  }),
  admin: router({
    users: adminOnly.query(async () => listUsers()),
    invitations: adminOnly.query(async () => listInvitations()),
    managers: adminOnly.query(async () => listManagers()),
    delegates: adminOnly.query(async () => listDelegates()),
    warehouseHeroes: adminOnly.query(async () => listWarehouseHeroes()),
    departments: adminOnly.query(async () => listDepartments()),
    departmentDashboardTotals: adminOnly.input(departmentDateRangeFilters.optional()).query(async ({ input }) => getDepartmentDashboardTotals(input ?? {})),
    departmentMonthlySummary: adminOnly.input(z.object({ month: departmentSummaryMonthSchema })).mutation(async ({ ctx, input }) => {
      const range = departmentSummaryMonthRange(input.month);
      const totals = await getDepartmentDashboardTotals(range);
      await addAuditEvent({ actorId: ctx.user.id, action: "department.monthly_summary_generated", entityType: "department", metadata: JSON.stringify({ month: input.month, ...range, departmentCount: totals.length }) });
      return { month: input.month, ...range, generatedAt: new Date(), totals };
    }),
    createMonthlyDepartmentReportShare: adminOnly.input(z.object({ month: departmentSummaryMonthSchema, commentary: departmentReportCommentarySchema })).mutation(async ({ ctx, input }) => {
      const range = departmentSummaryMonthRange(input.month);
      const generatedAt = new Date();
      const totals = await getDepartmentDashboardTotals(range);
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(generatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const reportPayload = JSON.stringify({ month: input.month, ...range, generatedAt, totals });
      await createMonthlyDepartmentReportShare({ tokenHash, createdBy: ctx.user.id, month: input.month, commentary: input.commentary, reportPayload, expiresAt });
      await addAuditEvent({ actorId: ctx.user.id, action: "department.monthly_report_shared", entityType: "department", metadata: JSON.stringify({ month: input.month, ...range, departmentCount: totals.length, expiresAt: expiresAt.toISOString() }) });
      return { token, expiresAt };
    }),
    resolveMonthlyDepartmentReportShare: adminOnly.input(z.object({ token: z.string().min(32).max(128) })).query(async ({ ctx, input }) => {
      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const share = await getActiveMonthlyDepartmentReportShare(tokenHash);
      if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "This report link is invalid or has expired." });
      const report = JSON.parse(share.reportPayload) as { month: string; from: string; to: string; generatedAt: Date | string; totals: Awaited<ReturnType<typeof getDepartmentDashboardTotals>> };
      await addAuditEvent({ actorId: ctx.user.id, action: "department.monthly_report_share_accessed", entityType: "department", metadata: JSON.stringify({ shareId: share.id, month: share.month }) });
      return { ...report, commentary: share.commentary, expiresAt: share.expiresAt };
    }),
    monthlyDepartmentReportShares: adminOnly.query(async () => listMonthlyDepartmentReportShares()),
    revokeMonthlyDepartmentReportShare: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const result = await revokeMonthlyDepartmentReportShare(input.id);
      if (!result.deleted) throw new TRPCError({ code: "NOT_FOUND", message: "This report link has already been revoked or does not exist." });
      await addAuditEvent({ actorId: ctx.user.id, action: "department.monthly_report_share_revoked", entityType: "department", entityId: input.id, metadata: JSON.stringify({ shareId: input.id }) });
      return { success: true } as const;
    }),
    updateMonthlyDepartmentReportShareExpiry: adminOnly.input(z.object({ id: z.number().int().positive(), expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).mutation(async ({ ctx, input }) => {
      const expiresAt = new Date(`${input.expiresOn}T23:59:59.999Z`);
      const maximum = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now() || expiresAt > maximum) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a future expiry date within the next 90 days." });
      const share = await updateMonthlyDepartmentReportShareExpiry(input.id, expiresAt);
      if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "Only active report links can have their expiry updated." });
      await addAuditEvent({ actorId: ctx.user.id, action: "department.monthly_report_share_expiry_updated", entityType: "department", entityId: input.id, metadata: JSON.stringify({ shareId: input.id, expiresAt: expiresAt.toISOString() }) });
      return { id: share.id, expiresAt: share.expiresAt };
    }),
    departmentAuditEvents: adminOnly.input(departmentDateRangeFilters.optional()).query(async ({ input }) => listDepartmentAuditEvents(input ?? {})),
    departmentAuditExport: adminOnly.input(departmentDateRangeFilters.optional()).mutation(async ({ ctx, input }) => {
      const filters = input ?? {};
      const events = await listDepartmentAuditEvents(filters);
      const header = ["Timestamp", "Actor", "Actor email", "Action", "Entity type", "Entity ID", "Metadata"];
      const csv = [header.map(safeCsvCell).join(","), ...events.map(event => [event.createdAt.toISOString(), event.actorName, event.actorEmail || "", event.action, event.entityType || "", event.entityId || "", event.metadata || ""].map(safeCsvCell).join(","))].join("\n");
      await addAuditEvent({ actorId: ctx.user.id, action: "department.audit_exported", entityType: "department", metadata: JSON.stringify({ rowCount: events.length, from: filters.from ?? null, to: filters.to ?? null }) });
      const rangeLabel = filters.from || filters.to ? `${filters.from ?? "start"}-to-${filters.to ?? "today"}` : "all-dates";
      return { csv: `${csv}\n`, filename: `ffm-department-audit-${rangeLabel}.csv`, rowCount: events.length };
    }),
    createDepartment: adminOnly
      .input(z.object({ name: z.string().trim().min(2).max(160), parentDepartmentId: z.number().int().positive().nullable().optional() }))
      .mutation(async ({ input, ctx }) => {
        const name = departmentName(input.name);
        const rows = await listDepartments();
        if (rows.some(row => row.name.toLowerCase() === name.toLowerCase())) throw new TRPCError({ code: "CONFLICT", message: "A department with this name already exists." });
        if (input.parentDepartmentId != null && !rows.some(row => row.id === input.parentDepartmentId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an existing parent department." });
        const result = await createDepartment({ name, parentDepartmentId: input.parentDepartmentId ?? null, createdBy: ctx.user.id, isActive: true });
        await addAuditEvent({ actorId: ctx.user.id, action: "department.created", entityType: "department", entityId: result?.id, metadata: JSON.stringify({ name, parentDepartmentId: input.parentDepartmentId ?? null }) });
        return result;
      }),
    updateDepartment: adminOnly
      .input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160), parentDepartmentId: z.number().int().positive().nullable(), isActive: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const current = await getDepartmentById(input.id);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found." });
        const name = departmentName(input.name);
        const rows = await listDepartments();
        if (rows.some(row => row.id !== input.id && row.name.toLowerCase() === name.toLowerCase())) throw new TRPCError({ code: "CONFLICT", message: "A department with this name already exists." });
        if (input.parentDepartmentId != null && !rows.some(row => row.id === input.parentDepartmentId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an existing parent department." });
        if (departmentHierarchyHasCycle(rows, input.id, input.parentDepartmentId)) throw new TRPCError({ code: "BAD_REQUEST", message: "A department cannot be its own parent or descendant." });
        const result = await updateDepartment(input.id, { name, parentDepartmentId: input.parentDepartmentId, isActive: input.isActive });
        await addAuditEvent({ actorId: ctx.user.id, action: "department.updated", entityType: "department", entityId: input.id, metadata: JSON.stringify({ previousName: current.name, name, parentDepartmentId: input.parentDepartmentId, isActive: input.isActive }) });
        return result;
      }),
    removeDepartment: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const department = await getDepartmentById(input.id);
        if (!department) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found." });
        const [rows, members] = await Promise.all([listDepartments(), listUsers()]);
        if (rows.some(row => row.parentDepartmentId === input.id)) throw new TRPCError({ code: "CONFLICT", message: "Reassign or remove child departments before removing this department." });
        if (members.some(member => member.department?.trim().toLowerCase() === department.name.trim().toLowerCase())) throw new TRPCError({ code: "CONFLICT", message: "Reassign or clear members before removing this department." });
        const result = await removeDepartment(input.id);
        await addAuditEvent({ actorId: ctx.user.id, action: "department.removed", entityType: "department", entityId: input.id, metadata: JSON.stringify({ name: department.name }) });
        return result;
      }),
    assignUserDepartment: adminOnly
      .input(z.object({ userId: z.number().int().positive(), departmentId: z.number().int().positive().nullable() }))
      .mutation(async ({ input, ctx }) => {
        const member = await getUserById(input.userId);
        if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
        const department = input.departmentId == null ? undefined : await getDepartmentById(input.departmentId);
        if (input.departmentId != null && (!department || !department.isActive)) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an active department." });
        const result = await updateUserDepartment(input.userId, department?.name ?? null);
        await addAuditEvent({ actorId: ctx.user.id, action: "department.member_assigned", entityType: "user", entityId: input.userId, metadata: JSON.stringify({ previousDepartment: member.department ?? null, department: department?.name ?? null }) });
        return result;
      }),
    removeWarehouseDeliveryProof: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database is not available",
          });
        const proof = (
          await db
            .select()
            .from(warehouseDeliveryProofs)
            .where(eq(warehouseDeliveryProofs.id, input.id))
            .limit(1)
        )[0];
        if (!proof)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Warehouse Hero delivery proof not found",
          });
        await db
          .delete(warehouseDeliveryProofs)
          .where(eq(warehouseDeliveryProofs.id, input.id));
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "warehouse_hero.delivery_proof_removed",
          entityType: "warehouseDeliveryProof",
          entityId: input.id,
          metadata: JSON.stringify({
            warehouseHeroId: proof.warehouseHeroId,
            storageKey: proof.storageKey,
            sizeBytes: proof.sizeBytes,
            cleanup: "reference_removed",
          }),
        });
        return { success: true as const, bytesUnlinked: proof.sizeBytes };
      }),
    removeSurgeryDeliveryProof: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database is not available",
          });
        const proof = (
          await db
            .select()
            .from(surgeryDeliveryProofs)
            .where(eq(surgeryDeliveryProofs.id, input.id))
            .limit(1)
        )[0];
        if (!proof)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery patient-sheet proof not found",
          });
        await db
          .delete(surgeryDeliveryProofs)
          .where(eq(surgeryDeliveryProofs.id, input.id));
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "surgery.delivery_proof_removed",
          entityType: "surgery",
          entityId: proof.surgeryId,
          metadata: JSON.stringify({
            proofId: proof.id,
            storageKey: proof.storageKey,
            originalName: proof.originalName,
            sizeBytes: proof.sizeBytes,
            cleanup: "reference_removed",
          }),
        });
        return { success: true as const, bytesUnlinked: proof.sizeBytes };
      }),
    implantCatalogue: adminOnly.query(async () => listImplantCatalogue(true)),
    addImplantCatalogueItem: adminOnly
      .input(
        z.object({
          name: z.string().trim().min(2).max(220),
          manufacturer: z.string().trim().max(180).optional(),
          productCode: z.string().trim().max(160).optional(),
          description: z.string().trim().max(2000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createImplantCatalogueItem({
          name: input.name,
          manufacturer: input.manufacturer || null,
          productCode: input.productCode || null,
          description: input.description || null,
          createdBy: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "implant_catalogue.created",
          entityType: "implantCatalogue",
          entityId: result?.id,
        });
        return result;
      }),
    managerAssignments: adminOnly.query(async () => listManagerAssignments()),
    managerWarehouseHeroAssignments: adminOnly.query(async () =>
      listManagerWarehouseHeroAssignments()
    ),
    managerSeniorities: adminOnly.query(async () => listManagerSenioritiesForAdmin()),
    topManagerScopes: adminOnly.query(async () => listManagerDirectionScopes()),
    setManagerSeniority: adminOnly
      .input(z.object({ managerId: z.number().int().positive(), level: z.enum(["manager", "top_manager"]) }))
      .mutation(async ({ ctx, input }) => {
        const manager = await getUserById(input.managerId);
        if (manager?.role !== "manager") throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an active Manager." });
        const result = await setManagerSeniority({ managerId: input.managerId, level: input.level, setBy: ctx.user.id });
        await addAuditEvent({ actorId: ctx.user.id, action: "manager_seniority.updated", entityType: "user", entityId: input.managerId, metadata: JSON.stringify({ level: input.level }) });
        return result;
      }),
    assignManagerToTopManager: adminOnly
      .input(z.object({ topManagerId: z.number().int().positive(), managerId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (input.topManagerId === input.managerId) throw new TRPCError({ code: "BAD_REQUEST", message: "A Top Manager cannot direct themselves." });
        const manager = await getUserById(input.managerId);
        if (manager?.role !== "manager" || !(await isTopManager(input.topManagerId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a Top Manager and a Manager." });
        if (await isManagerDirectedByTopManager(input.topManagerId, input.managerId)) throw new TRPCError({ code: "CONFLICT", message: "This Manager is already assigned to that Top Manager." });
        const result = await createTopManagerManagerAssignment({ ...input, assignedBy: ctx.user.id });
        await addAuditEvent({ actorId: ctx.user.id, action: "top_manager.manager_assigned", entityType: "topManagerManagerAssignment", entityId: result?.id, metadata: JSON.stringify(input) });
        return result;
      }),
    unassignManagerFromTopManager: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await removeTopManagerManagerAssignment(input.id);
        await addAuditEvent({ actorId: ctx.user.id, action: "top_manager.manager_unassigned", entityType: "topManagerManagerAssignment", entityId: input.id });
        return result;
      }),
    assignDelegate: adminOnly
      .input(
        z.object({
          managerId: z.number().int().positive(),
          delegateId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const manager = await getUserById(input.managerId);
        const delegate = await getUserById(input.delegateId);
        if (manager?.role !== "manager" || delegate?.role !== "delegate")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose a valid manager and delegate",
          });
        if (
          await isDelegateAssignedToManager(input.managerId, input.delegateId)
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "This delegate is already assigned to that manager",
          });
        const result = await createManagerDelegateAssignment({
          ...input,
          assignedBy: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "manager_delegate.assigned",
          entityType: "managerDelegateAssignment",
          entityId: result?.id,
          metadata: JSON.stringify(input),
        });
        return result;
      }),
    unassignDelegate: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const result = await removeManagerDelegateAssignment(input.id);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "manager_delegate.unassigned",
          entityType: "managerDelegateAssignment",
          entityId: input.id,
        });
        return result;
      }),
    assignWarehouseHero: adminOnly
      .input(
        z.object({
          managerId: z.number().int().positive(),
          warehouseHeroId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const manager = await getUserById(input.managerId);
        const warehouseHero = await getUserById(input.warehouseHeroId);
        if (
          manager?.role !== "manager" ||
          warehouseHero?.role !== "warehouse_hero"
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose a valid manager and Warehouse Hero",
          });
        if (
          await isWarehouseHeroAssignedToManager(
            input.managerId,
            input.warehouseHeroId
          )
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "This Warehouse Hero is already assigned to that manager",
          });
        const result = await createManagerWarehouseHeroAssignment({
          ...input,
          assignedBy: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "manager_warehouse_hero.assigned",
          entityType: "managerWarehouseHeroAssignment",
          entityId: result?.id,
          metadata: JSON.stringify(input),
        });
        return result;
      }),
    unassignWarehouseHero: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const result = await removeManagerWarehouseHeroAssignment(input.id);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "manager_warehouse_hero.unassigned",
          entityType: "managerWarehouseHeroAssignment",
          entityId: input.id,
        });
        return result;
      }),
    createInvitation: adminOnly
      .input(
        z.object({
          email: z.string().email(),
          role: z
            .enum(["user", "manager", "delegate", "warehouse_hero"])
            .default("delegate"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const token = randomBytes(32).toString("hex");
        const invitation = await createInvitation({
          email: input.email.toLowerCase(),
          role: input.role,
          invitedBy: ctx.user.id,
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72),
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "invitation.created",
          entityType: "invitation",
          entityId: invitation?.id,
        });
        return { invitation, token, inviteUrl: `/invite/${token}` };
      }),
    addUser: adminOnly
      .input(
        z.object({
          email: z.string().email(),
          name: z.string().trim().min(1).max(120).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await listUsers();
        if (
          existing.some(
            item => item.email?.toLowerCase() === input.email.toLowerCase()
          )
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "A user with this email already exists",
          });
        return createInvitation({
          email: input.email.toLowerCase(),
          role: "delegate",
          invitedBy: ctx.user.id,
          tokenHash: tokenHash(randomBytes(32).toString("hex")),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72),
        });
      }),
    setRole: adminOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          role: z.enum([
            "user",
            "manager",
            "delegate",
            "warehouse_hero",
            "admin",
          ]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const target = await getUserById(input.id);
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (isProtectedAdminTarget(target, ctx.user.openId))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "The protected administrator role cannot be changed",
          });
        const result = await updateUserRole(input.id, input.role);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "user.role_changed",
          entityType: "user",
          entityId: input.id,
          metadata: JSON.stringify({ role: input.role }),
        });
        return result;
      }),
    removeUser: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const target = await getUserById(input.id);
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (isProtectedAdminTarget(target, ctx.user.openId))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "The protected administrator account cannot be removed",
          });
        await removeUser(input.id);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "user.removed",
          entityType: "user",
          entityId: input.id,
        });
        return { success: true } as const;
      }),
  }),
  reports: router({
    summary: managerOnly
      .input(
        z
          .object({ from: z.string().optional(), to: z.string().optional() })
          .optional()
      )
      .query(async ({ input, ctx }) =>
        getOperationalSummary({
          ...input,
          delegateIds:
            ctx.user.role === "manager"
              ? await listDelegateIdsForManager(ctx.user.id)
              : undefined,
        })
      ),
    exportCsv: managerOnly
      .input(
        z
          .object({ from: z.string().optional(), to: z.string().optional() })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const summary = await getOperationalSummary({
          ...input,
          delegateIds:
            ctx.user.role === "manager"
              ? await listDelegateIdsForManager(ctx.user.id)
              : undefined,
        });
        return operationalSummaryCsv(summary);
      }),
    tasks: managerOnly
      .input(
        z
          .object({ from: z.string().optional(), to: z.string().optional() })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const tasks =
          ctx.user.role === "manager"
            ? await listTasksForManager(ctx.user.id)
            : await listAllTasks();
        const from = input?.from ? new Date(input.from) : undefined;
        const to = input?.to
          ? new Date(`${input.to}T23:59:59.999Z`)
          : undefined;
        return tasks.filter(
          task =>
            (!from || task.scheduledAt >= from) &&
            (!to || task.scheduledAt <= to)
        );
      }),
    surgeries: managerOnly
      .input(
        z
          .object({ from: z.string().optional(), to: z.string().optional() })
          .optional()
      )
      .query(async ({ input, ctx }) =>
        getDetailedSurgeryReport({
          ...input,
          delegateIds:
            ctx.user.role === "manager"
              ? await listDelegateIdsForManager(ctx.user.id)
              : undefined,
        })
      ),
    audit: adminOnly
      .input(
        z
          .object({ limit: z.number().int().min(1).max(200).default(100) })
          .optional()
      )
      .query(({ input }) => listAuditEvents(input?.limit ?? 100)),
  }),
  backup: router({
    status: adminOnly.query(async ({ ctx }) => ({
      connected: Boolean(await getGoogleDriveBackupConnection(ctx.user.id)),
      archives: await listBackupArchives(ctx.user.id),
    })),
    create: adminOnly.mutation(async ({ ctx }) => {
      const connection = await getGoogleDriveBackupConnection(ctx.user.id);
      if (!connection)
        return {
          connected: false as const,
          authorizeUrl: "/api/oauth/google-drive/start",
        };
      const archive = await createGoogleDriveBackupArchive(ctx.user.id);
      return { connected: true as const, archive };
    }),
  }),
  monitoring: router({
    captureClientError: protectedProcedure
      .input(
        z.object({
          message: z.string().min(1).max(500),
          stack: z.string().max(20000).optional(),
          componentStack: z.string().max(20000).optional(),
          route: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (isExpectedInvitationProbe(input))
          return { success: true, ignored: true } as const;
        await captureClientError({ ...input, userId: ctx.user.id });
        return { success: true } as const;
      }),
    recentClientErrors: adminOnly
      .input(
        z
          .object({ limit: z.number().int().min(1).max(200).default(100) })
          .optional()
      )
      .query(({ input }) => listClientErrors(input?.limit ?? 100)),
    dismissClientError: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await dismissClientError(input.id);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "client_error.dismissed",
          entityType: "clientError",
          entityId: input.id,
        });
        return { success: true } as const;
      }),
    dismissAllClientErrors: adminOnly.mutation(async ({ ctx }) => {
      const dismissedCount = await dismissAllClientErrors();
      await addAuditEvent({
        actorId: ctx.user.id,
        action: "client_error.dismissed_all",
        entityType: "clientError",
        metadata: JSON.stringify({ dismissedCount }),
      });
      return { success: true, dismissedCount } as const;
    }),
    health: adminOnly.query(() => getMonitoringHealth()),
    weeklyBackupReminder: adminOnly.query(() =>
      getWeeklyBackupReminderSchedule()
    ),
  }),
  preferences: router({
    get: protectedProcedure.query(({ ctx }) =>
      getUserById(ctx.user.id).then(user => ({
        pushNotifications: user?.pushNotifications ?? true,
        emailNotifications: user?.emailNotifications ?? true,
        locationSharing: user?.locationSharing ?? false,
      }))
    ),
    update: protectedProcedure
      .input(
        z
          .object({
            pushNotifications: z.boolean().optional(),
            emailNotifications: z.boolean().optional(),
            locationSharing: z.boolean().optional(),
          })
          .refine(
            input =>
              input.pushNotifications !== undefined ||
              input.emailNotifications !== undefined ||
              input.locationSharing !== undefined,
            { message: "At least one preference is required" }
          )
      )
      .mutation(async ({ input, ctx }) => {
        const result = await updateNotificationPreferences(ctx.user.id, input);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "user.notification_preferences_updated",
          entityType: "user",
          entityId: ctx.user.id,
          metadata: JSON.stringify(input),
        });
        return {
          pushNotifications: result?.pushNotifications ?? true,
          emailNotifications: result?.emailNotifications ?? true,
          locationSharing: result?.locationSharing ?? false,
        };
      }),
  }),
  operations: router({
    warehouseHeroLeadActivity: protectedProcedure.query(async ({ ctx }) => {
      const lead = isAdmin(ctx.user) ? (await listUsers()).find(user => user.email?.trim().toLowerCase() === WAREHOUSE_HERO_LEAD_EMAIL && user.role === "manager") : isWarehouseHeroLead(ctx.user) ? ctx.user : undefined;
      if (!lead) throw new TRPCError({ code: "FORBIDDEN", message: "Warehouse Hero lead activity is restricted to the designated lead and Administrators." });
      return getWarehouseHeroLeadActivity(lead.id);
    }),
    exportWarehouseHeroLeadActivityCsv: protectedProcedure.query(async ({ ctx }) => {
      const lead = isAdmin(ctx.user) ? (await listUsers()).find(user => user.email?.trim().toLowerCase() === WAREHOUSE_HERO_LEAD_EMAIL && user.role === "manager") : isWarehouseHeroLead(ctx.user) ? ctx.user : undefined;
      if (!lead) throw new TRPCError({ code: "FORBIDDEN", message: "Warehouse Hero lead export is restricted to the designated lead and Administrators." });
      const rows = await getWarehouseHeroLeadActivity(lead.id);
      await addAuditEvent({ actorId: ctx.user.id, action: "warehouse_hero.lead_activity_exported", entityType: "user", entityId: lead.id, metadata: JSON.stringify({ leadEmail: WAREHOUSE_HERO_LEAD_EMAIL, rowCount: rows.length }) });
      return warehouseHeroLeadActivityCsv(rows);
    }),
    managerDirectionWorkspace: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "manager") throw new TRPCError({ code: "FORBIDDEN", message: "Manager direction access is restricted to Managers." });
      const topManager = await isTopManager(ctx.user.id);
      if (topManager) {
        const [managers, issuedDirections] = await Promise.all([listManagersForTopManager(ctx.user.id), listManagerDirectionsForTopManager(ctx.user.id)]);
        return { canDirectManagers: true, managers: managers.map(manager => ({ id: manager.id, name: manager.name || manager.email || "Manager", email: manager.email || null })), issuedDirections, receivedDirections: [] };
      }
      const receivedDirections = await listManagerDirectionsForManager(ctx.user.id);
      return { canDirectManagers: false, managers: [], issuedDirections: [], receivedDirections };
    }),
    createManagerDirection: protectedProcedure
      .input(z.object({ managerId: z.number().int().positive(), title: z.string().trim().min(3).max(220), details: z.string().trim().max(3000).optional(), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "manager" || !(await isTopManager(ctx.user.id))) throw new TRPCError({ code: "FORBIDDEN", message: "Only an Administrator-designated Top Manager can direct Managers." });
        if (!(await isManagerDirectedByTopManager(ctx.user.id, input.managerId))) throw new TRPCError({ code: "FORBIDDEN", message: "This Manager is not assigned to your direction scope." });
        const result = await createManagerDirection({ topManagerId: ctx.user.id, managerId: input.managerId, title: input.title, details: input.details || null, dueDate: input.dueDate ? new Date(`${input.dueDate}T23:59:59.999Z`) : null, status: "open" });
        await addAuditEvent({ actorId: ctx.user.id, action: "top_manager.direction_created", entityType: "managerDirection", entityId: result?.id, metadata: JSON.stringify({ managerId: input.managerId, dueDate: input.dueDate ?? null }) });
        return result;
      }),
    completeManagerDirection: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "manager") throw new TRPCError({ code: "FORBIDDEN", message: "Only the directed Manager can complete a direction." });
        const result = await completeManagerDirection(input.id, ctx.user.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "This direction is not available to your Manager account." });
        await addAuditEvent({ actorId: ctx.user.id, action: "top_manager.direction_completed", entityType: "managerDirection", entityId: input.id });
        return result;
      }),
    clients: fieldUserOnly.query(() => listClients()),
    delegates: fieldUserOnly.query(({ ctx }) =>
      ctx.user.role === "manager" && !isSuperManager(ctx.user)
        ? listDelegatesForManager(ctx.user.id)
        : listDelegates()
    ),
    superManagerRoster: protectedProcedure.input(superManagerActivityFilters.optional()).query(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user) && !isSuperManager(ctx.user))
        throw new TRPCError({ code: "FORBIDDEN", message: "Super Manager roster oversight is restricted." });
      return buildSuperManagerRoster(input ?? {});
    }),
    superManagerRosterExport: protectedProcedure.input(superManagerRosterExportFilters).mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user) && !isSuperManager(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Super Manager roster oversight is restricted." });
      const roster = await buildSuperManagerRoster();
      const assignmentNames = new globalThis.Map<number, string[]>();
      for (const assignment of roster.assignments) {
        const values = assignmentNames.get(assignment.delegateId) ?? [];
        values.push(assignment.managerName || assignment.managerEmail || "Assigned Manager");
        assignmentNames.set(assignment.delegateId, values);
      }
      const query = input.query?.toLowerCase() ?? "";
      const department = input.department?.toLowerCase() ?? "";
      const rows = [
        ...roster.managers.map(member => ({ ...member, rosterRole: "manager", managerAssignments: [] as string[] })),
        ...roster.delegates.map(member => ({ ...member, rosterRole: "delegate", managerAssignments: assignmentNames.get(member.id) ?? [] })),
        ...roster.warehouseHeroes.map(member => ({ ...member, rosterRole: "warehouse_hero", managerAssignments: [] as string[] })),
      ].filter(member => {
        const matchesQuery = !query || `${member.name || ""} ${member.email || ""} ${member.department || ""} ${member.managerAssignments.join(" ")}`.toLowerCase().includes(query);
        return matchesQuery && (!input.role || member.rosterRole === input.role) && (!department || member.department?.trim().toLowerCase() === department);
      });
      const header = ["Name", "Email", "Role", "Department", "Assigned Manager"];
      const csv = [header.map(safeCsvCell).join(","), ...rows.map(member => [member.name || "", member.email || "", member.rosterRole, member.department || "", member.managerAssignments.join("; ") || (member.rosterRole === "delegate" ? "Unassigned" : "")].map(safeCsvCell).join(","))].join("\n");
      await addAuditEvent({ actorId: ctx.user.id, action: "super_manager.roster_exported", entityType: "user", metadata: JSON.stringify({ query: input.query || null, role: input.role || null, department: input.department || null, rowCount: rows.length }) });
      return { csv: `${csv}\n`, filename: `ffm-super-manager-roster-${new Date().toISOString().slice(0, 10)}.csv`, rowCount: rows.length };
    }),
    superManagerFilterPresets: protectedProcedure.query(async ({ ctx }) => {
      if (!isAdmin(ctx.user) && !isSuperManager(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Super Manager roster oversight is restricted." });
      return listSuperManagerReportFilterPresets(ctx.user.id);
    }),
    saveSuperManagerFilterPreset: protectedProcedure.input(superManagerFilterPresetInput).mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user) && !isSuperManager(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Super Manager roster oversight is restricted." });
      const name = input.name.trim().replace(/\s+/g, " ");
      const existing = await listSuperManagerReportFilterPresets(ctx.user.id, false);
      if (existing.some(preset => preset.name.toLowerCase() === name.toLowerCase())) throw new TRPCError({ code: "CONFLICT", message: "Choose a different name for this saved filter." });
      const isShared = isAdmin(ctx.user) && input.isShared === true;
      const result = await createSuperManagerReportFilterPreset({ userId: ctx.user.id, name, query: input.query || null, role: input.role || null, department: input.department || null, activityFrom: input.activityFrom || null, activityTo: input.activityTo || null, activityStatus: input.activityStatus || null, isShared });
      await addAuditEvent({ actorId: ctx.user.id, action: "super_manager.filter_preset_saved", entityType: "superManagerFilterPreset", entityId: result?.id, metadata: JSON.stringify({ name, isShared }) });
      return result;
    }),
    removeSuperManagerFilterPreset: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user) && !isSuperManager(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Super Manager roster oversight is restricted." });
      const result = await removeSuperManagerReportFilterPreset(input.id, ctx.user.id, isAdmin(ctx.user));
      if (!result.deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Saved filter not found." });
      await addAuditEvent({ actorId: ctx.user.id, action: "super_manager.filter_preset_removed", entityType: "superManagerFilterPreset", entityId: input.id });
      return { success: true as const };
    }),
    doctors: fieldUserOnly.query(() => listDoctors()),
    geography: fieldUserOnly.query(() => listGeography()),
    messages: protectedProcedure.query(({ ctx }) => listMessages(ctx.user.id)),
    messageRecipients: protectedProcedure.query(({ ctx }) =>
      listMessageRecipients(ctx.user.id)
    ),
    markMessagesRead: protectedProcedure.mutation(({ ctx }) =>
      markMessagesRead(ctx.user.id)
    ),
    surgeries: fieldUserOnly.query(({ ctx }) =>
      isAdmin(ctx.user)
        ? listAllSurgeries()
        : ctx.user.role === "delegate"
          ? listSurgeriesForDelegate(ctx.user.id)
          : listSurgeriesForManager(ctx.user.id)
    ),
    surgeryCalendar: protectedProcedure.query(() => listAllSurgeries()),
    implantCatalogue: fieldUserOnly
      .input(
        z.object({ query: z.string().trim().max(160).optional() }).optional()
      )
      .query(({ input }) => searchImplantCatalogue(input?.query ?? "")),
    visitPlans: fieldUserOnly.query(({ ctx }) =>
      isAdmin(ctx.user)
        ? listAllVisitPlans()
        : ctx.user.role === "delegate"
          ? listVisitPlansForDelegate(ctx.user.id)
          : listVisitPlansForManager(ctx.user.id)
    ),
    liveDelegatePositions: managerOnly.query(({ ctx }) =>
      listLiveDelegatePositionsForManager(ctx.user.id)
    ),
    warehouseHeroes: protectedProcedure.query(() => listWarehouseHeroes()),
    warehouseHeroLocations: protectedProcedure.query(() =>
      listSharedWarehouseHeroLocations()
    ),
    warehouseDeliveryProofs: protectedProcedure
      .input(deliveryProofDateRangeSchema.optional())
      .query(({ input }) => listSharedWarehouseDeliveryProofs(input)),
    exportWarehouseDeliveryProofsCsv: protectedProcedure
      .input(
        deliveryProofDateRangeSchema
          .safeExtend({
            warehouseHeroId: z.number().int().positive().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const proofs = await listSharedWarehouseDeliveryProofs(input);
        return warehouseDeliveryProofsCsv(
          input?.warehouseHeroId
            ? proofs.filter(
                proof => proof.warehouseHeroId === input.warehouseHeroId
              )
            : proofs
        );
      }),
    myWarehouseDeliveryProofs: warehouseHeroOnly.query(({ ctx }) =>
      listWarehouseDeliveryProofsForHero(ctx.user.id)
    ),
    warehouseHandovers: managerOnly.query(() => listWarehouseHandovers()),
    weeklyWarehouseHandoverAnalytics: managerOnly.input(z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional()).query(async ({ input }) => getWeeklyWarehouseHandoverAnalytics(input?.weekStart)),
    exportWarehouseHandoverWeeklyAnalyticsCsv: managerOnly.input(z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional()).query(async ({ ctx, input }) => { const analytics = await getWeeklyWarehouseHandoverAnalytics(input?.weekStart); await addAuditEvent({ actorId: ctx.user.id, action: "warehouse_handover.weekly_analytics_exported", entityType: "warehouseHandover", metadata: JSON.stringify({ weekStart: analytics.weekStart, weekEnd: analytics.weekEnd, rowCount: analytics.rows.length }) }); return { csv: warehouseHandoverAnalyticsCsv(analytics), filename: `ffm-weekly-handover-analytics-${analytics.weekStart}.csv`, summary: { weekStart: analytics.weekStart, weekEnd: analytics.weekEnd, totalHandovers: analytics.totalHandovers, acknowledgedHandovers: analytics.acknowledgedHandovers, awaitingAcknowledgement: analytics.awaitingAcknowledgement, totalProofPhotos: analytics.totalProofPhotos } }; }),
    acknowledgeWarehouseHandover: managerOnly.input(z.object({ handoverId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const handover = await acknowledgeWarehouseHandover(input.handoverId, ctx.user.id);
      if (!handover) throw new TRPCError({ code: "NOT_FOUND", message: "This handover is unavailable or has already been acknowledged." });
      await addAuditEvent({ actorId: ctx.user.id, action: "warehouse_handover.acknowledged", entityType: "warehouseHandover", entityId: handover.id, metadata: JSON.stringify({ warehouseHeroId: handover.warehouseHeroId, recipientName: handover.recipientName }) });
      return handover;
    }),
    warehouseHeroAssignmentStatus: warehouseHeroOnly.query(
      () => ({ assigned: true, available: true }) as const
    ),
    updateWarehouseHeroLocation: warehouseHeroOnly
      .input(
        z.object({
          latitude: z
            .string()
            .regex(/^-?\d{1,3}(\.\d+)?$/)
            .refine(value => {
              const coordinate = Number(value);
              return coordinate >= -90 && coordinate <= 90;
            }, "Latitude must be between -90 and 90"),
          longitude: z
            .string()
            .regex(/^-?\d{1,3}(\.\d+)?$/)
            .refine(value => {
              const coordinate = Number(value);
              return coordinate >= -180 && coordinate <= 180;
            }, "Longitude must be between -180 and 180"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const currentUser = await getUserById(ctx.user.id);
        if (!currentUser?.locationSharing)
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Enable location sharing before updating Warehouse Hero GPS",
          });
        const existing = await getWarehouseHeroLocation(ctx.user.id);
        if (existing && Date.now() - existing.capturedAt.getTime() < 10_000)
          return existing;
        const result = await upsertWarehouseHeroLocation({
          warehouseHeroId: ctx.user.id,
          latitude: input.latitude,
          longitude: input.longitude,
          capturedAt: new Date(),
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "warehouse_hero.location_updated",
          entityType: "warehouseHeroLocation",
          entityId: result?.id,
        });
        return result;
      }),
    uploadWarehouseDeliveryProof: warehouseHeroOnly
      .input(
        z.object({
          fileName: z.string().min(1).max(180),
          mimeType: z.literal("image/jpeg"),
          base64: z.string().min(20).max(15_000_000),
          captureSource: z.literal("live_camera"),
          note: z.string().max(1_000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(
          input.base64.replace(/^data:[^;]+;base64,/, ""),
          "base64"
        );
        if (!buffer.byteLength)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The delivery-proof image is empty",
          });
        if (buffer.byteLength > 8 * 1024 * 1024)
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: "Delivery-proof photos must be 8 MB or smaller",
          });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploaded = await storagePut(
          `warehouse-delivery-proofs/${ctx.user.id}/${Date.now()}-${safeName}`,
          buffer,
          input.mimeType
        );
        const result = await createWarehouseDeliveryProof({
          warehouseHeroId: ctx.user.id,
          note: input.note?.trim() || null,
          captureSource: input.captureSource,
          storageKey: uploaded.key,
          mimeType: input.mimeType,
          sizeBytes: buffer.byteLength,
          capturedAt: new Date(),
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "warehouse_hero.delivery_proof_uploaded",
          entityType: "warehouseDeliveryProof",
          entityId: result?.id,
        });
        return { proofId: result?.id, url: uploaded.url } as const;
      }),
    submitWarehouseHandover: warehouseHeroOnly.input(z.object({
      recipientName: z.string().trim().min(2).max(160),
      signatureBase64: z.string().min(100).max(2_000_000),
      note: z.string().max(1_000).optional(),
      proofs: z.array(z.object({ fileName: z.string().min(1).max(180), base64: z.string().min(20).max(15_000_000) })).min(1).max(20),
    })).mutation(async ({ ctx, input }) => {
      const signatureBuffer = Buffer.from(input.signatureBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
      if (signatureBuffer.byteLength < 100 || signatureBuffer.byteLength > 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "A valid handover signature is required and must be 1 MB or smaller." });
      const timestamp = Date.now();
      const signature = await storagePut(`warehouse-handovers/${ctx.user.id}/${timestamp}-recipient-signature.png`, signatureBuffer, "image/png");
      const handover = await createWarehouseHandover({ warehouseHeroId: ctx.user.id, recipientName: input.recipientName, note: input.note?.trim() || null, signatureStorageKey: signature.key, signatureMimeType: "image/png" });
      const proofIds: number[] = [];
      for (let index = 0; index < input.proofs.length; index += 1) {
        const proof = input.proofs[index];
        const buffer = Buffer.from(proof.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
        if (!buffer.byteLength || buffer.byteLength > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Each delivery-proof photo must be 8 MB or smaller." });
        const safeName = proof.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploaded = await storagePut(`warehouse-delivery-proofs/${ctx.user.id}/${timestamp}-${index + 1}-${safeName}`, buffer, "image/jpeg");
        const record = await createWarehouseDeliveryProof({ warehouseHeroId: ctx.user.id, handoverId: handover!.id, note: input.note?.trim() || null, captureSource: "live_camera", storageKey: uploaded.key, mimeType: "image/jpeg", sizeBytes: buffer.byteLength, capturedAt: new Date() });
        if (record?.id) proofIds.push(record.id);
      }
      await addAuditEvent({ actorId: ctx.user.id, action: "warehouse_handover.submitted", entityType: "warehouseHandover", entityId: handover?.id, metadata: JSON.stringify({ recipientName: input.recipientName, proofCount: proofIds.length }) });
      return { handoverId: handover?.id, proofIds, signatureUrl: signature.url };
    }),
    submitVisitPlan: delegateOnly
      .input(
        z.object({
          clientId: z.number().int().positive(),
          proposedAt: z.date(),
          notes: z.string().max(5000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createVisitPlan({
          ...input,
          delegateId: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "visit_plan.created",
          entityType: "visitPlan",
          entityId: result?.id,
        });
        return result;
      }),
    reviewVisitPlan: managerOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["approved", "rejected", "pending"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getVisitPlanById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Visit plan not found",
          });
        const allowedDelegateIds = await listDelegateIdsForManager(ctx.user.id);
        if (
          !canManagerAccessDelegate(
            ctx.user.role,
            ctx.user.id,
            existing.delegateId,
            allowedDelegateIds
          )
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This visit plan is outside the Manager assignment scope",
          });
        const result = await updateVisitPlan(input.id, {
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "visit_plan.reviewed",
          entityType: "visitPlan",
          entityId: input.id,
          metadata: JSON.stringify({ status: input.status }),
        });
        return result;
      }),
    addSurgery: delegateOnly
      .input(
        z.object({
          clientId: z.number().int().positive(),
          surgeryDate: z.date(),
          hospital: z.string().optional(),
          surgeon: z.string().optional(),
          procedureName: z.string().min(2),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createSurgery({
          ...input,
          notifiedAt: new Date(),
          calendarStatus: "notified",
          delegateId: ctx.user.id,
          createdBy: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "surgery.created",
          entityType: "surgery",
          entityId: result?.id,
          metadata: JSON.stringify({ calendarStatus: "notified" }),
        });
        return result;
      }),
    createManagerSurgery: managerOnly
      .input(
        z.object({
          delegateId: z.number().int().positive(),
          clientId: z.number().int().positive(),
          surgeryDate: z.date(),
          hospital: z.string().max(220).optional(),
          surgeon: z.string().max(180).optional(),
          procedureName: z.string().trim().min(2).max(220),
          notes: z.string().max(5000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.clientId);
        if (!client)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Client not found",
          });
        const allowedDelegateIds = await listDelegateIdsForManager(ctx.user.id);
        if (
          !canManagerAccessDelegate(
            ctx.user.role,
            ctx.user.id,
            input.delegateId,
            allowedDelegateIds
          )
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This Delegate is outside the Manager assignment scope",
          });
        const result = await createSurgery({
          ...input,
          notifiedAt: new Date(),
          calendarStatus: "notified",
          createdBy: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "manager_surgery.created",
          entityType: "surgery",
          entityId: result?.id,
          metadata: JSON.stringify({
            delegateId: input.delegateId,
            clientId: input.clientId,
            calendarStatus: "notified",
          }),
        });
        return result;
      }),
    updateSurgerySchedule: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          surgeryDate: z.date(),
          calendarStatus: z.enum(["notified", "confirmed"]),
          hospital: z.string().trim().max(220).optional(),
          surgeon: z.string().trim().max(180).optional(),
          procedureName: z.string().trim().min(2).max(220).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (
          ctx.user.role !== "delegate" &&
          ctx.user.role !== "manager" &&
          !isAdmin(ctx.user)
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only Delegates, Managers, and Administrators can update the surgery calendar",
          });
        const existing = await getSurgeryById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery not found",
          });
        if (!(await canAccessSurgery(ctx.user, existing)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This surgery is outside your assignment scope",
          });
        if (
          existing.calendarStatus === "cancelled" ||
          existing.calendarStatus === "completed"
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "A cancelled or completed surgery cannot be rescheduled",
          });
        const { id, ...changes } = input;
        const result = await updateSurgery(id, changes);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "surgery.calendar_updated",
          entityType: "surgery",
          entityId: id,
          metadata: JSON.stringify({
            surgeryDate: input.surgeryDate,
            calendarStatus: input.calendarStatus,
          }),
        });
        return result;
      }),
    updateSurgeryReadiness: fieldUserOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          hospitalConfirmed: z.boolean(),
          implantsAvailable: z.boolean(),
          delegateReady: z.boolean(),
          deliveryPrepared: z.boolean(),
          hospitalDelivered: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const surgery = await getSurgeryById(input.id);
        if (!surgery)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery not found",
          });
        if (!(await canAccessSurgery(ctx.user, surgery)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This surgery is outside your assignment scope",
          });
        const { id, ...checklist } = input;
        const result = await updateSurgery(id, {
          ...checklist,
          readinessUpdatedAt: new Date(),
          readinessUpdatedBy: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "surgery.readiness_updated",
          entityType: "surgery",
          entityId: id,
          metadata: JSON.stringify(checklist),
        });
        return result;
      }),
    resolveSurgeryLifecycle: fieldUserOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          action: z.enum(["postponed", "cancelled", "completed"]),
          reason: z.string().trim().max(2000).optional(),
          rescheduledDate: z.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const surgery = await getSurgeryById(input.id);
        if (!surgery)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery not found",
          });
        if (!(await canAccessSurgery(ctx.user, surgery)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This surgery is outside your assignment scope",
          });
        if (
          surgery.calendarStatus === "cancelled" ||
          surgery.calendarStatus === "completed"
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "This surgery has already reached a final lifecycle state",
          });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (
          surgery.surgeryDate >
          new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Day-of-surgery actions become available on the scheduled surgery date",
          });
        if (input.action === "postponed") {
          if (!input.reason)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A postponement reason is required",
            });
          if (
            !input.rescheduledDate ||
            input.rescheduledDate <= surgery.surgeryDate
          )
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Choose a new surgery date after the current appointment",
            });
          const result = await updateSurgery(surgery.id, {
            surgeryDate: input.rescheduledDate,
            calendarStatus: "postponed",
            lifecycleReason: input.reason,
            lifecycleUpdatedAt: new Date(),
          });
          await addAuditEvent({
            actorId: ctx.user.id,
            action: "surgery.postponed",
            entityType: "surgery",
            entityId: surgery.id,
            metadata: JSON.stringify({
              reason: input.reason,
              rescheduledDate: input.rescheduledDate,
            }),
          });
          return result;
        }
        if (input.action === "cancelled") {
          if (!input.reason)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A cancellation reason is required",
            });
          const result = await updateSurgery(surgery.id, {
            calendarStatus: "cancelled",
            lifecycleReason: input.reason,
            lifecycleUpdatedAt: new Date(),
          });
          await addAuditEvent({
            actorId: ctx.user.id,
            action: "surgery.cancelled",
            entityType: "surgery",
            entityId: surgery.id,
            metadata: JSON.stringify({ reason: input.reason }),
          });
          return result;
        }
        const [implants, proofs] = await Promise.all([
          listSurgeryImplants(surgery.id),
          listSurgeryDeliveryProofs(surgery.id),
        ]);
        if (!implants.length)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Register at least one approved implant before completing the surgery",
          });
        if (!proofs.length)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Upload the patient-sheet delivery proof before completing the surgery",
          });
        const result = await updateSurgery(surgery.id, {
          calendarStatus: "completed",
          lifecycleReason: input.reason || null,
          lifecycleUpdatedAt: new Date(),
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "surgery.completed",
          entityType: "surgery",
          entityId: surgery.id,
          metadata: JSON.stringify({
            implantCount: implants.length,
            proofCount: proofs.length,
          }),
        });
        return result;
      }),
    updateSurgery: fieldUserOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["pending", "partial", "collected"]).optional(),
          quotation: z.string().optional(),
          invoice: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getSurgeryById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery not found",
          });
        if (ctx.user.role === "manager") {
          const allowedDelegateIds = await listDelegateIdsForManager(
            ctx.user.id
          );
          if (
            !canManagerAccessDelegate(
              ctx.user.role,
              ctx.user.id,
              existing.delegateId,
              allowedDelegateIds
            )
          )
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This surgery is outside the Manager assignment scope",
            });
        } else if (
          ctx.user.role === "delegate" &&
          existing.delegateId !== ctx.user.id
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This surgery is outside your assignment scope",
          });
        const result = await updateSurgery(input.id, input);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "surgery.updated",
          entityType: "surgery",
          entityId: input.id,
        });
        return result;
      }),
    removeSurgery: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getSurgeryById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery not found",
          });
        const result = await removeSurgeryWithResources(input.id);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "surgery.removed",
          entityType: "surgery",
          entityId: input.id,
          metadata: JSON.stringify({
            clientId: existing.clientId,
            delegateId: existing.delegateId,
            implantsRemoved: result.implantsRemoved,
            deliveryProofsRemoved: result.deliveryProofsRemoved,
          }),
        });
        return result;
      }),
    surgeryResources: fieldUserOnly
      .input(z.object({ surgeryId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const surgery = await getSurgeryById(input.surgeryId);
        if (!surgery)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery not found",
          });
        if (!(await canAccessSurgery(ctx.user, surgery)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This surgery is outside your assignment scope",
          });
        const implants = await listSurgeryImplants(input.surgeryId);
        return {
          implants,
          implantTotals: calculateSurgeryImplantTotals(implants),
          deliveryProofs: await listSurgeryDeliveryProofs(input.surgeryId),
        };
      }),
    surgeryTimeline: fieldUserOnly
      .input(z.object({ surgeryId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const surgery = await getSurgeryById(input.surgeryId);
        if (!surgery)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery not found",
          });
        if (!(await canAccessSurgery(ctx.user, surgery)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This surgery is outside your assignment scope",
          });
        return listSurgeryTimeline(input.surgeryId);
      }),
    addSurgeryImplant: fieldUserOnly
      .input(
        z
          .object({
            surgeryId: z.number().int().positive(),
            implantCatalogueId: z.number().int().positive().optional(),
            implantName: z.string().trim().min(2).max(220).optional(),
            manufacturer: z.string().trim().max(180).optional(),
            productCode: z.string().trim().max(160).optional(),
            quantity: z.number().int().min(1).max(999),
            unitPrice: z.number().finite().min(0.01).max(99_999_999.99),
            currency: z
              .string()
              .trim()
              .regex(/^[a-zA-Z]{3}$/, "Use a three-letter ISO currency code")
              .transform(value => value.toUpperCase()),
            lotNumber: z.string().trim().max(160).optional(),
            serialNumber: z.string().trim().max(160).optional(),
            notes: z.string().trim().max(2000).optional(),
          })
          .superRefine((value, ctx) => {
            if (!value.implantCatalogueId && !value.implantName)
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  "Select a catalogue implant or enter a new implant name",
                path: ["implantName"],
              });
          })
      )
      .mutation(async ({ input, ctx }) => {
        const surgery = await getSurgeryById(input.surgeryId);
        if (!surgery)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery not found",
          });
        if (!(await canAccessSurgery(ctx.user, surgery)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This surgery is outside your assignment scope",
          });
        if (
          surgery.calendarStatus === "cancelled" ||
          surgery.calendarStatus === "completed"
        )
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Implants cannot be changed after cancellation or completion",
          });
        let catalogueItem = input.implantCatalogueId
          ? await getImplantCatalogueItem(input.implantCatalogueId)
          : undefined;
        if (input.implantCatalogueId && !catalogueItem)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The selected catalogue implant was not found",
          });
        if (!catalogueItem) {
          catalogueItem = await createImplantCatalogueItem({
            name: input.implantName!,
            manufacturer: input.manufacturer || null,
            productCode: input.productCode || null,
            source: "Direct clinical entry",
            isActive: true,
            createdBy: ctx.user.id,
          });
          await addAuditEvent({
            actorId: ctx.user.id,
            action: "implant_catalogue.direct_created",
            entityType: "implantCatalogue",
            entityId: catalogueItem?.id,
            metadata: JSON.stringify({
              surgeryId: surgery.id,
              productCode: input.productCode || null,
            }),
          });
        }
        const result = await createSurgeryImplant({
          surgeryId: input.surgeryId,
          implantCatalogueId: catalogueItem!.id,
          implantName: catalogueItem!.name,
          quantity: input.quantity,
          unitPrice: input.unitPrice.toFixed(2),
          currency: input.currency,
          lotNumber: input.lotNumber || null,
          serialNumber: input.serialNumber || null,
          notes: input.notes || null,
          registeredBy: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "surgery.implant_registered",
          entityType: "surgery",
          entityId: input.surgeryId,
          metadata: JSON.stringify({
            implantId: result?.id,
            implantCatalogueId: catalogueItem!.id,
            directEntry: !input.implantCatalogueId,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            currency: input.currency,
            lineTotal: Number((input.quantity * input.unitPrice).toFixed(2)),
          }),
        });
        return result;
      }),
    uploadSurgeryDeliveryProof: fieldUserOnly
      .input(
        z.object({
          surgeryId: z.number().int().positive(),
          fileName: z.string().min(1).max(180),
          mimeType: z.enum([
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ]),
          base64: z.string().min(20).max(15_000_000),
          note: z.string().trim().max(1000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const surgery = await getSurgeryById(input.surgeryId);
        if (!surgery)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Surgery not found",
          });
        if (!(await canAccessSurgery(ctx.user, surgery)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This surgery is outside your assignment scope",
          });
        const buffer = Buffer.from(
          input.base64.replace(/^data:[^;]+;base64,/, ""),
          "base64"
        );
        if (!buffer.byteLength)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The patient-sheet file is empty",
          });
        if (buffer.byteLength > 8 * 1024 * 1024)
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: "Patient-sheet files must be 8 MB or smaller",
          });
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploaded = await storagePut(
          `surgery-delivery-proofs/${input.surgeryId}/${Date.now()}-${safeName}`,
          buffer,
          input.mimeType
        );
        const result = await createSurgeryDeliveryProof({
          surgeryId: input.surgeryId,
          storageKey: uploaded.key,
          originalName: safeName,
          mimeType: input.mimeType,
          sizeBytes: buffer.byteLength,
          note: input.note || null,
          uploadedBy: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "surgery.delivery_proof_uploaded",
          entityType: "surgery",
          entityId: input.surgeryId,
          metadata: JSON.stringify({
            proofId: result?.id,
            mimeType: input.mimeType,
            sizeBytes: buffer.byteLength,
          }),
        });
        return { proofId: result?.id, url: uploaded.url } as const;
      }),
    sendMessage: protectedProcedure
      .input(
        z.object({
          recipientId: z.number().int().positive(),
          body: z.string().trim().min(1).max(5000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.recipientId === ctx.user.id)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose another FFM member as the recipient",
          });
        const recipient = await getUserById(input.recipientId);
        if (!recipient)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The selected FFM member is no longer available",
          });
        const result = await createMessage({
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          body: input.body,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "message.created",
          entityType: "message",
          entityId: result?.id,
          metadata: JSON.stringify({
            recipientId: input.recipientId,
            senderRole: ctx.user.role,
            recipientRole: recipient.role,
          }),
        });
        return result;
      }),
    addDoctor: fieldUserOnly
      .input(
        z.object({
          clientId: z.number().int().positive(),
          name: z.string().min(2),
          specialty: z.string().optional(),
          department: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          relationship: z.enum(["new", "warm", "kol", "cold"]).default("new"),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createDoctor({ ...input, createdBy: ctx.user.id });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "doctor.created",
          entityType: "doctor",
          entityId: result?.id,
        });
        return result;
      }),
    updateDoctor: managerOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          clientId: z.number().int().positive(),
          name: z.string().min(2),
          specialty: z.string().optional(),
          department: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          relationship: z.enum(["new", "warm", "kol", "cold"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getDoctorById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Doctor not found",
          });
        const { id, ...changes } = input;
        const result = await updateDoctor(id, changes);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "doctor.updated",
          entityType: "doctor",
          entityId: id,
        });
        return result;
      }),
    removeDoctor: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getDoctorById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Doctor not found",
          });
        const dependencies = await getDoctorDeletionDependencies(existing);
        if (dependencies.surgeries)
          throw new TRPCError({
            code: "CONFLICT",
            message: `Cannot delete this doctor while ${dependencies.surgeries} surgery record(s) reference this doctor. Delete those surgeries first.`,
          });
        await removeDoctor(input.id);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "doctor.removed",
          entityType: "doctor",
          entityId: input.id,
          metadata: JSON.stringify({ clientId: existing.clientId }),
        });
        return { success: true } as const;
      }),
    addGeography: managerOnly
      .input(
        z.object({
          kind: z.enum(["province", "city"]),
          name: z.string().min(2),
          parentId: z.number().int().positive().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createGeography({
          ...input,
          createdBy: ctx.user.id,
          parentId: input.parentId ?? null,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "geography.created",
          entityType: input.kind,
          entityId: result?.id,
        });
        return result;
      }),
    updateGeography: managerOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          kind: z.enum(["province", "city"]),
          name: z.string().min(2),
          parentId: z.number().int().positive().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getGeographyById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Geography record not found",
          });
        const { id, ...changes } = input;
        const result = await updateGeography(id, {
          ...changes,
          parentId: changes.parentId ?? null,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "geography.updated",
          entityType: input.kind,
          entityId: id,
        });
        return result;
      }),
    removeGeography: managerOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getGeographyById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Geography record not found",
          });
        await removeGeography(input.id);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "geography.removed",
          entityType: existing.kind,
          entityId: input.id,
        });
        return { success: true } as const;
      }),
    addClient: fieldUserOnly
      .input(
        z.object({
          name: z.string().min(2),
          city: z.string().optional(),
          province: z.string().optional(),
          address: z.string().optional(),
          contactPerson: z.string().optional(),
          phone: z.string().optional(),
          latitude: z.string().optional(),
          longitude: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await createClient({ ...input, createdBy: ctx.user.id });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "client.created",
          entityType: "client",
          entityId: result?.id,
        });
        return result;
      }),
    updateClient: managerOnly
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().min(2),
          city: z.string().optional(),
          province: z.string().optional(),
          address: z.string().optional(),
          contactPerson: z.string().optional(),
          phone: z.string().optional(),
          latitude: z.string().optional(),
          longitude: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getClientById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        const { id, ...changes } = input;
        const result = await updateClient(id, changes);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "client.updated",
          entityType: "client",
          entityId: id,
        });
        return result;
      }),
    removeClient: adminOnly
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getClientById(input.id);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        const dependencies = await getClientDeletionDependencies(input.id);
        const dependencyTotal =
          dependencies.doctors +
          dependencies.tasks +
          dependencies.surgeries +
          dependencies.visitPlans;
        if (dependencyTotal) {
          const details = Object.entries(dependencies)
            .filter(([, count]) => count > 0)
            .map(([name, count]) => `${count} ${name}`)
            .join(", ");
          throw new TRPCError({
            code: "CONFLICT",
            message: `Cannot delete this hospital while it has linked records: ${details}. Remove the linked records first.`,
          });
        }
        await removeClient(input.id);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "client.removed",
          entityType: "client",
          entityId: input.id,
          metadata: JSON.stringify({ name: existing.name }),
        });
        return { success: true } as const;
      }),
    tasks: fieldUserOnly.query(({ ctx }) =>
      isAdmin(ctx.user)
        ? listAllTasks()
        : ctx.user.role === "delegate"
          ? listTasksForDelegate(ctx.user.id)
          : listTasksForManager(ctx.user.id)
    ),
    visit: fieldUserOnly
      .input(z.object({ taskId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const task = await getTaskById(input.taskId);
        if (!task) return undefined;
        const allowed =
          isAdmin(ctx.user) ||
          (ctx.user.role === "delegate" && task.delegateId === ctx.user.id) ||
          (ctx.user.role === "manager" &&
            (await listDelegateIdsForManager(ctx.user.id)).includes(
              task.delegateId
            ));
        if (!allowed)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot access this visit",
          });
        return getVisitByTaskId(input.taskId);
      }),
    addTask: managerOnly
      .input(
        z.object({
          delegateId: z.number().int().positive(),
          clientId: z.number().int().positive(),
          scheduledAt: z.date(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.clientId);
        if (!client)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Client not found",
          });
        if (
          !canManagerAccessDelegate(
            ctx.user.role,
            ctx.user.id,
            input.delegateId,
            await listDelegateIdsForManager(ctx.user.id)
          )
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This delegate is not assigned to your manager account",
          });
        const result = await createTask({ ...input, createdBy: ctx.user.id });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "task.created",
          entityType: "task",
          entityId: result?.id,
        });
        return result;
      }),
    updateTaskStatus: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const task = await getTaskById(input.id);
        if (!task || !(await canOperateTask(ctx.user, task)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot update this task",
          });
        const result = await updateTaskStatus(input.id, input.status);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "task.status_changed",
          entityType: "task",
          entityId: input.id,
          metadata: JSON.stringify({ status: input.status }),
        });
        return result;
      }),
    checkIn: protectedProcedure
      .input(
        z.object({
          taskId: z.number().int().positive(),
          latitude: z.string(),
          longitude: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const task = await getTaskById(input.taskId);
        if (!task || !(await canOperateTask(ctx.user, task)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot check in to this task",
          });
        const result = await upsertVisit({
          taskId: input.taskId,
          checkInAt: new Date(),
          checkInLat: input.latitude,
          checkInLng: input.longitude,
        });
        await updateTaskStatus(input.taskId, "in_progress");
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "visit.checked_in",
          entityType: "task",
          entityId: input.taskId,
        });
        return result;
      }),
    saveVisitReport: protectedProcedure
      .input(
        z.object({
          taskId: z.number().int().positive(),
          report: z.string().trim().min(1).max(10000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const task = await getTaskById(input.taskId);
        if (!task || !(await canOperateTask(ctx.user, task)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot update this visit",
          });
        const result = await upsertVisit({
          taskId: input.taskId,
          ...prepareVisitReport(input.report),
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "visit.report_saved",
          entityType: "task",
          entityId: input.taskId,
        });
        return result;
      }),
    checkOut: protectedProcedure
      .input(
        z.object({
          taskId: z.number().int().positive(),
          latitude: z.string(),
          longitude: z.string(),
          report: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const task = await getTaskById(input.taskId);
        if (!task || !(await canOperateTask(ctx.user, task)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot check out of this task",
          });
        const result = await upsertVisit({
          taskId: input.taskId,
          checkOutAt: new Date(),
          checkOutLat: input.latitude,
          checkOutLng: input.longitude,
          report: input.report,
        });
        await updateTaskStatus(input.taskId, "completed");
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "visit.checked_out",
          entityType: "task",
          entityId: input.taskId,
        });
        return result;
      }),
    uploadEvidence: protectedProcedure
      .input(
        z.object({
          visitId: z.number().int().positive(),
          kind: z.enum(["photo", "audio", "signature", "document"]),
          fileName: z.string().min(1).max(180),
          mimeType: z.string().max(120),
          base64: z.string().min(20).max(15_000_000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const visit = await getVisitById(input.visitId);
        const task = visit ? await getTaskById(visit.taskId) : undefined;
        if (
          ctx.user.role !== "delegate" ||
          !task ||
          task.delegateId !== ctx.user.id
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can upload evidence only to your own visit",
          });
        const buffer = Buffer.from(
          input.base64.replace(/^data:[^;]+;base64,/, ""),
          "base64"
        );
        const uploaded = await storagePut(
          `evidence/${ctx.user.id}/${input.fileName}`,
          buffer,
          input.mimeType
        );
        const evidenceId = await addEvidence({
          visitId: input.visitId,
          kind: input.kind,
          storageKey: uploaded.key,
          mimeType: input.mimeType,
          sizeBytes: buffer.byteLength,
          uploadedBy: ctx.user.id,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "evidence.uploaded",
          entityType: "visit",
          entityId: input.visitId,
          metadata: JSON.stringify({ kind: input.kind, evidenceId }),
        });
        return { evidenceId, url: uploaded.url } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
