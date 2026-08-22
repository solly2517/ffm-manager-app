import { utils, writeFileXLSX } from "xlsx";
import type { PrintableTravelExpenseClaim } from "./travelExpensePrint";

type AccountingClaim = PrintableTravelExpenseClaim & { managerApproverName?: string | null; operationalApproverName?: string | null };
const safeCell = (value: unknown) => { const text = String(value ?? ""); return /^[=+\-@]/.test(text) ? `'${text}` : text; };
const dateText = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString() : "";
const dateOnly = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleDateString() : "";

export function travelExpenseClaimRows(claims: AccountingClaim[]) {
  return claims.map(claim => ({
    "Claim ID": claim.id,
    "Claim date": dateOnly(claim.claimDate),
    Claimant: claim.claimantName,
    "Claimant email": claim.claimantEmail || "",
    Department: claim.department || "",
    "Job nature": claim.jobNature || "",
    Currency: claim.currency || "SAR",
    "Claim total": Number(claim.totalAmount),
    Status: claim.status,
    "Manager approver": claim.managerApproverName || "",
    "Manager approved at": dateText(claim.managerApprovedAt),
    "Operational approver": claim.operationalApproverName || "",
    "Operational approved at": dateText(claim.operationalApprovedAt),
    "Released at": dateText(claim.releasedAt),
    "Ticket reference": claim.ticketReference || "",
  }));
}

export function travelExpenseLineRows(claims: AccountingClaim[]) {
  return claims.flatMap(claim => claim.lines.map((line, index) => ({
    "Claim ID": claim.id,
    "Claim date": dateOnly(claim.claimDate),
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

function worksheet(rows: Array<Record<string, unknown>>) {
  const headers = rows.length ? Object.keys(rows[0]) : ["Status"];
  const values = rows.length ? rows.map(row => headers.map(header => safeCell(row[header]))) : [["No Travel Expense claims for the selected month"]];
  const sheet = utils.aoa_to_sheet([headers, ...values]);
  sheet["!cols"] = headers.map(header => ({ wch: Math.min(Math.max(header.length + 2, 14), 34) }));
  return sheet;
}

export function buildTravelExpenseAccountingWorkbook(claims: AccountingClaim[]) {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet(travelExpenseClaimRows(claims)), "Travel claims");
  utils.book_append_sheet(workbook, worksheet(travelExpenseLineRows(claims)), "Expense lines");
  return workbook;
}

export function downloadTravelExpenseAccountingWorkbook(claims: AccountingClaim[], month: string) {
  writeFileXLSX(buildTravelExpenseAccountingWorkbook(claims), `ffm-travel-expenses-${month}.xlsx`);
}

export function travelExpenseClaimsCsv(claims: AccountingClaim[]) {
  const rows = travelExpenseClaimRows(claims);
  const headers = rows.length ? Object.keys(rows[0]) : ["Status"];
  const quoted = (value: unknown) => `"${safeCell(value).replace(/"/g, '""')}"`;
  return [headers.map(quoted).join(","), ...rows.map(row => { const record = row as Record<string, unknown>; return headers.map(header => quoted(record[header])).join(","); })].join("\n");
}

export function downloadTravelExpenseClaimsCsv(claims: AccountingClaim[], month: string) {
  const blob = new Blob([travelExpenseClaimsCsv(claims)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ffm-travel-expenses-${month}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
