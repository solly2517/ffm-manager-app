import { parseWeeklySchedule } from "@shared/workLogRules";

export type ViewLanguage = "en" | "ar";
export type PrintMode = "plan" | "report" | "compare";

export type VisitLine = { hospital: string; doctor: string };
export type CompareStatus = "completed" | "notReported" | "unplanned";
export type CompareLine = VisitLine & { status: CompareStatus };

export type PlanLike = {
  id: number;
  delegateId: number | null;
  weekOf: Date | string;
  status: string;
  scheduleJson: string;
  objectives?: string | null;
  supportNeeded?: string | null;
  createdAt: Date | string;
};

export type ReportLike = {
  id: number;
  delegateId: number | null;
  reportDate: Date | string;
  summary: string;
  outcomes: string;
  challenges?: string | null;
  nextActions?: string | null;
  status: string;
};

export type DayView = {
  date: string;
  planned: VisitLine[];
  reported: VisitLine[];
  compare: CompareLine[];
  reportTexts: { summary: string; outcomes: string; challenges: string; nextActions: string; status: string }[];
};

export type WeekView = {
  weekStart: string;
  plan: PlanLike | null;
  days: DayView[];
};

const isoDay = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const keyOf = (line: VisitLine) => `${norm(line.hospital)}|${norm(line.doctor)}`;

