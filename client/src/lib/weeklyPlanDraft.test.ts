import { afterEach, describe, expect, it } from "vitest";
import { clearWeeklyPlanDraft, loadWeeklyPlanDraft, saveWeeklyPlanDraft } from "./weeklyPlanDraft";

const entries = [{ date: "2026-08-22", hospitals: [{ clientId: "4", doctorIds: ["8"] }] }];

describe("weekly plan drafts", () => {
  afterEach(() => window.localStorage.clear());

  it("saves and restores a draft only for the same user and selected week", () => {
    const draft = saveWeeklyPlanDraft(44, "2026-08-22", entries);
    expect(draft?.weekOf).toBe("2026-08-22");
    expect(loadWeeklyPlanDraft(44, "2026-08-22")?.entries).toEqual(entries);
    expect(loadWeeklyPlanDraft(45, "2026-08-22")).toBeNull();
    expect(loadWeeklyPlanDraft(44, "2026-08-29")).toBeNull();
  });

  it("clears a submitted week draft without affecting another week", () => {
    saveWeeklyPlanDraft(44, "2026-08-22", entries);
    saveWeeklyPlanDraft(44, "2026-08-29", entries);
    clearWeeklyPlanDraft(44, "2026-08-22");
    expect(loadWeeklyPlanDraft(44, "2026-08-22")).toBeNull();
    expect(loadWeeklyPlanDraft(44, "2026-08-29")?.entries).toEqual(entries);
  });
});
