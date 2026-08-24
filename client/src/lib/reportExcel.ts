import { utils, writeFileXLSX, type WorkBook } from "xlsx";

export type ReportSummary = { clients: number; tasks: number; completedTasks: number; pendingTasks: number };
export type TaskReportRow = { id: number; scheduledAt: Date; status: string; clientName?: string | null; clientCity?: string | null; delegateName?: string | null; delegateEmail?: string | null };
export type SurgeryImplantReportRow = { id: number; implantName: string; productCode?: string | null; manufacturer?: string | null; quantity: number; unitPrice: number; currency: string; lineTotal: number; notes?: string | null };
export type SurgeryReportRow = { surgeryId: number; surgeryDate: Date; status: string; procedureName: string; hospital: string; hospitalCity?: string | null; hospitalContact?: string | null; doctor: string; delegateName: string; delegateEmail?: string | null; managerName: string; managerEmail?: string | null; implants: SurgeryImplantReportRow[]; totalImplantPrice: string };
export type ExportLanguage = "en" | "ar";

function safeCell(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function appendSheet(workbook: WorkBook, name: string, rows: Array<Record<string, unknown>>, language: ExportLanguage) {
  const headers = rows.length ? Object.keys(rows[0]) : [language === "ar" ? "الحالة" : "Status"];
  const data = rows.length ? rows.map((row) => headers.map((header) => safeCell(row[header]))) : [[language === "ar" ? "لا توجد سجلات للنطاق الزمني المحدد" : "No records for the selected date range"]];
  const worksheet = utils.aoa_to_sheet([headers, ...data]);
  worksheet["!cols"] = headers.map((header) => ({ wch: Math.min(Math.max(header.length + 2, 14), 36) }));
  (worksheet as typeof worksheet & { "!views": Array<{ rightToLeft: boolean }> })["!views"] = [{ rightToLeft: language === "ar" }];
  utils.book_append_sheet(workbook, worksheet, name);
}

function summaryRows(summary: ReportSummary, language: ExportLanguage) {
  if (language === "ar") return [
    { "المؤشر": "العملاء", "القيمة": summary.clients },
    { "المؤشر": "إجمالي المهام", "القيمة": summary.tasks },
    { "المؤشر": "المهام المكتملة", "القيمة": summary.completedTasks },
    { "المؤشر": "المهام المعلقة", "القيمة": summary.pendingTasks },
  ];
  return [
    { Metric: "Clients", Value: summary.clients },
    { Metric: "Total tasks", Value: summary.tasks },
    { Metric: "Completed tasks", Value: summary.completedTasks },
    { Metric: "Pending tasks", Value: summary.pendingTasks },
  ];
}

function taskRows(tasks: TaskReportRow[], language: ExportLanguage) {
  if (language === "ar") return tasks.map((task) => ({
    "رقم المهمة": task.id,
    "التاريخ المجدول": new Date(task.scheduledAt).toLocaleString("ar-SA"),
    "الحالة": task.status,
    "العميل": task.clientName || "عميل غير معيّن",
    "المدينة": task.clientCity || "",
    "المندوب": task.delegateName || task.delegateEmail || "مندوب غير معيّن",
  }));
  return tasks.map((task) => ({
    "Task ID": task.id,
    "Scheduled date": new Date(task.scheduledAt).toLocaleString(),
    Status: task.status,
    Client: task.clientName || "Unassigned client",
    City: task.clientCity || "",
    Delegate: task.delegateName || task.delegateEmail || "Unassigned Delegate",
  }));
}

function surgeryRows(surgeries: SurgeryReportRow[], language: ExportLanguage) {
  if (language === "ar") return surgeries.map((surgery) => ({
    "رقم العملية": surgery.surgeryId,
    "تاريخ العملية": new Date(surgery.surgeryDate).toLocaleString("ar-SA"),
    "الحالة": surgery.status,
    "الإجراء": surgery.procedureName,
    "المستشفى": surgery.hospital,
    "مدينة المستشفى": surgery.hospitalCity || "",
    "جهة اتصال المستشفى": surgery.hospitalContact || "",
    "الطبيب": surgery.doctor,
    "المندوب": surgery.delegateName || surgery.delegateEmail || "مندوب غير معيّن",
    "المدير": surgery.managerName || surgery.managerEmail || "مدير غير معيّن",
    "إجمالي الغرسات": surgery.totalImplantPrice,
  }));
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

function implantRows(surgeries: SurgeryReportRow[], language: ExportLanguage) {
  if (language === "ar") return surgeries.flatMap((surgery) => surgery.implants.map((implant) => ({
    "رقم العملية": surgery.surgeryId,
    "تاريخ العملية": new Date(surgery.surgeryDate).toLocaleString("ar-SA"),
    "الإجراء": surgery.procedureName,
    "المستشفى": surgery.hospital,
    "الطبيب": surgery.doctor,
    "المندوب": surgery.delegateName || surgery.delegateEmail || "مندوب غير معيّن",
    "المدير": surgery.managerName || surgery.managerEmail || "مدير غير معيّن",
    "الغرسة": implant.implantName,
    "رمز المنتج": implant.productCode || "",
    "الشركة المصنعة": implant.manufacturer || "",
    "الكمية": implant.quantity,
    "سعر الوحدة": implant.unitPrice,
    "العملة": implant.currency,
    "إجمالي البند": implant.lineTotal,
    "ملاحظات": implant.notes || "",
  })));
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

function buildSingleSheetWorkbook(name: string, rows: Array<Record<string, unknown>>, language: ExportLanguage) {
  const workbook = utils.book_new();
  appendSheet(workbook, name, rows, language);
  return workbook;
}

export function buildReportWorkbook(summary: ReportSummary, tasks: TaskReportRow[], surgeries: SurgeryReportRow[], language: ExportLanguage = "en") {
  const workbook = utils.book_new();
  const names = language === "ar" ? ["ملخص العمليات", "المهام", "ملخص العمليات الجراحية", "الغرسات المستخدمة"] : ["Operational summary", "Tasks", "Surgery summary", "Implants used"];
  appendSheet(workbook, names[0], summaryRows(summary, language), language);
  appendSheet(workbook, names[1], taskRows(tasks, language), language);
  appendSheet(workbook, names[2], surgeryRows(surgeries, language), language);
  appendSheet(workbook, names[3], implantRows(surgeries, language), language);
  return workbook;
}

export function buildOperationalSummaryWorkbook(summary: ReportSummary, language: ExportLanguage = "en") { return buildSingleSheetWorkbook(language === "ar" ? "ملخص العمليات" : "Operational summary", summaryRows(summary, language), language); }
export function buildTaskReportWorkbook(tasks: TaskReportRow[], language: ExportLanguage = "en") { return buildSingleSheetWorkbook(language === "ar" ? "المهام" : "Tasks", taskRows(tasks, language), language); }
export function buildSurgeryReportWorkbook(surgeries: SurgeryReportRow[], language: ExportLanguage = "en") { return buildSingleSheetWorkbook(language === "ar" ? "ملخص العمليات الجراحية" : "Surgery summary", surgeryRows(surgeries, language), language); }
export function buildImplantReportWorkbook(surgeries: SurgeryReportRow[], language: ExportLanguage = "en") { return buildSingleSheetWorkbook(language === "ar" ? "الغرسات المستخدمة" : "Implants used", implantRows(surgeries, language), language); }

export function downloadReportWorkbook(summary: ReportSummary, tasks: TaskReportRow[], surgeries: SurgeryReportRow[], fileStem = "ffm-operational-report", language: ExportLanguage = "en") {
  writeFileXLSX(buildReportWorkbook(summary, tasks, surgeries, language), `${fileStem}${language === "ar" ? "-ar" : ""}.xlsx`);
}

export function downloadOperationalSummaryWorkbook(summary: ReportSummary, language: ExportLanguage = "en") { writeFileXLSX(buildOperationalSummaryWorkbook(summary, language), `ffm-operational-summary${language === "ar" ? "-ar" : ""}.xlsx`); }
export function downloadTaskReportWorkbook(tasks: TaskReportRow[], language: ExportLanguage = "en") { writeFileXLSX(buildTaskReportWorkbook(tasks, language), `ffm-task-report${language === "ar" ? "-ar" : ""}.xlsx`); }
export function downloadSurgeryReportWorkbook(surgeries: SurgeryReportRow[], language: ExportLanguage = "en") { writeFileXLSX(buildSurgeryReportWorkbook(surgeries, language), `ffm-surgery-report${language === "ar" ? "-ar" : ""}.xlsx`); }
export function downloadImplantReportWorkbook(surgeries: SurgeryReportRow[], language: ExportLanguage = "en") { writeFileXLSX(buildImplantReportWorkbook(surgeries, language), `ffm-implant-detail-report${language === "ar" ? "-ar" : ""}.xlsx`); }
