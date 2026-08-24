import { utils, writeFileXLSX } from "xlsx";
import type { PrintableTravelExpenseClaim } from "./travelExpensePrint";
import type { ExportLanguage } from "./reportExcel";

type AccountingClaim = PrintableTravelExpenseClaim & { managerApproverName?: string | null; operationalApproverName?: string | null };
const safeCell = (value: unknown) => { const text = String(value ?? ""); return /^[=+\-@]/.test(text) ? `'${text}` : text; };
const dateText = (value: Date | string | null | undefined, language: ExportLanguage) => value ? new Date(value).toLocaleString(language === "ar" ? "ar-SA" : "en-GB") : "";
const dateOnly = (value: Date | string | null | undefined, language: ExportLanguage) => value ? new Date(value).toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB") : "";

export function travelExpenseClaimRows(claims: AccountingClaim[], language: ExportLanguage = "en") {
  if (language === "ar") return claims.map(claim => ({
    "رقم المطالبة": claim.id,
    "تاريخ المطالبة": dateOnly(claim.claimDate, language),
    "صاحب المطالبة": claim.claimantName,
    "بريد صاحب المطالبة": claim.claimantEmail || "",
    "القسم": claim.department || "",
    "طبيعة المهمة": claim.jobNature || "",
    "العملة": claim.currency || "SAR",
    "إجمالي المطالبة": Number(claim.totalAmount),
    "الحالة": claim.status,
    "موافق المدير": claim.managerApproverName || "",
    "وقت موافقة المدير": dateText(claim.managerApprovedAt, language),
    "موافق المدير التشغيلي": claim.operationalApproverName || "",
    "وقت موافقة المدير التشغيلي": dateText(claim.operationalApprovedAt, language),
    "وقت الصرف": dateText(claim.releasedAt, language),
    "مرجع التذكرة": claim.ticketReference || "",
  }));
  return claims.map(claim => ({
    "Claim ID": claim.id,
    "Claim date": dateOnly(claim.claimDate, language),
    Claimant: claim.claimantName,
    "Claimant email": claim.claimantEmail || "",
    Department: claim.department || "",
    "Job nature": claim.jobNature || "",
    Currency: claim.currency || "SAR",
    "Claim total": Number(claim.totalAmount),
    Status: claim.status,
    "Manager approver": claim.managerApproverName || "",
    "Manager approved at": dateText(claim.managerApprovedAt, language),
    "Operational approver": claim.operationalApproverName || "",
    "Operational approved at": dateText(claim.operationalApprovedAt, language),
    "Released at": dateText(claim.releasedAt, language),
    "Ticket reference": claim.ticketReference || "",
  }));
}

export function travelExpenseLineRows(claims: AccountingClaim[], language: ExportLanguage = "en") {
  if (language === "ar") return claims.flatMap(claim => claim.lines.map((line) => ({
    "رقم المطالبة": claim.id,
    "تاريخ المطالبة": dateOnly(claim.claimDate, language),
    "صاحب المطالبة": claim.claimantName,
    "الحالة": claim.status,
    "الفئة": line.category,
    "الوصف": line.description || "",
    "الأيام": line.days ?? 1,
    "المبلغ اليومي": Number(line.amountPerDay),
    "إجمالي البند": Number(line.totalAmount),
    "العملة": claim.currency || "SAR",
    "ملاحظات": line.remarks || "",
    "المسافة بالكيلومتر": line.distanceKm ?? "",
    "تقرير المهمة": claim.jobReport || "",
  })));
  return claims.flatMap(claim => claim.lines.map((line, index) => ({
    "Claim ID": claim.id,
    "Claim date": dateOnly(claim.claimDate, language),
    Claimant: claim.claimantName,
    Status: claim.status,
    Category: line.category,
    Description: line.description || "",
    Days: line.days ?? 1,
    "Amount per day": Number(line.amountPerDay),
    "Line total": Number(line.totalAmount),
    Currency: claim.currency || "SAR",
    Remarks: line.remarks || "",
    "Distance KM": line.distanceKm ?? "",
    "Job report": claim.jobReport || "",
  })));
}

function worksheet(rows: Array<Record<string, unknown>>, language: ExportLanguage) {
  const headers = rows.length ? Object.keys(rows[0]) : [language === "ar" ? "الحالة" : "Status"];
  const values = rows.length ? rows.map(row => headers.map(header => safeCell(row[header]))) : [[language === "ar" ? "لا توجد مطالبات مصروفات سفر للشهر المحدد" : "No Travel Expense claims for the selected month"]];
  const sheet = utils.aoa_to_sheet([headers, ...values]);
  sheet["!cols"] = headers.map(header => ({ wch: Math.min(Math.max(header.length + 2, 14), 34) }));
  (sheet as typeof sheet & { "!views": Array<{ rightToLeft: boolean }> })["!views"] = [{ rightToLeft: language === "ar" }];
  return sheet;
}

export function buildTravelExpenseAccountingWorkbook(claims: AccountingClaim[], language: ExportLanguage = "en") {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet(travelExpenseClaimRows(claims, language), language), language === "ar" ? "مطالبات السفر" : "Travel claims");
  utils.book_append_sheet(workbook, worksheet(travelExpenseLineRows(claims, language), language), language === "ar" ? "بنود المصروفات" : "Expense lines");
  return workbook;
}

export function downloadTravelExpenseAccountingWorkbook(claims: AccountingClaim[], rangeLabel: string, language: ExportLanguage = "en") {
  writeFileXLSX(buildTravelExpenseAccountingWorkbook(claims, language), `ffm-travel-expenses-${rangeLabel}${language === "ar" ? "-ar" : ""}.xlsx`);
}

export function travelExpenseClaimsCsv(claims: AccountingClaim[], language: ExportLanguage = "en") {
  const rows = travelExpenseClaimRows(claims, language);
  const headers = rows.length ? Object.keys(rows[0]) : [language === "ar" ? "الحالة" : "Status"];
  const quoted = (value: unknown) => `"${safeCell(value).replace(/"/g, '""')}"`;
  return `${language === "ar" ? "\ufeff" : ""}${[headers.map(quoted).join(","), ...rows.map(row => { const record = row as Record<string, unknown>; return headers.map(header => quoted(record[header])).join(","); })].join("\n")}`;
}

export function downloadTravelExpenseClaimsCsv(claims: AccountingClaim[], rangeLabel: string, language: ExportLanguage = "en") {
  const blob = new Blob([travelExpenseClaimsCsv(claims, language)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ffm-travel-expenses-${rangeLabel}${language === "ar" ? "-ar" : ""}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
