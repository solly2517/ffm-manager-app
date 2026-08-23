import { jsPDF } from "jspdf";

export const ALTAMAM_REPORT_LOGO_URL = "/manus-storage/altamam-medical-logo-transparent_2d14d387.png";

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
};

const brand = {
  ink: [25, 55, 59] as const,
  teal: [27, 111, 111] as const,
  aqua: [85, 207, 204] as const,
  mint: [223, 241, 237] as const,
  mist: [246, 250, 248] as const,
  muted: [91, 108, 108] as const,
};

export function departmentMonthlySummaryFilename(month: string) {
  return `ffm-monthly-department-summary-${month}.pdf`;
}

export function departmentComparisonRows(totals: DepartmentMonthlySummaryRow[]) {
  return totals.map((row) => ({ name: row.name, members: row.memberCount, tasks: row.taskCount, workLog: row.weeklyPlanCount + row.dailyReportCount }));
}

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The Al Tamam logo could not be loaded.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The logo could not be encoded."));
    reader.onerror = () => reject(new Error("The logo could not be prepared."));
    reader.readAsDataURL(blob);
  });
}

function drawHeader(document: jsPDF, logo: string | null, monthLabel: string, pageTitle: string) {
  document.setFillColor(...brand.mist);
  document.rect(0, 0, 210, 47, "F");
  document.setFillColor(...brand.teal);
  document.rect(0, 0, 210, 4, "F");
  document.setDrawColor(...brand.mint);
  document.roundedRect(12, 10, 186, 30, 3, 3, "S");
  if (logo) document.addImage(logo, "PNG", 17, 15, 70, 17.8, undefined, "FAST");
  document.setTextColor(...brand.ink);
  document.setFontSize(14);
  document.text(pageTitle, 193, 19, { align: "right" });
  document.setTextColor(...brand.teal);
  document.setFontSize(9);
  document.text(monthLabel, 193, 27, { align: "right" });
  document.setTextColor(...brand.muted);
  document.setFontSize(7);
  document.text("Field Force Manager · Al Tamam Medical Corporation", 193, 33, { align: "right" });
}

function drawFooter(document: jsPDF, page: number) {
  document.setDrawColor(...brand.mint);
  document.line(14, 286, 196, 286);
  document.setTextColor(...brand.muted);
  document.setFontSize(7);
  document.text("Administrator-only operational report", 14, 291);
  document.text(`Page ${page}`, 196, 291, { align: "right" });
}

function setPdfFill(document: jsPDF, color: readonly [number, number, number]) {
  document.setFillColor(color[0], color[1], color[2]);
}

export async function downloadDepartmentMonthlySummaryPdf(summary: DepartmentMonthlySummary) {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const generatedAt = new Date(summary.generatedAt);
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${summary.month}-01T00:00:00.000Z`));
  const comparison = departmentComparisonRows(summary.totals);
  let logo: string | null = null;
  try { logo = await imageUrlToDataUrl(ALTAMAM_REPORT_LOGO_URL); } catch { logo = null; }
  let page = 1;
  drawHeader(document, logo, monthLabel, "Monthly Department Summary");
  document.setTextColor(...brand.muted);
  document.setFontSize(8);
  document.text(`Reporting period: ${summary.from} to ${summary.to}`, 14, 55);
  document.text(`Generated: ${generatedAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC`, 196, 55, { align: "right" });
  document.setTextColor(...brand.ink);
  document.setFontSize(9);
  document.text("Department comparison", 14, 65);
  document.setTextColor(...brand.muted);
  document.setFontSize(7.2);
  document.text("Members, tasks, and Work Log activity are shown as separate measures.", 14, 70);

  const maximum = Math.max(1, ...comparison.flatMap((row) => [row.members, row.tasks, row.workLog]));
  const barWidth = 86;
  let y = 79;
  const drawChartLegend = () => {
    const legend = [["Members", brand.teal], ["Tasks", brand.aqua], ["Work Log", brand.ink]] as const;
    let x = 14;
    legend.forEach(([label, color]) => { setPdfFill(document, color); document.roundedRect(x, y, 3, 3, 0.5, 0.5, "F"); document.setTextColor(...brand.muted); document.setFontSize(7); document.text(label, x + 5, y + 2.5); x += 29; });
    y += 8;
  };
  drawChartLegend();
  comparison.forEach((row) => {
    if (y > 258) { drawFooter(document, page); document.addPage(); page += 1; drawHeader(document, logo, monthLabel, "Department comparison"); y = 58; drawChartLegend(); }
    document.setTextColor(...brand.ink);
    document.setFontSize(8);
    document.text(row.name, 14, y + 3);
    const measures = [[row.members, brand.teal], [row.tasks, brand.aqua], [row.workLog, brand.ink]] as const;
    measures.forEach(([value, color], index) => {
      const barY = y + index * 3.4 + 5;
      document.setFillColor(231, 239, 237);
      document.roundedRect(70, barY, barWidth, 2.1, 0.6, 0.6, "F");
      setPdfFill(document, color);
      document.roundedRect(70, barY, Math.max(value ? 2.5 : 0, (value / maximum) * barWidth), 2.1, 0.6, 0.6, "F");
      document.setTextColor(...brand.muted);
      document.setFontSize(6.7);
      document.text(String(value), 160, barY + 1.7);
    });
    y += 16;
  });

  drawFooter(document, page);
  document.addPage();
  page += 1;
  drawHeader(document, logo, monthLabel, "Department detail");
  y = 58;
  document.setTextColor(...brand.muted);
  document.setFontSize(7.2);
  document.text("Member-role counts reflect current department assignments. Task and Work Log counts use the selected month.", 14, y);
  y += 9;
  const columns = ["Department", "Members", "Tasks", "Open", "Weekly", "Daily"];
  const widths = [54, 25, 25, 25, 30, 30];
  const drawTableHeader = () => {
    document.setFillColor(...brand.teal);
    document.roundedRect(14, y, 182, 8, 1, 1, "F");
    document.setTextColor(255, 255, 255);
    document.setFontSize(8);
    let x = 16;
    columns.forEach((column, index) => { document.text(column, x, y + 5.3); x += widths[index]; });
    document.setTextColor(...brand.ink);
    y += 8;
  };
  drawTableHeader();
  summary.totals.forEach((row, index) => {
    if (y > 276) { drawFooter(document, page); document.addPage(); page += 1; drawHeader(document, logo, monthLabel, "Department detail"); y = 58; drawTableHeader(); }
    if (index % 2 === 0) { document.setFillColor(...brand.mist); document.rect(14, y, 182, 8, "F"); }
    const members = `${row.memberCount} (${row.managerCount} M / ${row.delegateCount} D / ${row.warehouseHeroCount} H)`;
    const values = [row.name, members, String(row.taskCount), String(row.openTaskCount), String(row.weeklyPlanCount), String(row.dailyReportCount)];
    document.setFontSize(7.4);
    let x = 16;
    values.forEach((value, valueIndex) => { document.text(value, x, y + 5.3, { maxWidth: widths[valueIndex] - 2 }); x += widths[valueIndex]; });
    y += 8;
  });
  if (!summary.totals.length) { document.setFontSize(10); document.text("No department totals are available for this month.", 14, y + 8); }
  drawFooter(document, page);
  document.save(departmentMonthlySummaryFilename(summary.month));
}
