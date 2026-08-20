import { utils, writeFileXLSX, type WorkBook } from "xlsx";

export type ReportSummary = { clients: number; tasks: number; completedTasks: number; pendingTasks: number };
export type TaskReportRow = { id: number; scheduledAt: Date; status: string; clientName?: string | null; clientCity?: string | null; delegateName?: string | null; delegateEmail?: string | null };
export type SurgeryImplantReportRow = { id: number; implantName: string; productCode?: string | null; manufacturer?: string | null; quantity: number; unitPrice: number; currency: string; lineTotal: number; notes?: string | null };
export type SurgeryReportRow = { surgeryId: number; surgeryDate: Date; status: string; procedureName: string; hospital: string; hospitalCity?: string | null; hospitalContact?: string | null; doctor: string; delegateName: string; delegateEmail?: string | null; managerName: string; managerEmail?: string | null; implants: SurgeryImplantReportRow[]; totalImplantPrice: string };

function safeCell(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function appendSheet(workbook: WorkBook, name: string, rows: Array<Record<string, unknown>>) {
  const headers = rows.length ? Object.keys(rows[0]) : ["Status"];
  const data = rows.length ? rows.map((row) => headers.map((header) => safeCell(row[header]))) : [["No records for the selected date range"]];
  const worksheet = utils.aoa_to_sheet([headers, ...data]);
  worksheet["!cols"] = headers.map((header) => ({ wch: Math.min(Math.max(header.length + 2, 14), 36) }));
  utils.book_append_sheet(workbook, worksheet, name);
}

function summaryRows(summary: ReportSummary) {
  return [
    { Metric: "Clients", Value: summary.clients },
    { Metric: "Total tasks", Value: summary.tasks },
    { Metric: "Completed tasks", Value: summary.completedTasks },
    { Metric: "Pending tasks", Value: summary.pendingTasks },
  ];
}

function taskRows(tasks: TaskReportRow[]) {
  return tasks.map((task) => ({
    "Task ID": task.id,
    "Scheduled date": new Date(task.scheduledAt).toLocaleString(),
    Status: task.status,
    Client: task.clientName || "Unassigned client",
    City: task.clientCity || "",
    Delegate: task.delegateName || task.delegateEmail || "Unassigned Delegate",
  }));
}

function surgeryRows(surgeries: SurgeryReportRow[]) {
  return surgeries.map((surgery) => ({
    "Surgery ID": surgery.surgeryId,
    "Surgery date": new Date(surgery.surgeryDate).toLocaleString(),
    Status: surgery.status,
    Procedure: surgery.procedureName,
    Hospital: surgery.hospital,
    "Hospital city": surgery.hospitalCity || "",
    "Hospital contact": surgery.hospitalContact || "",
    Doctor: surgery.doctor,
    Delegate: surgery.delegateName || surgery.delegateEmail || "Unassigned Delegate",
    Manager: surgery.managerName || surgery.managerEmail || "Manager not assigned",
    "Implant total": surgery.totalImplantPrice,
  }));
}

function implantRows(surgeries: SurgeryReportRow[]) {
  return surgeries.flatMap((surgery) => surgery.implants.map((implant) => ({
    "Surgery ID": surgery.surgeryId,
    "Surgery date": new Date(surgery.surgeryDate).toLocaleString(),
    Procedure: surgery.procedureName,
    Hospital: surgery.hospital,
    Doctor: surgery.doctor,
    Delegate: surgery.delegateName || surgery.delegateEmail || "Unassigned Delegate",
    Manager: surgery.managerName || surgery.managerEmail || "Manager not assigned",
    Implant: implant.implantName,
    "Product code": implant.productCode || "",
    Manufacturer: implant.manufacturer || "",
    Quantity: implant.quantity,
    "Unit price": implant.unitPrice,
    Currency: implant.currency,
    "Line total": implant.lineTotal,
    Notes: implant.notes || "",
  })));
}

function buildSingleSheetWorkbook(name: string, rows: Array<Record<string, unknown>>) {
  const workbook = utils.book_new();
  appendSheet(workbook, name, rows);
  return workbook;
}

export function buildReportWorkbook(summary: ReportSummary, tasks: TaskReportRow[], surgeries: SurgeryReportRow[]) {
  const workbook = utils.book_new();
  appendSheet(workbook, "Operational summary", summaryRows(summary));
  appendSheet(workbook, "Tasks", taskRows(tasks));
  appendSheet(workbook, "Surgery summary", surgeryRows(surgeries));
  appendSheet(workbook, "Implants used", implantRows(surgeries));
  return workbook;
}

export function buildOperationalSummaryWorkbook(summary: ReportSummary) { return buildSingleSheetWorkbook("Operational summary", summaryRows(summary)); }
export function buildTaskReportWorkbook(tasks: TaskReportRow[]) { return buildSingleSheetWorkbook("Tasks", taskRows(tasks)); }
export function buildSurgeryReportWorkbook(surgeries: SurgeryReportRow[]) { return buildSingleSheetWorkbook("Surgery summary", surgeryRows(surgeries)); }
export function buildImplantReportWorkbook(surgeries: SurgeryReportRow[]) { return buildSingleSheetWorkbook("Implants used", implantRows(surgeries)); }

export function downloadReportWorkbook(summary: ReportSummary, tasks: TaskReportRow[], surgeries: SurgeryReportRow[], fileStem = "ffm-operational-report") {
  writeFileXLSX(buildReportWorkbook(summary, tasks, surgeries), `${fileStem}.xlsx`);
}

export function downloadOperationalSummaryWorkbook(summary: ReportSummary) { writeFileXLSX(buildOperationalSummaryWorkbook(summary), "ffm-operational-summary.xlsx"); }
export function downloadTaskReportWorkbook(tasks: TaskReportRow[]) { writeFileXLSX(buildTaskReportWorkbook(tasks), "ffm-task-report.xlsx"); }
export function downloadSurgeryReportWorkbook(surgeries: SurgeryReportRow[]) { writeFileXLSX(buildSurgeryReportWorkbook(surgeries), "ffm-surgery-report.xlsx"); }
export function downloadImplantReportWorkbook(surgeries: SurgeryReportRow[]) { writeFileXLSX(buildImplantReportWorkbook(surgeries), "ffm-implant-detail-report.xlsx"); }
