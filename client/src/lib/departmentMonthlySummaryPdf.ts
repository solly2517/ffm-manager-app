import { jsPDF } from "jspdf";

export const ALTAMAM_REPORT_LOGO_URL = "/manus-storage/altamam-medical-logo-transparent_2d14d387.png";
export const FFM_ARABIC_PDF_FONT_URL = "/manus-storage/ffm-dejavu-sans_3bf46f72.ttf";
export type PdfLanguage = "en" | "ar";

export type DepartmentMonthlySummaryRow = {
  name: string;
  isActive: boolean;
  memberCount: number;
  managerCount: number;
  delegateCount: number;
  warehouseHeroCount: number;
  taskCount: number;
  openTaskCount: number;
  weeklyPlanCount: number;
  dailyReportCount: number;
};

export type DepartmentMonthlySummary = {
  month: string;
  from: string;
  to: string;
  generatedAt: Date | string;
  totals: DepartmentMonthlySummaryRow[];
  commentary?: string | null;
};

const brand = {
  ink: [25, 55, 59] as const,
  teal: [27, 111, 111] as const,
  aqua: [85, 207, 204] as const,
  mint: [223, 241, 237] as const,
  mist: [246, 250, 248] as const,
  muted: [91, 108, 108] as const,
};

const copy = {
  en: {
    brand: "Field Force Manager · Al Tamam Medical Corporation", adminOnly: "Administrator-only operational report", page: "Page", executive: "Executive Summary", comparison: "Department Comparison", detail: "Department Detail", reportingPeriod: "Reporting period", generated: "Generated", briefing: "Monthly performance briefing", distinct: "Department staffing, task volume, and Work Log activity remain separate measures.", currentMembers: "Current members", monthlyTasks: "Monthly tasks", workLog: "Work Log activity", top: "Top-performing departments", taskVolume: "Task volume", noData: "no department data", caveat: "Current member-role counts reflect present department assignments, not historical staffing for the reporting period.", commentary: "Administrator commentary", comparisonDescription: "Members, tasks, and Work Log activity are shown as separate measures with value labels.", members: "Members", tasks: "Tasks", open: "Open", weekly: "Weekly", daily: "Daily", department: "Department", noTotals: "No department totals are available for this month.", entries: "entries",
  },
  ar: {
    brand: "إدارة القوى الميدانية · شركة التمام الطبية", adminOnly: "تقرير عمليات مخصص لمسؤول النظام", page: "الصفحة", executive: "الملخص التنفيذي", comparison: "مقارنة الأقسام", detail: "تفاصيل الأقسام", reportingPeriod: "فترة التقرير", generated: "تاريخ الإنشاء", briefing: "إحاطة الأداء الشهرية", distinct: "يبقى عدد أعضاء القسم وحجم المهام ونشاط سجل العمل مقاييس منفصلة.", currentMembers: "الأعضاء الحاليون", monthlyTasks: "مهام الشهر", workLog: "نشاط سجل العمل", top: "الأقسام الأعلى أداءً", taskVolume: "حجم المهام", noData: "لا توجد بيانات للأقسام", caveat: "تعكس أعداد أدوار الأعضاء التعيينات الحالية، وليست سجلًا تاريخيًا للتوظيف ضمن فترة التقرير.", commentary: "تعليق مسؤول النظام", comparisonDescription: "يُعرض الأعضاء والمهام ونشاط سجل العمل كمقاييس منفصلة مع تسميات للقيم.", members: "الأعضاء", tasks: "المهام", open: "مفتوحة", weekly: "أسبوعي", daily: "يومي", department: "القسم", noTotals: "لا تتوفر إجماليات للأقسام لهذا الشهر.", entries: "سجلًا",
  },
} as const;

type PdfCopy = { [Key in keyof typeof copy.en]: string };

export function departmentMonthlySummaryFilename(month: string, language: PdfLanguage = "en") {
  return `ffm-monthly-department-summary-${month}${language === "ar" ? "-ar" : ""}.pdf`;
}

export function departmentComparisonRows(totals: DepartmentMonthlySummaryRow[]) {
  return totals.map((row) => ({ name: row.name, members: row.memberCount, tasks: row.taskCount, workLog: row.weeklyPlanCount + row.dailyReportCount }));
}

