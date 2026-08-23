import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, ClipboardList, CircleDollarSign, Download, FileSpreadsheet, Loader2, Plus, Printer, Send, Trash2 } from "lucide-react";
import { calculateTravelExpenseClaimTotal, calculateTravelExpenseLineTotal } from "@/lib/travelExpenseCalculations";
import { buildTravelExpensePrintDocument, type PrintableTravelExpenseClaim } from "@/lib/travelExpensePrint";
import { downloadTravelExpenseAccountingWorkbook, downloadTravelExpenseClaimsCsv } from "@/lib/travelExpenseExport";

type TransportMode = "car" | "plane" | "car_and_plane" | "other";
type ExpenseCategory = "hotel" | "car_taxi" | "fuel_invoice" | "maintenance" | "food" | "air_ticket" | "others";
type ExpenseLine = { category: ExpenseCategory; description: string; days: number; amountPerDay: number; remarks: string; distanceKm?: number };
type TripSegment = { from: string; to: string; date: string; transportation: TransportMode; time: string };

const operationalEmail = "amreslam@altamammed.com";
const categoryLabels: Record<ExpenseCategory, string> = {
  hotel: "Hotel", car_taxi: "Car / Taxi", fuel_invoice: "Fuel / Invoice", maintenance: "Maintenance (Car + Fuel)", food: "Food", air_ticket: "Air ticket", others: "Others",
};
const transportLabels: Record<TransportMode, string> = { car: "Car", plane: "Plane", car_and_plane: "Car & Plane", other: "Other" };
const today = () => new Date().toISOString().slice(0, 10);
const blankLine = (): ExpenseLine => ({ category: "hotel", description: "", days: 1, amountPerDay: 0, remarks: "" });
const blankSegment = (): TripSegment => ({ from: "", to: "", date: today(), transportation: "car", time: "" });
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "SAR", maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);
const displayDate = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString() : "Awaiting action";

