import type { ScheduledPlanDay } from "./workLogSchedule";

type WeeklyPlanDraft = {
  version: 1;
  weekOf: string;
  entries: ScheduledPlanDay[];
  savedAt: string;
};

const keyFor = (userId: number, weekOf: string) => `ffm:weekly-plan-draft:v1:${userId}:${weekOf}`;

function isValidDraft(value: unknown, weekOf: string): value is WeeklyPlanDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<WeeklyPlanDraft>;
  return draft.version === 1 && draft.weekOf === weekOf && Array.isArray(draft.entries) && typeof draft.savedAt === "string";
}

export function loadWeeklyPlanDraft(userId: number | undefined, weekOf: string) {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(userId, weekOf));
    if (!raw) return null;
    const draft: unknown = JSON.parse(raw);
    return isValidDraft(draft, weekOf) ? draft : null;
  } catch {
    return null;
  }
}

export function saveWeeklyPlanDraft(userId: number | undefined, weekOf: string, entries: ScheduledPlanDay[]) {
  if (!userId || typeof window === "undefined") return null;
  const savedAt = new Date().toISOString();
  const draft: WeeklyPlanDraft = { version: 1, weekOf, entries, savedAt };
  try {
    window.localStorage.setItem(keyFor(userId, weekOf), JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
}

export function clearWeeklyPlanDraft(userId: number | undefined, weekOf: string) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(userId, weekOf));
  } catch {
    // Keep workflow usable when browser storage is unavailable.
  }
}