export function departmentExecutiveSummary(totals: DepartmentMonthlySummaryRow[]) {
  const byTasks = [...totals].sort((left, right) => right.taskCount - left.taskCount || left.name.localeCompare(right.name));
  const byWorkLog = [...totals].sort((left, right) => (right.weeklyPlanCount + right.dailyReportCount) - (left.weeklyPlanCount + left.dailyReportCount) || left.name.localeCompare(right.name));
  return {
    memberCount: totals.reduce((sum, row) => sum + row.memberCount, 0),
    taskCount: totals.reduce((sum, row) => sum + row.taskCount, 0),
    workLogCount: totals.reduce((sum, row) => sum + row.weeklyPlanCount + row.dailyReportCount, 0),
    topTaskDepartment: byTasks[0] ?? null,
    topWorkLogDepartment: byWorkLog[0] ?? null,
  };
}

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The report logo could not be loaded.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The report logo could not be encoded."));
    reader.onerror = () => reject(new Error("The report logo could not be prepared."));
    reader.readAsDataURL(blob);
  });
}

function setFill(document: jsPDF, color: readonly [number, number, number]) { document.setFillColor(color[0], color[1], color[2]); }
function setText(document: jsPDF, color: readonly [number, number, number]) { document.setTextColor(color[0], color[1], color[2]); }

function text(document: jsPDF, value: string, x: number, y: number, language: PdfLanguage, options: { align?: "left" | "center" | "right"; maxWidth?: number } = {}) {
  const enhanced = document as jsPDF & { processArabic?: (input: string) => string };
  const output = language === "ar" && enhanced.processArabic ? enhanced.processArabic(value) : value;
  document.text(output, x, y, { ...options, align: language === "ar" ? (options.align ?? "right") : options.align });
}

async function useArabicFont(document: jsPDF) {
  const response = await fetch(FFM_ARABIC_PDF_FONT_URL);
  if (!response.ok) throw new Error("The Arabic report font could not be loaded.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    for (let offset = 0; offset < chunk.length; offset += 1) binary += String.fromCharCode(chunk[offset]);
  }
  const enhanced = document as jsPDF & { addFileToVFS: (name: string, data: string) => void; addFont: (name: string, family: string, style: string) => void; setR2L?: (enabled: boolean) => void };
  enhanced.addFileToVFS("ffm-dejavu-sans.ttf", btoa(binary));
  enhanced.addFont("ffm-dejavu-sans.ttf", "FFMArabic", "normal");
  document.setFont("FFMArabic", "normal");
  enhanced.setR2L?.(true);
}

function drawHeader(document: jsPDF, logo: string | null, monthLabel: string, title: string, language: PdfLanguage, labels: PdfCopy) {
  document.setFillColor(...brand.mist); document.rect(0, 0, 210, 47, "F");
  setFill(document, brand.teal); document.rect(0, 0, 210, 4, "F");
  document.setDrawColor(...brand.mint); document.roundedRect(12, 10, 186, 30, 3, 3, "S");
  if (logo) document.addImage(logo, "PNG", 17, 15, 70, 17.8, undefined, "FAST");
  setText(document, brand.ink); document.setFontSize(14); text(document, title, 193, 19, language);
  setText(document, brand.teal); document.setFontSize(9); text(document, monthLabel, 193, 27, language);
  setText(document, brand.muted); document.setFontSize(7); text(document, labels.brand, 193, 33, language);
}

function drawFooter(document: jsPDF, page: number, language: PdfLanguage, labels: PdfCopy) {
  document.setDrawColor(...brand.mint); document.line(14, 286, 196, 286);
  setText(document, brand.muted); document.setFontSize(7);
  text(document, labels.adminOnly, language === "ar" ? 196 : 14, 291, language);
  text(document, `${labels.page} ${page}`, language === "ar" ? 14 : 196, 291, language, { align: language === "ar" ? "left" : "right" });
}