export default function TravelExpenses() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const claimsQuery = trpc.travelExpenses.claims.useQuery(undefined, { enabled: isAuthenticated });
  const approversQuery = trpc.travelExpenses.managerApprovers.useQuery(undefined, { enabled: isAuthenticated });
  const [notice, setNotice] = useState("");
  const [claimDate, setClaimDate] = useState(today());
  const [department, setDepartment] = useState("");
  const [jobNature, setJobNature] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode>("car");
  const [ticketReference, setTicketReference] = useState("");
  const [estimatedDays, setEstimatedDays] = useState(1);
  const [currency, setCurrency] = useState("SAR");
  const [jobReport, setJobReport] = useState("");
  const [managerApproverId, setManagerApproverId] = useState<number | null>(null);
  const [segments, setSegments] = useState<TripSegment[]>([blankSegment()]);
  const [lines, setLines] = useState<ExpenseLine[]>([blankLine()]);
  const [accountingFrom, setAccountingFrom] = useState(() => `${new Date().toISOString().slice(0, 8)}01`);
  const [accountingTo, setAccountingTo] = useState(today());
  const [accountingDepartment, setAccountingDepartment] = useState("");
  const accountingRangeExport = trpc.travelExpenses.accountingExport.useQuery({ from: accountingFrom, to: accountingTo, department: accountingDepartment || undefined }, { enabled: false });
  const accountingDepartments = useMemo(() => Array.from(new Set((claimsQuery.data ?? []).map(claim => claim.department?.trim()).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right)), [claimsQuery.data]);

  useEffect(() => {
    if (!managerApproverId && approversQuery.data?.[0]) setManagerApproverId(approversQuery.data[0].id);
  }, [approversQuery.data, managerApproverId]);

  const total = useMemo(() => calculateTravelExpenseClaimTotal(lines), [lines]);
  const printClaim = (claim: PrintableTravelExpenseClaim) => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=900");
    if (!printWindow) { setNotice("Printing was blocked by the browser. Please allow pop-ups for FFM, then try again."); return; }
    printWindow.document.open();
    printWindow.document.write(buildTravelExpensePrintDocument(claim));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };
  const downloadRangeAccounting = async (format: "xlsx" | "csv") => {
    if (!accountingFrom || !accountingTo || accountingFrom > accountingTo) { setNotice("Choose a valid accounting start and end date before downloading."); return; }
    const result = await accountingRangeExport.refetch();
    if (!result.data) { setNotice("Unable to prepare the accounting export. Please retry."); return; }
    const departmentLabel = accountingDepartment ? `_${accountingDepartment.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "department"}` : "";
    const rangeLabel = `${accountingFrom}_to_${accountingTo}${departmentLabel}`;
    if (format === "xlsx") downloadTravelExpenseAccountingWorkbook(result.data, rangeLabel);
    else downloadTravelExpenseClaimsCsv(result.data, rangeLabel);
    setNotice(`${format === "xlsx" ? "Excel" : "CSV"} accounting export downloaded for ${accountingFrom} to ${accountingTo}.`);
  };
  const refresh = async () => { await Promise.all([utils.travelExpenses.claims.invalidate(), utils.travelExpenses.managerApprovers.invalidate()]); };
  const submit = trpc.travelExpenses.submit.useMutation({
    onSuccess: async () => {
      setNotice("Travel expense submitted. It is now pending both required approvals.");
      setDepartment(""); setJobNature(""); setTicketReference(""); setJobReport(""); setEstimatedDays(1); setSegments([blankSegment()]); setLines([blankLine()]);
      await refresh();
    },
    onError: error => setNotice(error.message),
  });
  const managerApproval = trpc.travelExpenses.approveManager.useMutation({ onSuccess: async () => { setNotice("Manager approval recorded."); await refresh(); }, onError: error => setNotice(error.message) });
  const operationalApproval = trpc.travelExpenses.approveOperational.useMutation({ onSuccess: async () => { setNotice("Operational approval recorded."); await refresh(); }, onError: error => setNotice(error.message) });
  const release = trpc.travelExpenses.release.useMutation({ onSuccess: async () => { setNotice("Amount released and release date registered."); await refresh(); }, onError: error => setNotice(error.message) });

  const updateSegment = (index: number, patch: Partial<TripSegment>) => setSegments(current => current.map((segment, itemIndex) => itemIndex === index ? { ...segment, ...patch } : segment));
  const updateLine = (index: number, patch: Partial<ExpenseLine>) => setLines(current => current.map((line, itemIndex) => itemIndex === index ? { ...line, ...patch } : line));
  const handleSubmit = () => {
    if (!managerApproverId) { setNotice("An assigned Manager approver is required before submitting."); return; }
    if (!jobReport.trim()) { setNotice("Please add the short job report before submitting."); return; }
    submit.mutate({ managerApproverId, claimDate, department: department || undefined, jobNature: jobNature || undefined, transportMode, ticketReference: ticketReference || undefined, estimatedDays, tripSegments: segments, jobReport, currency: currency.toUpperCase(), lines });
  };

  if (loading) return <div className="blueprint-page"><div className="blueprint-loader">Loading Travel Expenses…</div></div>;
  if (!isAuthenticated) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><div className="logo-mark">FFM</div><p className="eyebrow">FINANCE WORKFLOW</p><h1>Travel Expenses</h1><p className="muted">Sign in to submit and track your FFM travel claims.</p><Button className="w-full mt-6 blueprint-button" onClick={() => startLogin()}>Sign in securely</Button></Card></div>;

  const isOperationalManager = user?.email?.trim().toLowerCase() === operationalEmail;
  const isAccountingExporter = isOperationalManager || user?.role === "admin";
  const currentUserId = user?.id;
  const claims = claimsQuery.data ?? [];

  return <div className="manager-shell">
    <aside className="manager-sidebar">
      <div className="brand-lockup"><div className="logo-mark small">FFM</div><div><strong>Travel Expenses</strong><span>Claim & release workflow</span></div></div>
      <div className="sidebar-rule" />
      <nav><a className="sidebar-link" href={user?.role === "delegate" ? "/delegate" : user?.role === "warehouse_hero" ? "/warehouse-hero" : "/"}><ArrowLeft size={17} /><span>Back to workspace</span></a><a className="sidebar-link" href="/work-log"><ClipboardList size={17} /><span>Weekly visits & daily reports</span></a></nav>
      <div className="sidebar-user"><div className="avatar">{(user?.name || user?.email || "F")[0].toUpperCase()}</div><div className="user-copy"><strong>{user?.name || user?.email || "FFM member"}</strong><span>{user?.role?.replace("_", " ")}</span></div><button className="logout-icon" onClick={() => logout()} title="Sign out">Sign out</button></div>
    </aside>
    <main className="manager-main">
      <header className="manager-topbar"><div><p className="topbar-kicker">FFM / FINANCE WORKFLOW</p><h2>Travel Expenses</h2></div><div className="topbar-actions"><div className="live-indicator"><span /> Secure approval trail</div></div></header>
      <section className="manager-content space-y-6">
        <div className="page-intro"><div><p className="eyebrow">Travel expense sheet</p><h1>Submit a clear claim. Track the approval. Record the release.</h1><p className="muted">Every FFM member can submit their own travel expenses. A claim stays pending until the claimant’s Manager and the designated Operational Manager approve it. The release date is recorded automatically when the released amount is confirmed.</p></div></div>
        {notice && <div className={/submitted|recorded|released|downloaded/i.test(notice) ? "admin-feedback success" : "admin-feedback error"}>{notice}</div>}
        {isAccountingExporter && <Card className="blueprint-card"><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet size={20} /> Accounting export by date range</CardTitle><p className="muted">Choose any inclusive claim-date period and optionally narrow it to one department. Excel includes separate claims and expense-line sheets; CSV contains the claim summary.</p></CardHeader><CardContent className="flex flex-wrap items-end gap-3"><div className="space-y-2"><Label htmlFor="accounting-from">From</Label><Input id="accounting-from" type="date" value={accountingFrom} onChange={event => setAccountingFrom(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="accounting-to">To</Label><Input id="accounting-to" type="date" min={accountingFrom || undefined} value={accountingTo} onChange={event => setAccountingTo(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="accounting-department">Department</Label><select id="accounting-department" className="ffm-select" value={accountingDepartment} onChange={event => setAccountingDepartment(event.target.value)}><option value="">All departments</option>{accountingDepartments.map(item => <option key={item} value={item}>{item}</option>)}</select></div><Button className="blueprint-button" disabled={accountingRangeExport.isFetching} onClick={() => downloadRangeAccounting("xlsx")}><FileSpreadsheet size={16} /> {accountingRangeExport.isFetching ? "Preparing…" : "Download Excel"}</Button><Button variant="outline" disabled={accountingRangeExport.isFetching} onClick={() => downloadRangeAccounting("csv")}><Download size={16} /> Download CSV</Button></CardContent></Card>}
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
          <Card className="blueprint-card"><CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign size={20} /> New travel claim</CardTitle><p className="muted">Fields follow the attached FFM Travel Expense sheet. Totals are recalculated securely by FFM when submitted.</p></CardHeader><CardContent className="space-y-7">
            <section className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="claim-date">Date</Label><Input id="claim-date" type="date" value={claimDate} onChange={event => setClaimDate(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="manager-approver">Manager approver</Label><select id="manager-approver" className="ffm-select" value={managerApproverId ?? ""} onChange={event => setManagerApproverId(Number(event.target.value))}><option value="" disabled>Select Manager</option>{(approversQuery.data ?? []).map(approver => <option key={approver.id} value={approver.id}>{approver.name || approver.email}</option>)}</select>{approversQuery.isLoading && <small className="muted">Loading the permitted approver…</small>}{!approversQuery.isLoading && !approversQuery.data?.length && <small className="text-amber-300">No permitted Manager approver is available. Ask the Administrator to confirm your assignment.</small>}</div><div className="space-y-2"><Label htmlFor="department">Department</Label><Input id="department" value={department} onChange={event => setDepartment(event.target.value)} placeholder="e.g. Clinical" /></div><div className="space-y-2"><Label htmlFor="job-nature">Job nature</Label><Input id="job-nature" value={jobNature} onChange={event => setJobNature(event.target.value)} placeholder="e.g. Hospital follow-up" /></div><div className="space-y-2"><Label htmlFor="transport-mode">Primary transportation</Label><select id="transport-mode" className="ffm-select" value={transportMode} onChange={event => setTransportMode(event.target.value as TransportMode)}>{Object.entries(transportLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="estimated-days">Estimated number of days</Label><Input id="estimated-days" min={1} max={365} type="number" value={estimatedDays} onChange={event => setEstimatedDays(Math.max(1, Number(event.target.value)))} /></div><div className="space-y-2"><Label htmlFor="ticket-reference">Ticket reference</Label><Input id="ticket-reference" value={ticketReference} onChange={event => setTicketReference(event.target.value)} placeholder="Optional ticket / booking reference" /></div><div className="space-y-2"><Label htmlFor="currency">Currency</Label><Input id="currency" maxLength={3} value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} placeholder="SAR" /></div></section>
            <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Trip description</h3><p className="muted text-sm">Add each dated travel segment from the printed sheet.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setSegments(current => [...current, blankSegment()])}><Plus size={16} /> Add segment</Button></div>{segments.map((segment, index) => <div className="grid gap-3 rounded-md border border-blue-500/20 bg-slate-950/20 p-3 md:grid-cols-[1fr_1fr_145px_160px_105px_auto]" key={index}><Input aria-label={`From place ${index + 1}`} value={segment.from} onChange={event => updateSegment(index, { from: event.target.value })} placeholder="From place" /><Input aria-label={`To place ${index + 1}`} value={segment.to} onChange={event => updateSegment(index, { to: event.target.value })} placeholder="To place" /><Input aria-label={`Segment date ${index + 1}`} type="date" value={segment.date} onChange={event => updateSegment(index, { date: event.target.value })} /><select aria-label={`Transportation ${index + 1}`} className="ffm-select" value={segment.transportation} onChange={event => updateSegment(index, { transportation: event.target.value as TransportMode })}>{Object.entries(transportLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Input aria-label={`Time ${index + 1}`} type="time" value={segment.time} onChange={event => updateSegment(index, { time: event.target.value })} />{segments.length > 1 && <Button type="button" variant="ghost" size="icon" className="text-rose-300" onClick={() => setSegments(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /><span className="sr-only">Remove segment</span></Button>}</div>)}</section>
            <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Expense lines</h3><p className="muted text-sm">Enter each Hotel, transport, fuel, maintenance, food, air ticket, or other cost separately.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setLines(current => [...current, blankLine()])}><Plus size={16} /> Add expense</Button></div><div className="space-y-3">{lines.map((line, index) => { const lineTotal = calculateTravelExpenseLineTotal(line); return <div className="rounded-md border border-blue-500/20 bg-slate-950/20 p-3" key={index}><div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_95px_125px_125px_auto]"><select aria-label={`Expense category ${index + 1}`} className="ffm-select" value={line.category} onChange={event => updateLine(index, { category: event.target.value as ExpenseCategory })}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Input aria-label={`Description ${index + 1}`} value={line.description} onChange={event => updateLine(index, { description: event.target.value })} placeholder="Description / job site" /><Input aria-label={`Days ${index + 1}`} type="number" min={1} value={line.days} onChange={event => updateLine(index, { days: Math.max(1, Number(event.target.value)) })} /><Input aria-label={`Rate ${index + 1}`} type="number" min={0} step="0.01" value={line.amountPerDay} onChange={event => updateLine(index, { amountPerDay: Math.max(0, Number(event.target.value)) })} /><div className="rounded-md border border-blue-500/20 px-3 py-2 text-sm font-semibold text-blue-100">{money(lineTotal, currency)}</div>{lines.length > 1 && <Button type="button" variant="ghost" size="icon" className="text-rose-300" onClick={() => setLines(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /><span className="sr-only">Remove expense</span></Button>}</div><div className="mt-3 grid gap-3 md:grid-cols-2"><Input aria-label={`Remarks ${index + 1}`} value={line.remarks} onChange={event => updateLine(index, { remarks: event.target.value })} placeholder="Remarks (optional)" />{line.category === "maintenance" && <Input aria-label={`Distance kilometres ${index + 1}`} type="number" min={0} value={line.distanceKm ?? ""} onChange={event => updateLine(index, { distanceKm: event.target.value ? Math.max(0, Number(event.target.value)) : undefined })} placeholder="KM (optional)" />}</div></div>; })}</div><div className="flex items-center justify-between rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-3"><div><strong>Grand total</strong><p className="muted text-sm">Recalculated by FFM from the individual lines.</p></div><strong className="text-lg text-emerald-200">{money(total, currency)}</strong></div></section>
            <section className="space-y-2"><Label htmlFor="job-report">Short job report</Label><Textarea id="job-report" rows={5} value={jobReport} onChange={event => setJobReport(event.target.value)} placeholder="State the job site, work completed, and relevant trip outcome." /></section>
            <Button className="blueprint-button w-full" disabled={submit.isPending || !approversQuery.data?.length} onClick={handleSubmit}>{submit.isPending ? <><Loader2 className="animate-spin" size={17} /> Submitting claim…</> : <><Send size={17} /> Submit pending claim</>}</Button>
          </CardContent></Card>
          <Card className="blueprint-card h-fit"><CardHeader><CardTitle>Digital approval rules</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-md border border-blue-500/20 bg-slate-950/25 p-4"><p className="font-semibold">1. Submit as Pending</p><p className="muted text-sm">Your submitted claim preserves the trip details, job report, and every expense line.</p></div><div className="rounded-md border border-blue-500/20 bg-slate-950/25 p-4"><p className="font-semibold">2. Two required approvals</p><p className="muted text-sm">The claimant’s Manager and <strong>amreslam@altamammed.com</strong> must both approve. A claimant can never approve their own expense.</p></div><div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-4"><p className="font-semibold text-emerald-100">3. Accepted, then released</p><p className="muted text-sm">When both approvals are recorded the claim is Accepted. Only the Operational Manager can record Released, and FFM writes the release timestamp automatically.</p></div></CardContent></Card>
        </div>
        <Card className="blueprint-card"><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList size={20} /> Claims & approval queue</CardTitle><p className="muted">You can see your own claims, plus claims awaiting your permitted approval action. Use Print / Save PDF to download the complete FFM claim record.</p></CardHeader><CardContent>{claimsQuery.isLoading ? <div className="admin-feedback">Loading travel expense claims…</div> : claimsQuery.error ? <div className="admin-feedback error">Unable to load claims: {claimsQuery.error.message}</div> : !claims.length ? <div className="admin-feedback">No travel expense claims have been submitted yet.</div> : <div className="space-y-4">{claims.map(claim => { const ownsClaim = claim.claimantId === currentUserId; const needsManagerApproval = claim.managerApproverId === currentUserId && !claim.managerApprovedAt && !ownsClaim; const needsOperationalApproval = claim.operationalApproverId === currentUserId && !claim.operationalApprovedAt && !ownsClaim; const canRelease = isOperationalManager && claim.operationalApproverId === currentUserId && claim.status === "accepted" && !claim.releasedAt && !ownsClaim; const statusClass = claim.status === "released" ? "badge-success" : claim.status === "accepted" ? "badge-info" : "badge-warning"; return <article className="rounded-md border border-blue-500/20 bg-slate-950/20 p-4" key={claim.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{claim.jobNature || "Travel expense claim"}</h3><Badge className={statusClass}>{claim.status}</Badge>{ownsClaim && <Badge variant="outline">Your claim</Badge>}</div><p className="muted mt-1 text-sm">{claim.claimantName} · submitted {displayDate(claim.createdAt)} · claim date {new Date(claim.claimDate).toLocaleDateString()}</p><p className="mt-2 text-sm">{claim.department || "Department not specified"} · {transportLabels[claim.transportMode as TransportMode] || claim.transportMode} · {claim.lines.length} expense line{claim.lines.length === 1 ? "" : "s"}</p></div><div className="text-right"><strong className="text-lg text-emerald-200">{money(Number(claim.totalAmount), claim.currency)}</strong><p className="muted text-xs">{claim.currency}</p><Button size="sm" variant="outline" className="mt-2" onClick={() => printClaim(claim)}><Printer size={15} /> Print / Save PDF</Button></div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className={claim.managerApprovedAt ? "rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3" : "rounded-md border border-blue-500/20 bg-slate-950/25 p-3"}><strong className="text-sm">Manager approval</strong><p className="muted mt-1 text-xs">{claim.managerApproverName}</p><p className="mt-1 text-xs">{claim.managerApprovedAt ? `Approved ${displayDate(claim.managerApprovedAt)}` : "Awaiting approval"}</p>{needsManagerApproval && <Button size="sm" className="mt-3 blueprint-button" disabled={managerApproval.isPending} onClick={() => managerApproval.mutate({ id: claim.id })}><CheckCircle2 size={15} /> Approve as Manager</Button>}</div><div className={claim.operationalApprovedAt ? "rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3" : "rounded-md border border-blue-500/20 bg-slate-950/25 p-3"}><strong className="text-sm">Operational approval</strong><p className="muted mt-1 text-xs">{claim.operationalApproverName}</p><p className="mt-1 text-xs">{claim.operationalApprovedAt ? `Approved ${displayDate(claim.operationalApprovedAt)}` : "Awaiting approval"}</p>{needsOperationalApproval && <Button size="sm" className="mt-3 blueprint-button" disabled={operationalApproval.isPending} onClick={() => operationalApproval.mutate({ id: claim.id })}><CheckCircle2 size={15} /> Approve operationally</Button>}</div><div className={claim.releasedAt ? "rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3" : "rounded-md border border-blue-500/20 bg-slate-950/25 p-3"}><strong className="text-sm">Release</strong><p className="mt-1 text-xs">{claim.releasedAt ? `Released ${displayDate(claim.releasedAt)}` : claim.status === "accepted" ? "Ready for operational release" : "Available after both approvals"}</p>{canRelease && <Button size="sm" className="mt-3 blueprint-button" disabled={release.isPending} onClick={() => release.mutate({ id: claim.id })}><CircleDollarSign size={15} /> Mark released</Button>}</div></div>{claim.jobReport && <p className="mt-4 rounded-md bg-slate-950/25 p-3 text-sm text-slate-300"><strong>Job report: </strong>{claim.jobReport}</p>}</article>; })}</div>}</CardContent></Card>
      </section>
    </main>
  </div>;
}
