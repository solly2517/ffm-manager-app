import { describe, expect, it } from "vitest";
import { availableWeeks, buildPlanReportPrintDocument, buildWeekView, parseReportVisits, saturdayOnOrBefore, weekDates } from "./delegatePlanReport";

const names = { clientName: (id: number) => ({ 1: "Al Noor Hospital", 2: "City Clinic", 3: "Sami — Abbas Hospital" })[id] ?? `H${id}`, doctorName: (id: number) => ({ 10: "Dr A", 11: "Dr B", 12: "Dr C" })[id] ?? `D${id}` };

const schedule = weekDates("2026-09-26").map((date, index) => ({
  date,
  visits: index === 0 ? [{ date, clientId: 1, doctorId: 10 }, { date, clientId: 2, doctorId: 11 }, { date, clientId: 3, doctorId: 12 }] : [],
}));
const plan = { id: 1, delegateId: 7, weekOf: new Date("2026-09-26T12:00:00"), status: "pending", scheduleJson: JSON.stringify(schedule), createdAt: new Date("2026-09-25") };
const report = {
  id: 1, delegateId: 7, reportDate: new Date("2026-09-26T12:00:00"), status: "submitted", outcomes: "Good", challenges: null, nextActions: null,
  summary: "Doctor visits:\n2026-09-26 — Al Noor Hospital — Dr A\n2026-09-26 — Sami — Abbas Hospital — Dr C\n2026-09-26 — Other Clinic — Dr Z\n\nActivity summary:\nMet doctors",
};

describe("delegate plan vs report", () => {
  it("finds the Saturday that starts a week", () => {
    expect(saturdayOnOrBefore("2026-09-26")).toBe("2026-09-26"); // Saturday
    expect(saturdayOnOrBefore("2026-10-01")).toBe("2026-09-26"); // Thursday
    expect(saturdayOnOrBefore("2026-09-27")).toBe("2026-09-26"); // Sunday
    expect(weekDates("2026-09-26")).toEqual(["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"]);
  });
  it("parses visits out of a report summary, including hospital names containing dashes", () => {
    expect(parseReportVisits(report.summary)).toEqual([
      { hospital: "Al Noor Hospital", doctor: "Dr A" },
      { hospital: "Sami — Abbas Hospital", doctor: "Dr C" },
      { hospital: "Other Clinic", doctor: "Dr Z" },
    ]);
  });
  it("marks completed, not reported, and unplanned visits", () => {
    const view = buildWeekView({ weekStart: "2026-09-26", plans: [plan], reports: [report], ...names });
    const day = view.days[0]!;
    const byDoctor = Object.fromEntries(day.compare.map((line) => [line.doctor, line.status]));
    expect(byDoctor).toEqual({ "Dr A": "completed", "Dr B": "notReported", "Dr C": "completed", "Dr Z": "unplanned" });
    expect(view.plan?.id).toBe(1);
    expect(availableWeeks([plan], [report])).toEqual(["2026-09-26"]);
  });
  it("ignores rejected plans and builds a printable document for a single day", () => {
    const rejected = { ...plan, status: "rejected" };
    expect(buildWeekView({ weekStart: "2026-09-26", plans: [rejected], reports: [], ...names }).plan).toBeNull();
    const view = buildWeekView({ weekStart: "2026-09-26", plans: [plan], reports: [report], ...names });
    const html = buildPlanReportPrintDocument({ delegateName: "Ahmed <script>", week: view, mode: "compare", day: "2026-09-26", language: "en" });
    expect(html).toContain("Plan vs report");
    expect(html).toContain("Ahmed &lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html.match(/<section class="day">/g)?.length).toBe(1);
    const arabicWeek = buildPlanReportPrintDocument({ delegateName: "x", week: view, mode: "plan", day: null, language: "ar" });
    expect(arabicWeek).toContain('dir="rtl"');
    expect(arabicWeek.match(/<section class="day">/g)?.length).toBe(6);
  });
});
