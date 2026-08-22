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
  lines: Array<{
    category: string;
    description?: string | null;
    days?: number | null;
    amountPerDay: number | string;
    totalAmount: number | string;
    remarks?: string | null;
    distanceKm?: number | string | null;
  }>;
};

type PrintableSegment = { from?: string; to?: string; date?: string; transportation?: string; time?: string };

const categoryLabels: Record<string, string> = { hotel: "Hotel", car_taxi: "Car / Taxi", fuel_invoice: "Fuel / Invoice", maintenance: "Maintenance (Car + Fuel)", food: "Food", air_ticket: "Air ticket", others: "Others" };
const transportLabels: Record<string, string> = { car: "Car", plane: "Plane", car_and_plane: "Car & Plane", other: "Other" };
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
const formatDate = (value: Date | string | null | undefined, includeTime = true) => value ? new Date(value)[includeTime ? "toLocaleString" : "toLocaleDateString"]() : "—";

export function parseTravelExpenseSegments(value: string | null | undefined): PrintableSegment[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(segment => segment && typeof segment === "object") : [];
  } catch {
    return [];
  }
}

export function formatTravelExpenseAmount(value: number | string, currency?: string | null) {
  const amount = Number(value);
  const safeCurrency = /^[A-Za-z]{3}$/.test(currency || "") ? (currency || "SAR").toUpperCase() : "SAR";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: safeCurrency, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0); }
  catch { return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} ${safeCurrency}`; }
}

export function buildTravelExpensePrintDocument(claim: PrintableTravelExpenseClaim) {
  const segments = parseTravelExpenseSegments(claim.tripSegmentsJson);
  const currency = claim.currency || "SAR";
  const approval = (name: string | null | undefined, at: Date | string | null | undefined) => `<div class="approval"><strong>${escapeHtml(name || "Not assigned")}</strong><span>${at ? `Approved ${escapeHtml(formatDate(at))}` : "Awaiting approval"}</span></div>`;
  const segmentRows = segments.length ? segments.map((segment, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(segment.from || "—")}</td><td>${escapeHtml(segment.to || "—")}</td><td>${escapeHtml(formatDate(segment.date, false))}</td><td>${escapeHtml(transportLabels[segment.transportation || ""] || segment.transportation || "—")}</td><td>${escapeHtml(segment.time || "—")}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">No trip segments were recorded.</td></tr>`;
  const lineRows = claim.lines.map((line, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(categoryLabels[line.category] || line.category)}</td><td>${escapeHtml(line.description || "—")}</td><td class="numeric">${escapeHtml(line.days ?? 1)}</td><td class="numeric">${escapeHtml(formatTravelExpenseAmount(line.amountPerDay, currency))}</td><td class="numeric">${escapeHtml(formatTravelExpenseAmount(line.totalAmount, currency))}</td><td>${escapeHtml(line.distanceKm == null ? line.remarks || "—" : `${line.remarks ? `${line.remarks} · ` : ""}${line.distanceKm} KM`)}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">No expense lines were recorded.</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>FFM Travel Expense Claim ${claim.id}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#142033;font-size:11px;line-height:1.4;margin:0}header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #1168cf;padding-bottom:12px;margin-bottom:18px}.eyebrow{color:#1168cf;letter-spacing:.12em;font-size:9px;font-weight:700;margin:0 0 4px}h1{margin:0;font-size:22px}h2{font-size:13px;margin:18px 0 8px;color:#0c4e99}.status{align-self:flex-start;border:1px solid #1168cf;color:#0c4e99;padding:6px 10px;border-radius:999px;text-transform:uppercase;font-weight:700;font-size:9px}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 20px}.field{border-bottom:1px solid #d7e0eb;padding:4px 0}.label{font-size:8px;color:#637287;text-transform:uppercase;letter-spacing:.06em;display:block}.field strong{font-size:11px}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#eaf3ff;color:#0c4e99;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:.04em}th,td{border:1px solid #cfd9e5;padding:6px;vertical-align:top}td.numeric,th.numeric{text-align:right}.empty{color:#637287;text-align:center}.total{display:flex;justify-content:flex-end;gap:16px;margin-top:9px;font-size:13px;font-weight:700}.report{white-space:pre-wrap;border:1px solid #cfd9e5;background:#f8fbff;padding:9px}.approval-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.approval{border:1px solid #cfd9e5;padding:9px;min-height:56px}.approval span{display:block;color:#637287;margin-top:4px;font-size:9px}footer{border-top:1px solid #cfd9e5;margin-top:20px;padding-top:8px;color:#637287;font-size:8px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><header><div><p class="eyebrow">FFM / FINANCE WORKFLOW</p><h1>Travel Expense Claim #${claim.id}</h1><p>Submitted ${escapeHtml(formatDate(claim.createdAt))}</p></div><div class="status">${escapeHtml(claim.status)}</div></header><section class="meta"><div class="field"><span class="label">Claimant</span><strong>${escapeHtml(claim.claimantName)}</strong><br>${escapeHtml(claim.claimantEmail || "")}</div><div class="field"><span class="label">Claim date</span><strong>${escapeHtml(formatDate(claim.claimDate, false))}</strong></div><div class="field"><span class="label">Department</span><strong>${escapeHtml(claim.department || "—")}</strong></div><div class="field"><span class="label">Job nature</span><strong>${escapeHtml(claim.jobNature || "—")}</strong></div><div class="field"><span class="label">Primary transportation</span><strong>${escapeHtml(transportLabels[claim.transportMode || ""] || claim.transportMode || "—")}</strong></div><div class="field"><span class="label">Estimated days / ticket reference</span><strong>${escapeHtml(claim.estimatedDays || "—")} day(s) · ${escapeHtml(claim.ticketReference || "—")}</strong></div></section><h2>Trip description</h2><table><thead><tr><th>#</th><th>From</th><th>To</th><th>Date</th><th>Transportation</th><th>Time</th></tr></thead><tbody>${segmentRows}</tbody></table><h2>Expense lines</h2><table><thead><tr><th>#</th><th>Category</th><th>Description</th><th class="numeric">Days</th><th class="numeric">Amount/day</th><th class="numeric">Total</th><th>Remarks / KM</th></tr></thead><tbody>${lineRows}</tbody></table><div class="total"><span>Grand total</span><span>${escapeHtml(formatTravelExpenseAmount(claim.totalAmount, currency))}</span></div><h2>Job report</h2><div class="report">${escapeHtml(claim.jobReport || "—")}</div><h2>Digital approval and release record</h2><div class="approval-grid">${approval(claim.managerApproverName, claim.managerApprovedAt)}${approval(claim.operationalApproverName, claim.operationalApprovedAt)}<div class="approval"><strong>Operational release</strong><span>${claim.releasedAt ? `Released ${escapeHtml(formatDate(claim.releasedAt))}` : "Not released"}</span></div></div><footer>This document is generated from the FFM digital Travel Expenses workflow. Approval and release times are recorded by FFM in UTC and displayed in your local time.</footer></body></html>`;
}