function metric(document: jsPDF, x: number, y: number, label: string, value: number, accent: readonly [number, number, number], language: PdfLanguage) {
  document.setFillColor(255, 255, 255); document.setDrawColor(...brand.mint); document.roundedRect(x, y, 55, 26, 2, 2, "FD");
  setFill(document, accent); document.roundedRect(x + (language === "ar" ? 48 : 4), y + 5, 3, 16, 1, 1, "F");
  setText(document, brand.muted); document.setFontSize(7); text(document, label, language === "ar" ? x + 44 : x + 11, y + 10, language);
  setText(document, brand.ink); document.setFontSize(16); text(document, String(value), language === "ar" ? x + 44 : x + 11, y + 19, language);
}

export async function downloadDepartmentMonthlySummaryPdf(summary: DepartmentMonthlySummary, language: PdfLanguage = "en") {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  if (language === "ar") await useArabicFont(document);
  const labels = copy[language];
  const generatedAt = new Date(summary.generatedAt);
  const monthLabel = new Intl.DateTimeFormat(language === "ar" ? "ar-EG-u-ca-gregory" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${summary.month}-01T00:00:00.000Z`));
  const comparison = departmentComparisonRows(summary.totals);
  const executive = departmentExecutiveSummary(summary.totals);
  let logo: string | null = null;
  try { logo = await imageUrlToDataUrl(ALTAMAM_REPORT_LOGO_URL); } catch { logo = null; }
  let page = 1;

  drawHeader(document, logo, monthLabel, labels.executive, language, labels);
  setText(document, brand.muted); document.setFontSize(8);
  text(document, `${labels.reportingPeriod}: ${summary.from} ${language === "ar" ? "إلى" : "to"} ${summary.to}`, language === "ar" ? 196 : 14, 55, language);
  text(document, `${labels.generated}: ${generatedAt.toLocaleString(language === "ar" ? "ar-EG" : "en-GB", { timeZone: "UTC" })} UTC`, language === "ar" ? 14 : 196, 55, language, { align: language === "ar" ? "left" : "right" });
  setText(document, brand.ink); document.setFontSize(14); text(document, labels.briefing, language === "ar" ? 196 : 14, 69, language);
  setText(document, brand.muted); document.setFontSize(8); text(document, labels.distinct, language === "ar" ? 196 : 14, 76, language, { maxWidth: 178 });
  metric(document, 14, 86, labels.currentMembers, executive.memberCount, brand.teal, language);
  metric(document, 77, 86, labels.monthlyTasks, executive.taskCount, brand.aqua, language);
  metric(document, 140, 86, labels.workLog, executive.workLogCount, brand.ink, language);
  setText(document, brand.ink); document.setFontSize(10); text(document, labels.top, language === "ar" ? 196 : 14, 128, language);
  setText(document, brand.muted); document.setFontSize(8);
  text(document, executive.topTaskDepartment ? `${labels.taskVolume}: ${executive.topTaskDepartment.name} (${executive.topTaskDepartment.taskCount} ${labels.tasks})` : `${labels.taskVolume}: ${labels.noData}`, language === "ar" ? 196 : 14, 136, language);
  text(document, executive.topWorkLogDepartment ? `${labels.workLog}: ${executive.topWorkLogDepartment.name} (${executive.topWorkLogDepartment.weeklyPlanCount + executive.topWorkLogDepartment.dailyReportCount} ${labels.entries})` : `${labels.workLog}: ${labels.noData}`, language === "ar" ? 196 : 14, 143, language);
  document.setFontSize(7.2); text(document, labels.caveat, language === "ar" ? 196 : 14, 154, language, { maxWidth: 178 });
  if (summary.commentary) {
    setText(document, brand.ink); document.setFontSize(10); text(document, labels.commentary, language === "ar" ? 196 : 14, 170, language);
    setText(document, brand.muted); document.setFontSize(8);
    const lines = document.splitTextToSize(summary.commentary, 178) as string[];
    text(document, lines.slice(0, 16).join("\n"), language === "ar" ? 196 : 14, 178, language, { maxWidth: 178 });
  }
  drawFooter(document, page, language, labels);

  document.addPage(); page += 1;
  drawHeader(document, logo, monthLabel, labels.comparison, language, labels);
  setText(document, brand.muted); document.setFontSize(7.2); text(document, labels.comparisonDescription, language === "ar" ? 196 : 14, 57, language, { maxWidth: 178 });
  const maximum = Math.max(1, ...comparison.flatMap((row) => [row.members, row.tasks, row.workLog]));
  let y = 66;
  const drawLegend = () => {
    const legend = [[labels.members, brand.teal], [labels.tasks, brand.aqua], [labels.workLog, brand.ink]] as const;
    let x = 14;
    legend.forEach(([label, color]) => { setFill(document, color); document.roundedRect(x, y, 3, 3, 0.5, 0.5, "F"); setText(document, brand.muted); document.setFontSize(7); text(document, label, language === "ar" ? x + 25 : x + 5, y + 2.5, language); x += 29; });
    y += 8;
  };
  drawLegend();
  comparison.forEach((row) => {
    if (y > 258) { drawFooter(document, page, language, labels); document.addPage(); page += 1; drawHeader(document, logo, monthLabel, labels.comparison, language, labels); y = 58; drawLegend(); }
    setText(document, brand.ink); document.setFontSize(8); text(document, row.name, language === "ar" ? 196 : 14, y + 3, language);
    ([[row.members, brand.teal], [row.tasks, brand.aqua], [row.workLog, brand.ink]] as const).forEach(([value, color], index) => {
      const barY = y + index * 3.4 + 5;
      document.setFillColor(231, 239, 237); document.roundedRect(70, barY, 86, 2.1, 0.6, 0.6, "F");
      setFill(document, color); document.roundedRect(70, barY, Math.max(value ? 2.5 : 0, (value / maximum) * 86), 2.1, 0.6, 0.6, "F");
      setText(document, brand.muted); document.setFontSize(6.7); text(document, String(value), language === "ar" ? 66 : 160, barY + 1.7, language, { align: language === "ar" ? "left" : "right" });
    });
    y += 16;
  });
  drawFooter(document, page, language, labels);

  document.addPage(); page += 1;
  drawHeader(document, logo, monthLabel, labels.detail, language, labels);
  y = 58;
  setText(document, brand.muted); document.setFontSize(7.2); text(document, labels.caveat, language === "ar" ? 196 : 14, y, language, { maxWidth: 178 }); y += 9;
  const columns = [labels.department, labels.members, labels.tasks, labels.open, labels.weekly, labels.daily];
  const widths = [54, 25, 25, 25, 30, 30];
  const drawTableHeader = () => {
    setFill(document, brand.teal); document.roundedRect(14, y, 182, 8, 1, 1, "F"); document.setTextColor(255, 255, 255); document.setFontSize(8);
    let x = 16; columns.forEach((column, index) => { text(document, column, language === "ar" ? x + widths[index] - 2 : x, y + 5.3, language); x += widths[index]; });
    setText(document, brand.ink); y += 8;
  };
  drawTableHeader();
  summary.totals.forEach((row, index) => {
    if (y > 276) { drawFooter(document, page, language, labels); document.addPage(); page += 1; drawHeader(document, logo, monthLabel, labels.detail, language, labels); y = 58; drawTableHeader(); }
    if (index % 2 === 0) { document.setFillColor(...brand.mist); document.rect(14, y, 182, 8, "F"); }
    const members = `${row.memberCount} (${row.managerCount} M / ${row.delegateCount} D / ${row.warehouseHeroCount} H)`;
    const values = [row.name, members, String(row.taskCount), String(row.openTaskCount), String(row.weeklyPlanCount), String(row.dailyReportCount)];
    document.setFontSize(7.4); let x = 16;
    values.forEach((value, indexValue) => { text(document, value, language === "ar" ? x + widths[indexValue] - 2 : x, y + 5.3, language, { maxWidth: widths[indexValue] - 2 }); x += widths[indexValue]; });
    y += 8;
  });
  if (!summary.totals.length) { document.setFontSize(10); text(document, labels.noTotals, language === "ar" ? 196 : 14, y + 8, language); }
  drawFooter(document, page, language, labels);
  document.save(departmentMonthlySummaryFilename(summary.month, language));
}
