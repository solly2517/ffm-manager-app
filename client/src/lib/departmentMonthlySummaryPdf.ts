import { jsPDF } from "jspdf";

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

export function departmentMonthlySummaryFilename(month: string) {
  return `ffm-monthly-department-summary-${month}.pdf`;
}

export function downloadDepartmentMonthlySummaryPdf(summary: DepartmentMonthlySummary) {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const generatedAt = new Date(summary.generatedAt);
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${summary.month}-01T00:00:00.000Z`));
  let y = 18;
  document.setFillColor(9, 43, 91);
  document.rect(0, 0, 210, 34, "F");
  document.setTextColor(255, 255, 255);
  document.setFontSize(18);
  document.text("FFM Monthly Department Summary", 14, 16);
  document.setFontSize(10);
  document.text(`${monthLabel} · ${summary.from} to ${summary.to}`, 14, 24);
  document.setTextColor(22, 40, 70);
  document.setFontSize(8);
  document.text(`Generated ${generatedAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC`, 14, 42);
  document.text("Member-role counts reflect current department assignments. Task and Work Log counts use the selected month.", 14, 47);
  y = 57;
  const columns = ["Department", "Members", "Tasks", "Open", "Weekly", "Daily"];
  const widths = [54, 25, 25, 25, 30, 30];
  const drawHeader = () => {
    document.setFillColor(28, 87, 156);
    document.rect(14, y, 182, 8, "F");
    document.setTextColor(255, 255, 255);
    document.setFontSize(8);
    let x = 16;
    columns.forEach((column, index) => { document.text(column, x, y + 5.3); x += widths[index]; });
    document.setTextColor(22, 40, 70);
    y += 8;
  };
  drawHeader();
  summary.totals.forEach((row, index) => {
    if (y > 276) { document.addPage(); y = 16; drawHeader(); }
    if (index % 2 === 0) { document.setFillColor(238, 245, 252); document.rect(14, y, 182, 8, "F"); }
    const members = `${row.memberCount} (${row.managerCount} M / ${row.delegateCount} D / ${row.warehouseHeroCount} H)`;
    const values = [row.name, members, String(row.taskCount), String(row.openTaskCount), String(row.weeklyPlanCount), String(row.dailyReportCount)];
    document.setFontSize(7.4);
    let x = 16;
    values.forEach((value, valueIndex) => { document.text(value, x, y + 5.3, { maxWidth: widths[valueIndex] - 2 }); x += widths[valueIndex]; });
    y += 8;
  });
  if (!summary.totals.length) { document.setFontSize(10); document.text("No department totals are available for this month.", 14, y + 8); }
  document.setFontSize(7);
  document.setTextColor(80, 96, 120);
  document.text("FFM Manager · Administrator-only operational report", 14, 289);
  document.save(departmentMonthlySummaryFilename(summary.month));
}