/** Saturday on or before the given ISO date (the Delegate workweek starts on Saturday). */
export function saturdayOnOrBefore(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const back = (d.getUTCDay() + 1) % 7; // Sat=6 -> 0, Sun=0 -> 1, ... Fri=5 -> 6
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

export function weekDates(weekStart: string) {
  return Array.from({ length: 6 }, (_, index) => {
    const d = new Date(`${weekStart}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + index);
    return d.toISOString().slice(0, 10);
  });
}

/** Daily reports store their visits as "Doctor visits:\n<date> — <hospital> — <doctor>" inside `summary`. */
export function parseReportVisits(summary: string): VisitLine[] {
  const match = summary.match(/Doctor visits:\n([\s\S]*?)(?:\n\nActivity summary:|$)/);
  if (!match) return [];
  return match[1]!
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const parts = line.split(" — ");
      if (parts.length < 3) return [];
      return [{ hospital: parts.slice(1, -1).join(" — ").trim(), doctor: parts[parts.length - 1]!.trim() }];
    });
}

export function reportActivityText(summary: string) {
  const index = summary.indexOf("Activity summary:\n");
  return index >= 0 ? summary.slice(index + "Activity summary:\n".length).trim() : summary.trim();
}

export function availableWeeks(plans: PlanLike[], reports: ReportLike[]) {
  const weeks = new Set<string>();
  for (const plan of plans) weeks.add(saturdayOnOrBefore(isoDay(plan.weekOf)));
  for (const report of reports) weeks.add(saturdayOnOrBefore(isoDay(report.reportDate)));
  return Array.from(weeks).sort((a, b) => b.localeCompare(a));
}

export function buildWeekView(input: {
  weekStart: string;
  plans: PlanLike[];
  reports: ReportLike[];
  clientName: (id: number) => string;
  doctorName: (id: number) => string;
}): WeekView {
  const candidates = input.plans
    .filter((plan) => plan.status !== "rejected" && saturdayOnOrBefore(isoDay(plan.weekOf)) === input.weekStart)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const plan = candidates[0] ?? null;
  const schedule = plan ? parseWeeklySchedule(plan.scheduleJson) : [];

  const days = weekDates(input.weekStart).map((date): DayView => {
    const planned = (schedule.find((day) => day.date === date)?.visits ?? []).map((visit) => ({
      hospital: input.clientName(visit.clientId),
      doctor: input.doctorName(visit.doctorId),
    }));
    const dayReports = input.reports.filter((report) => isoDay(report.reportDate) === date);
    const reported = dayReports.flatMap((report) => parseReportVisits(report.summary));

    const reportedKeys = new Set(reported.map(keyOf));
    const plannedKeys = new Set(planned.map(keyOf));
    const compare: CompareLine[] = [
      ...planned.map((line) => ({ ...line, status: reportedKeys.has(keyOf(line)) ? ("completed" as const) : ("notReported" as const) })),
      ...reported.filter((line) => !plannedKeys.has(keyOf(line))).map((line) => ({ ...line, status: "unplanned" as const })),
    ];
    return {
      date,
      planned,
      reported,
      compare,
      reportTexts: dayReports.map((report) => ({
        summary: reportActivityText(report.summary),
        outcomes: report.outcomes,
        challenges: report.challenges || "",
        nextActions: report.nextActions || "",
        status: report.status,
      })),
    };
  });
  return { weekStart: input.weekStart, plan, days };
}

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);

const labels = {
  en: {
    eyebrow: "FFM / FIELD PERFORMANCE",
    plan: "Weekly plan",
    report: "Daily report",
    compare: "Plan vs report",
    delegate: "Delegate",
    week: "Week",
    day: "Day",
    hospital: "Hospital",
    doctor: "Doctor",
    status: "Status",
    completed: "Completed",
    notReported: "Planned, not reported",
    unplanned: "Reported, not planned",
    noPlan: "No weekly plan was submitted for this week.",
    noVisitsPlanned: "No visits planned.",
    noReport: "No daily report submitted.",
    activity: "Activity summary",
    outcomes: "Outcomes achieved",
    challenges: "Challenges",
    nextActions: "Next actions",
    objectives: "Weekly objectives",
    support: "Support needed",
    planStatus: "Plan status",
    printed: "Printed",
    footer: "Generated from FFM Manager. Comparison matches hospital and doctor names.",
  },
  ar: {
    eyebrow: "FFM / الأداء الميداني",
    plan: "الخطة الأسبوعية",
    report: "التقرير اليومي",
    compare: "الخطة مقابل التقرير",
    delegate: "المندوب",
    week: "الأسبوع",
    day: "اليوم",
    hospital: "المستشفى",
    doctor: "الطبيب",
    status: "الحالة",
    completed: "تمت الزيارة",
    notReported: "مخطط ولم يُسجَّل",
    unplanned: "مسجَّل وغير مخطط",
    noPlan: "لم تُقدَّم خطة أسبوعية لهذا الأسبوع.",
    noVisitsPlanned: "لا توجد زيارات مخططة.",
    noReport: "لم يُقدَّم تقرير يومي.",
    activity: "ملخص النشاط",
    outcomes: "النتائج المحققة",
    challenges: "التحديات",
    nextActions: "الإجراءات القادمة",
    objectives: "أهداف الأسبوع",
    support: "الدعم المطلوب",
    planStatus: "حالة الخطة",
    printed: "تاريخ الطباعة",
    footer: "صادر من FFM Manager. تعتمد المقارنة على مطابقة أسماء المستشفيات والأطباء.",
  },
};

export function formatDayHeading(date: string, language: ViewLanguage) {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function buildPlanReportPrintDocument(input: {
  delegateName: string;
  week: WeekView;
  mode: PrintMode;
  /** null = the whole week, otherwise a single ISO date */
  day: string | null;
  language: ViewLanguage;
}) {
  const { delegateName, week, mode, day, language } = input;
  const l = labels[language];
  const rtl = language === "ar";
  const days = day ? week.days.filter((item) => item.date === day) : week.days;
  const weekLabel = `${week.weekStart} → ${week.days[week.days.length - 1]?.date ?? ""}`;
  const title = mode === "plan" ? l.plan : mode === "report" ? l.report : l.compare;
  const statusText = (status: CompareStatus) => (status === "completed" ? l.completed : status === "notReported" ? l.notReported : l.unplanned);

  const visitTable = (rows: VisitLine[], empty: string) =>
    rows.length
      ? `<table><thead><tr><th>#</th><th>${l.hospital}</th><th>${l.doctor}</th></tr></thead><tbody>${rows
          .map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.hospital)}</td><td>${escapeHtml(row.doctor)}</td></tr>`)
          .join("")}</tbody></table>`
      : `<p class="empty">${empty}</p>`;

  const compareTable = (rows: CompareLine[]) =>
    rows.length
      ? `<table><thead><tr><th>#</th><th>${l.hospital}</th><th>${l.doctor}</th><th>${l.status}</th></tr></thead><tbody>${rows
          .map((row, index) => `<tr class="${row.status}"><td>${index + 1}</td><td>${escapeHtml(row.hospital)}</td><td>${escapeHtml(row.doctor)}</td><td>${statusText(row.status)}</td></tr>`)
          .join("")}</tbody></table>`
      : `<p class="empty">${l.noVisitsPlanned}</p>`;

  const reportBlocks = (item: DayView) =>
    item.reportTexts.length
      ? item.reportTexts
          .map(
            (text) =>
              `<div class="report"><p><strong>${l.activity}:</strong> ${escapeHtml(text.summary)}</p><p><strong>${l.outcomes}:</strong> ${escapeHtml(text.outcomes)}</p>${
                text.challenges ? `<p><strong>${l.challenges}:</strong> ${escapeHtml(text.challenges)}</p>` : ""
              }${text.nextActions ? `<p><strong>${l.nextActions}:</strong> ${escapeHtml(text.nextActions)}</p>` : ""}</div>`
          )
          .join("")
      : "";

  const daySections = days
    .map((item) => {
      let body = "";
      if (mode === "plan") body = visitTable(item.planned, l.noVisitsPlanned);
      else if (mode === "report") body = `${visitTable(item.reported, l.noReport)}${reportBlocks(item)}`;
      else body = `${compareTable(item.compare)}${reportBlocks(item)}`;
      return `<section class="day"><h2>${escapeHtml(formatDayHeading(item.date, language))}</h2>${body}</section>`;
    })
    .join("");

  const planMeta =
    mode !== "report" && week.plan
      ? `<div class="meta-block"><p><strong>${l.planStatus}:</strong> ${escapeHtml(week.plan.status)}</p>${
          week.plan.objectives ? `<p><strong>${l.objectives}:</strong> ${escapeHtml(week.plan.objectives)}</p>` : ""
        }${week.plan.supportNeeded ? `<p><strong>${l.support}:</strong> ${escapeHtml(week.plan.supportNeeded)}</p>` : ""}</div>`
      : mode !== "report"
        ? `<p class="empty">${l.noPlan}</p>`
        : "";

  const printedAt = new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date());

  return `<!doctype html><html dir="${rtl ? "rtl" : "ltr"}" lang="${language}"><head><meta charset="utf-8"><title>FFM ${escapeHtml(title)} — ${escapeHtml(delegateName)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:${
    rtl ? "Tahoma, Arial, sans-serif" : "Arial, Helvetica, sans-serif"
  };direction:${rtl ? "rtl" : "ltr"};text-align:${rtl ? "right" : "left"};color:#142033;font-size:11px;line-height:1.45;margin:0}header{border-bottom:3px solid #1168cf;padding-bottom:10px;margin-bottom:14px}.eyebrow{color:#1168cf;letter-spacing:.12em;font-size:9px;font-weight:700;margin:0 0 4px}h1{margin:0 0 6px;font-size:21px}h2{font-size:13px;margin:0 0 6px;color:#0c4e99}.meta{display:flex;gap:24px;flex-wrap:wrap;font-size:11px}.meta-block{border:1px solid #cfd9e5;background:#f8fbff;padding:8px;margin-bottom:12px}.meta-block p{margin:2px 0}.day{border:1px solid #cfd9e5;padding:10px;margin-bottom:10px;page-break-inside:avoid}table{width:100%;border-collapse:collapse;margin:4px 0 6px}th{background:#eaf3ff;color:#0c4e99;text-align:${
    rtl ? "right" : "left"
  };font-size:9px}th,td{border:1px solid #cfd9e5;padding:5px;vertical-align:top}tr.completed td:last-child{color:#0a7a3d;font-weight:700}tr.notReported td:last-child{color:#b45309;font-weight:700}tr.unplanned td:last-child{color:#1168cf;font-weight:700}.empty{color:#637287;margin:4px 0}.report{border:1px solid #cfd9e5;background:#f8fbff;padding:8px;margin-top:6px;white-space:pre-wrap}.report p{margin:3px 0}footer{border-top:1px solid #cfd9e5;margin-top:14px;padding-top:6px;color:#637287;font-size:8px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header><p class="eyebrow">${l.eyebrow}</p><h1>${escapeHtml(title)}</h1><div class="meta"><span><strong>${l.delegate}:</strong> ${escapeHtml(delegateName)}</span><span><strong>${l.week}:</strong> ${escapeHtml(weekLabel)}</span>${
    day ? `<span><strong>${l.day}:</strong> ${escapeHtml(formatDayHeading(day, language))}</span>` : ""
  }<span><strong>${l.printed}:</strong> ${escapeHtml(printedAt)}</span></div></header>${planMeta}${daySections}<footer>${l.footer}</footer></body></html>`;
}
