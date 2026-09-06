import type { ExportLanguage } from "./reportExcel";

export type PrintableTravelExpenseClaim = {
  id: number;
  claimantName: string;
  claimantEmail?: string | null;
  claimDate: Date | string;
  department?: string | null;
  jobNature?: string | null;
  transportMode?: string | null;
  ticketReference?: string | null;
  estimatedDays?: number | null;
  tripSegmentsJson?: string | null;
  jobReport?: string | null;
  totalAmount: number | string;
  currency?: string | null;
  status: string;
  managerApproverName?: string | null;
  managerApprovedAt?: Date | string | null;
  operationalApproverName?: string | null;
  operationalApprovedAt?: Date | string | null;
  releasedAt?: Date | string | null;
  createdAt?: Date | string | null;
  lines: Array<{ category: string; description?: string | null; days?: number | null; amountPerDay: number | string; totalAmount: number | string; remarks?: string | null; distanceKm?: number | string | null }>;
};

type PrintableSegment = { from?: string; to?: string; date?: string; transportation?: string; time?: string };
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);

const text = {
  en: { finance: "FINANCE WORKFLOW", claim: "Travel Expense Claim", submitted: "Submitted", claimant: "Claimant", claimDate: "Claim date", department: "Department", jobNature: "Job nature", transport: "Primary transportation", daysTicket: "Estimated days / ticket reference", day: "day(s)", trip: "Trip description", from: "From", to: "To", date: "Date", transportation: "Transportation", time: "Time", expenseLines: "Expense lines", category: "Category", description: "Description", days: "Days", amountDay: "Amount/day", total: "Total", remarksKm: "Remarks / KM", grandTotal: "Grand total", report: "Job report", approvalRelease: "Digital approval and release record", managerApproval: "Manager approval", operationalApproval: "Operational approval", operationalRelease: "Operational release", notAssigned: "Not assigned", approved: "Approved", awaitingApproval: "Awaiting approval", released: "Released", notReleased: "Not released", noSegments: "No trip segments were recorded.", noLines: "No expense lines were recorded.", footer: "This document is generated from the FFM digital Travel Expenses workflow. Approval and release times are recorded by FFM in UTC and displayed in your local time." },
  ar: { finance: "سير عمل الشؤون المالية", claim: "مطالبة مصروفات سفر", submitted: "تاريخ التقديم", claimant: "صاحب المطالبة", claimDate: "تاريخ المطالبة", department: "القسم", jobNature: "طبيعة المهمة", transport: "وسيلة النقل الأساسية", daysTicket: "الأيام التقديرية / مرجع التذكرة", day: "يوم", trip: "وصف الرحلة", from: "من", to: "إلى", date: "التاريخ", transportation: "وسيلة النقل", time: "الوقت", expenseLines: "بنود المصروفات", category: "الفئة", description: "الوصف", days: "الأيام", amountDay: "المبلغ اليومي", total: "الإجمالي", remarksKm: "ملاحظات / كم", grandTotal: "الإجمالي الكلي", report: "تقرير المهمة", approvalRelease: "سجل الموافقة والصرف الرقمي", managerApproval: "موافقة المدير", operationalApproval: "موافقة المدير التشغيلي", operationalRelease: "الصرف التشغيلي", notAssigned: "غير معيّن", approved: "تمت الموافقة", awaitingApproval: "بانتظار الموافقة", released: "تم الصرف", notReleased: "لم يتم الصرف", noSegments: "لم تُسجل أي مقاطع للرحلة.", noLines: "لم تُسجل أي بنود مصروفات.", footer: "يُنشأ هذا المستند من سير عمل مصروفات السفر الرقمي في FFM. تُسجل أوقات الموافقة والصرف بتوقيت UTC وتُعرض بتوقيتك المحلي." },
} as const;

