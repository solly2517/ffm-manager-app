import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
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
  listDailyActivityReportsForDelegate,
  listDailyActivityReportsForManager,
  listWeeklyVisitPlansForDelegate,
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

const ADMIN_EMAIL = "dr.seleam@gmail.com";
const OPERATIONAL_MANAGER_EMAIL = "amreslam@altamammed.com";
const isAdmin = (user: { email?: string | null; role?: string }) =>
  user.email?.toLowerCase() === ADMIN_EMAIL || user.role === "admin";
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
      .input(z.object({ name: z.string().trim().min(2).max(120) }))
      .mutation(async ({ input, ctx }) => {
        const result = await updateUserDisplayName(ctx.user.id, input.name);
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "profile.display_name_updated",
          entityType: "user",
          entityId: ctx.user.id,
          metadata: JSON.stringify({ name: input.name }),
        });
        return result;
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
        : listWeeklyVisitPlansForManager(ctx.user.id)
    ),
    dailyReports: fieldUserOnly.query(({ ctx }) =>
      ctx.user.role === "delegate"
        ? listDailyActivityReportsForDelegate(ctx.user.id)
        : listDailyActivityReportsForManager(ctx.user.id)
    ),
    submitWeeklyPlan: delegateOnly
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
        const result = await createWeeklyVisitPlan({
          delegateId: ctx.user.id,
          clientId: first.clientId,
          doctorId: first.doctorId,
          weekOf: input.weekOf,
          objectives: input.objectives,
          plannedVisits: input.plannedVisits,
          scheduleJson: JSON.stringify(input.schedule),
          supportNeeded: input.supportNeeded || null,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "weekly_visit_plan.submitted",
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
    submitDailyReport: delegateOnly
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
        const submittedPlans = await listWeeklyVisitPlansForDelegate(
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
        const visitText = input.visits
          .map(
            visit =>
              `${visit.date} — ${clientsById.get(visit.clientId)?.name || "Hospital"} — ${doctorsById.get(visit.doctorId)?.name || "Doctor"}`
          )
          .join("\n");
        const result = await createDailyActivityReport({
          delegateId: ctx.user.id,
          clientId: first.clientId,
          doctorId: first.doctorId,
          reportDate: input.reportDate,
          summary: `Doctor visits:\n${visitText}\n\nActivity summary:\n${input.summary}`,
          outcomes: input.outcomes,
          challenges: input.challenges || null,
          nextActions: input.nextActions || null,
        });
        await addAuditEvent({
          actorId: ctx.user.id,
          action: "daily_activity_report.submitted",
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
    clients: fieldUserOnly.query(() => listClients()),
    delegates: fieldUserOnly.query(({ ctx }) =>
      ctx.user.role === "manager"
        ? listDelegatesForManager(ctx.user.id)
        : listDelegates()
    ),
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
          mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          base64: z.string().min(20).max(15_000_000),
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