const categoryLabels = {
  en: { hotel: "Hotel", car_taxi: "Car / Taxi", fuel_invoice: "Fuel / Invoice", maintenance: "Maintenance (Car + Fuel)", food: "Food", air_ticket: "Air ticket", others: "Others" },
  ar: { hotel: "فندق", car_taxi: "سيارة / تاكسي", fuel_invoice: "وقود / فاتورة", maintenance: "صيانة (سيارة ووقود)", food: "طعام", air_ticket: "تذكرة طيران", others: "أخرى" },
} as const;
const transportLabels = { en: { car: "Car", plane: "Plane", car_and_plane: "Car & Plane", other: "Other" }, ar: { car: "سيارة", plane: "طائرة", car_and_plane: "سيارة وطائرة", other: "أخرى" } } as const;

const formatDate = (value: Date | string | null | undefined, language: ExportLanguage, includeTime = true) => value ? new Date(value)[includeTime ? "toLocaleString" : "toLocaleDateString"](language === "ar" ? "ar-EG" : "en-GB") : "—";

export function parseTravelExpenseSegments(value: string | null | undefined): PrintableSegment[] {
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter(segment => segment && typeof segment === "object") : []; } catch { return []; }
}

export function formatTravelExpenseAmount(value: number | string, currency?: string | null, language: ExportLanguage = "en") {
  const amount = Number(value); const safeCurrency = /^[A-Za-z]{3}$/.test(currency || "") ? (currency || "SAR").toUpperCase() : "SAR";
  try { return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-GB", { style: "currency", currency: safeCurrency, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0); }
  catch { return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} ${safeCurrency}`; }
}

export function buildTravelExpensePrintDocument(claim: PrintableTravelExpenseClaim, language: ExportLanguage = "en") {
  const labels = text[language]; const segments = parseTravelExpenseSegments(claim.tripSegmentsJson); const currency = claim.currency || "SAR"; const rtl = language === "ar";
  const category = (key: string) => categoryLabels[language][key as keyof typeof categoryLabels.en] || key;
  const transport = (key: string | null | undefined) => transportLabels[language][(key || "") as keyof typeof transportLabels.en] || key || "—";
  const approval = (heading: string, name: string | null | undefined, at: Date | string | null | undefined) => `<div class="approval"><span class="label">${heading}</span><strong>${escapeHtml(name || labels.notAssigned)}</strong><span>${at ? `${labels.approved} ${escapeHtml(formatDate(at, language))}` : labels.awaitingApproval}</span></div>`;
  const segmentRows = segments.length ? segments.map((segment, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(segment.from || "—")}</td><td>${escapeHtml(segment.to || "—")}</td><td>${escapeHtml(formatDate(segment.date, language, false))}</td><td>${escapeHtml(transport(segment.transportation))}</td><td>${escapeHtml(segment.time || "—")}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">${labels.noSegments}</td></tr>`;
  const lineRows = claim.lines.map((line, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(category(line.category))}</td><td>${escapeHtml(line.description || "—")}</td><td class="numeric">${escapeHtml(line.days ?? 1)}</td><td class="numeric">${escapeHtml(formatTravelExpenseAmount(line.amountPerDay, currency, language))}</td><td class="numeric">${escapeHtml(formatTravelExpenseAmount(line.totalAmount, currency, language))}</td><td>${escapeHtml(line.distanceKm == null ? line.remarks || "—" : `${line.remarks ? `${line.remarks} · ` : ""}${line.distanceKm} KM`)}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">${labels.noLines}</td></tr>`;
  return `<!doctype html><html dir="${rtl ? "rtl" : "ltr"}" lang="${language}"><head><meta charset="utf-8"><title>FFM ${labels.claim} ${claim.id}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:${rtl ? "Tahoma, Arial, sans-serif" : "Arial, Helvetica, sans-serif"};direction:${rtl ? "rtl" : "ltr"};text-align:${rtl ? "right" : "left"};color:#142033;font-size:11px;line-height:1.4;margin:0}header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #1168cf;padding-bottom:12px;margin-bottom:18px}.eyebrow{color:#1168cf;letter-spacing:.12em;font-size:9px;font-weight:700;margin:0 0 4px}h1{margin:0;font-size:22px}h2{font-size:13px;margin:18px 0 8px;color:#0c4e99}.status{align-self:flex-start;border:1px solid #1168cf;color:#0c4e99;padding:6px 10px;border-radius:999px;font-weight:700;font-size:9px}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 20px}.field{border-bottom:1px solid #d7e0eb;padding:4px 0}.label{font-size:8px;color:#637287;text-transform:${rtl ? "none" : "uppercase"};letter-spacing:.06em;display:block}.field strong{font-size:11px}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#eaf3ff;color:#0c4e99;text-align:${rtl ? "right" : "left"};font-size:8px;text-transform:${rtl ? "none" : "uppercase"};letter-spacing:.04em}th,td{border:1px solid #cfd9e5;padding:6px;vertical-align:top}td.numeric,th.numeric{text-align:${rtl ? "left" : "right"}}.empty{color:#637287;text-align:center}.total{display:flex;justify-content:${rtl ? "flex-start" : "flex-end"};gap:16px;margin-top:9px;font-size:13px;font-weight:700}.report{white-space:pre-wrap;border:1px solid #cfd9e5;background:#f8fbff;padding:9px}.approval-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.approval{border:1px solid #cfd9e5;padding:9px;min-height:56px}.approval strong,.approval span{display:block}.approval>span:last-child{color:#637287;margin-top:4px;font-size:9px}footer{border-top:1px solid #cfd9e5;margin-top:20px;padding-top:8px;color:#637287;font-size:8px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header><div><p class="eyebrow">FFM / ${labels.finance}</p><h1>${labels.claim} #${claim.id}</h1><p>${labels.submitted} ${escapeHtml(formatDate(claim.createdAt, language))}</p></div><div class="status">${escapeHtml(claim.status)}</div></header><section class="meta"><div class="field"><span class="label">${labels.claimant}</span><strong>${escapeHtml(claim.claimantName)}</strong><br>${escapeHtml(claim.claimantEmail || "")}</div><div class="field"><span class="label">${labels.claimDate}</span><strong>${escapeHtml(formatDate(claim.claimDate, language, false))}</strong></div><div class="field"><span class="label">${labels.department}</span><strong>${escapeHtml(claim.department || "—")}</strong></div><div class="field"><span class="label">${labels.jobNature}</span><strong>${escapeHtml(claim.jobNature || "—")}</strong></div><div class="field"><span class="label">${labels.transport}</span><strong>${escapeHtml(transport(claim.transportMode))}</strong></div><div class="field"><span class="label">${labels.daysTicket}</span><strong>${escapeHtml(claim.estimatedDays || "—")} ${labels.day} · ${escapeHtml(claim.ticketReference || "—")}</strong></div></section><h2>${labels.trip}</h2><table><thead><tr><th>#</th><th>${labels.from}</th><th>${labels.to}</th><th>${labels.date}</th><th>${labels.transportation}</th><th>${labels.time}</th></tr></thead><tbody>${segmentRows}</tbody></table><h2>${labels.expenseLines}</h2><table><thead><tr><th>#</th><th>${labels.category}</th><th>${labels.description}</th><th class="numeric">${labels.days}</th><th class="numeric">${labels.amountDay}</th><th class="numeric">${labels.total}</th><th>${labels.remarksKm}</th></tr></thead><tbody>${lineRows}</tbody></table><div class="total"><span>${labels.grandTotal}</span><span>${escapeHtml(formatTravelExpenseAmount(claim.totalAmount, currency, language))}</span></div><h2>${labels.report}</h2><div class="report">${escapeHtml(claim.jobReport || "—")}</div><h2>${labels.approvalRelease}</h2><div class="approval-grid">${approval(labels.managerApproval, claim.managerApproverName, claim.managerApprovedAt)}${approval(labels.operationalApproval, claim.operationalApproverName, claim.operationalApprovedAt)}<div class="approval"><span class="label">${labels.operationalRelease}</span><strong>${claim.releasedAt ? labels.released : labels.notReleased}</strong><span>${claim.releasedAt ? escapeHtml(formatDate(claim.releasedAt, language)) : ""}</span></div></div><footer>${labels.footer}</footer></body></html>`;
}
