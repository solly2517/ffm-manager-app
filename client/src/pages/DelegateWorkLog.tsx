import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ClipboardCheck, FileText, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { mondayForDate } from "@/lib/workLogValidation";
import { formatPlan, MAX_HOSPITALS_PER_DAY, MIN_HOSPITALS_PER_DAY, planIsComplete, planPayload, sixDayHospitalPlan, type ScheduledClinicalVisit, type ScheduledPlanDay } from "@/lib/workLogSchedule";
import { parseWeeklySchedule } from "@shared/workLogRules";

const localDate = () => new Date().toISOString().slice(0, 10);
const statusTone = (status: string) => status === "approved" || status === "reviewed" ? "badge-success" : "badge-warning";
const blankDoctorVisit = (date: string): ScheduledClinicalVisit => ({ date, clientId: "", doctorId: "" });

type Client = { id: number; name: string };
type Doctor = { id: number; clientId: number; name: string; specialty?: string | null };

function HospitalPlanDay({ day, index, onChange, clients, doctors }: { day: ScheduledPlanDay; index: number; onChange: (next: ScheduledPlanDay) => void; clients: Client[]; doctors: Doctor[] }) {
  const updateVisit = (visitIndex: number, patch: Partial<ScheduledClinicalVisit>) => onChange({ ...day, visits: day.visits.map((visit, position) => position === visitIndex ? { ...visit, ...patch } : visit) });
  const addHospital = () => onChange({ ...day, visits: [...day.visits, blankDoctorVisit(day.date)] });
  const removeHospital = (visitIndex: number) => onChange({ ...day, visits: day.visits.filter((_, position) => position !== visitIndex) });

  return <div className="border border-slate-700 rounded-md p-3 space-y-3">
    <div className="flex items-center justify-between gap-3"><strong className="text-cyan-200">Day {index + 1}</strong><span className="text-xs text-slate-400">{day.date} · {day.visits.length}/{MAX_HOSPITALS_PER_DAY} hospitals</span></div>
    {day.visits.map((visit, visitIndex) => {
      const matchingDoctors = doctors.filter((doctor) => doctor.clientId === Number(visit.clientId));
      return <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]" key={`${day.date}-${visitIndex}`}>
        <select aria-label={`Day ${index + 1} hospital ${visitIndex + 1}`} className="blueprint-input" value={visit.clientId} onChange={(event) => updateVisit(visitIndex, { clientId: event.target.value, doctorId: "" })}><option value="">Select hospital</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
        <select aria-label={`Day ${index + 1} doctor ${visitIndex + 1}`} className="blueprint-input" value={visit.doctorId} disabled={!visit.clientId} onChange={(event) => updateVisit(visitIndex, { doctorId: event.target.value })}><option value="">{visit.clientId ? "Select registered doctor" : "Select hospital first"}</option>{matchingDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ""}</option>)}</select>
        <Button type="button" variant="outline" size="icon" aria-label={`Remove hospital ${visitIndex + 1} from day ${index + 1}`} disabled={day.visits.length <= MIN_HOSPITALS_PER_DAY} onClick={() => removeHospital(visitIndex)}><Trash2 size={15} /></Button>
      </div>;
    })}
    <Button type="button" variant="outline" size="sm" disabled={day.visits.length >= MAX_HOSPITALS_PER_DAY} onClick={addHospital}><Plus size={15} /> Add hospital</Button>
  </div>;
}

function DoctorVisitRows({ entries, onChange, reportDate, plannedClients, doctors }: { entries: ScheduledClinicalVisit[]; onChange: (next: ScheduledClinicalVisit[]) => void; reportDate: string; plannedClients: Client[]; doctors: Doctor[] }) {
  const update = (index: number, patch: Partial<ScheduledClinicalVisit>) => onChange(entries.map((entry, position) => position === index ? { ...entry, ...patch } : entry));
  const addDoctorVisit = () => onChange([...entries, blankDoctorVisit(reportDate)]);
  const removeDoctorVisit = (index: number) => onChange(entries.filter((_, position) => position !== index));
  return <div className="space-y-3">
    {entries.map((entry, index) => {
      const matchingDoctors = doctors.filter((doctor) => doctor.clientId === Number(entry.clientId));
      return <div className="border border-slate-700 rounded-md p-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]" key={`daily-doctor-${index}`}>
        <select aria-label={`Doctor visit ${index + 1} hospital`} className="blueprint-input" value={entry.clientId} onChange={(event) => update(index, { date: reportDate, clientId: event.target.value, doctorId: "" })}><option value="">Select a planned hospital</option>{plannedClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
        <select aria-label={`Doctor visit ${index + 1} doctor`} className="blueprint-input" value={entry.doctorId} disabled={!entry.clientId} onChange={(event) => update(index, { date: reportDate, doctorId: event.target.value })}><option value="">{entry.clientId ? "Select registered doctor" : "Select hospital first"}</option>{matchingDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ""}</option>)}</select>
        <Button type="button" variant="outline" size="icon" aria-label={`Remove doctor visit ${index + 1}`} disabled={entries.length <= 3} onClick={() => removeDoctorVisit(index)}><Trash2 size={15} /></Button>
      </div>;
    })}
    <Button type="button" variant="outline" size="sm" disabled={!plannedClients.length} onClick={addDoctorVisit}><Plus size={15} /> Add doctor visit</Button>
  </div>;
}

export default function DelegateWorkLog() {
  const { user, loading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const clientsQuery = trpc.operations.clients.useQuery(undefined, { enabled: isAuthenticated });
  const doctorsQuery = trpc.operations.doctors.useQuery(undefined, { enabled: isAuthenticated });
  const weeklyPlans = trpc.delegatePlanning.weeklyPlans.useQuery(undefined, { enabled: isAuthenticated });
  const dailyReports = trpc.delegatePlanning.dailyReports.useQuery(undefined, { enabled: isAuthenticated });
  const submitWeekly = trpc.delegatePlanning.submitWeeklyPlan.useMutation({ onSuccess: () => utils.delegatePlanning.weeklyPlans.invalidate() });
  const submitDaily = trpc.delegatePlanning.submitDailyReport.useMutation({ onSuccess: () => utils.delegatePlanning.dailyReports.invalidate() });
  const reviewWeekly = trpc.delegatePlanning.reviewWeeklyPlan.useMutation({ onSuccess: () => utils.delegatePlanning.weeklyPlans.invalidate() });
  const reviewDaily = trpc.delegatePlanning.reviewDailyReport.useMutation({ onSuccess: () => utils.delegatePlanning.dailyReports.invalidate() });
  const [weekOf, setWeekOf] = useState(() => mondayForDate(localDate()));
  const [weekEntries, setWeekEntries] = useState<ScheduledPlanDay[]>(() => sixDayHospitalPlan(mondayForDate(localDate())));
  const [reportDate, setReportDate] = useState(localDate());
  const [dailyEntries, setDailyEntries] = useState<ScheduledClinicalVisit[]>(() => Array.from({ length: 3 }, () => blankDoctorVisit(localDate())));
  const [summary, setSummary] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [challenges, setChallenges] = useState("");
  const [nextActions, setNextActions] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const isDelegate = user?.role === "delegate";
  const isManager = user?.role === "manager";
  const clients = clientsQuery.data ?? [];
  const doctors = doctorsQuery.data ?? [];
  const busy = clientsQuery.isLoading || doctorsQuery.isLoading;
  const clientName = (id: string | number) => clients.find((client) => client.id === Number(id))?.name || "Hospital";
  const doctorName = (id: string | number) => doctors.find((doctor) => doctor.id === Number(id))?.name || "Doctor";

  useEffect(() => { setWeekEntries(sixDayHospitalPlan(weekOf)); }, [weekOf]);
  const plannedHospitalIds = useMemo(() => Array.from(new Set((weeklyPlans.data ?? []).filter((plan) => plan.status !== "rejected").flatMap((plan) => parseWeeklySchedule(plan.scheduleJson).filter((day) => day.date === reportDate).flatMap((day) => day.visits.map((visit) => visit.clientId))))), [reportDate, weeklyPlans.data]);
  const plannedClients = useMemo(() => clients.filter((client) => plannedHospitalIds.includes(client.id)), [clients, plannedHospitalIds]);
  const changeReportDate = (value: string) => { setReportDate(value); setDailyEntries((entries) => entries.map((entry) => ({ ...entry, date: value, clientId: "", doctorId: "" }))); };
  const changePlanDay = (index: number, next: ScheduledPlanDay) => setWeekEntries((entries) => entries.map((day, position) => position === index ? next : day));
  const submitPlan = () => {
    if (!planIsComplete(weekEntries)) { setNoticeError(true); setNotice("Each of the six plan days must contain 3 to 6 different hospitals and a registered doctor for every hospital."); return; }
    const schedule = planPayload(weekEntries);
    submitWeekly.mutate({ weekOf: new Date(`${weekOf}T12:00:00`), objectives: "Six-day Delegate hospital and doctor visit plan", plannedVisits: formatPlan(weekEntries, clientName, doctorName), schedule }, { onSuccess: () => { setNoticeError(false); setNotice("Six-day plan submitted. Daily reports can now use the planned hospitals on their matching dates."); }, onError: (error) => { setNoticeError(true); setNotice(error.message); } });
  };
  const submitReport = () => {
    if (!plannedClients.length) { setNoticeError(true); setNotice("No submitted plan covers this date. Submit the weekly plan first, then choose the matching report date."); return; }
    if (dailyEntries.length < 3 || dailyEntries.some((entry) => !entry.clientId || !entry.doctorId)) { setNoticeError(true); setNotice("Record at least three doctor visits with a planned hospital and registered doctor for each visit."); return; }
    if (new Set(dailyEntries.map((entry) => `${entry.clientId}:${entry.doctorId}`)).size !== dailyEntries.length) { setNoticeError(true); setNotice("Choose each doctor only once in the daily report."); return; }
    if (summary.trim().length < 3 || outcomes.trim().length < 3) { setNoticeError(true); setNotice("Enter an activity summary and outcome before submitting the daily report."); return; }
    submitDaily.mutate({ reportDate: new Date(`${reportDate}T12:00:00`), visits: dailyEntries.map((entry) => ({ date: entry.date, clientId: Number(entry.clientId), doctorId: Number(entry.doctorId) })), summary, outcomes, challenges: challenges || undefined, nextActions: nextActions || undefined }, { onSuccess: () => { setSummary(""); setOutcomes(""); setChallenges(""); setNextActions(""); setNoticeError(false); setNotice("Daily doctor-visit report submitted for Manager review."); }, onError: (error) => { setNoticeError(true); setNotice(error.message); } });
  };

  if (loading) return <div className="blueprint-page"><div className="blueprint-loader">Loading FFM Work Log…</div></div>;
  if (!isDelegate && !isManager) return <div className="blueprint-page"><Card className="login-card blueprint-card"><h1>Work Log is role restricted</h1><p className="muted">This workspace is for Delegates and their assigned Managers.</p></Card></div>;

  return <div className="blueprint-page"><div className="blueprint-grid" /><main className="container py-8 relative z-10"><a href={isDelegate ? "/delegate" : "/"} className="inline-flex items-center gap-2 text-sm text-cyan-300 mb-6"><ArrowLeft size={16} /> Back to workspace</a><div className="mb-8"><p className="eyebrow">FFM / FIELD PERFORMANCE</p><h1 className="text-4xl font-bold text-white">{isDelegate ? "My hospital plans & doctor visits" : "Delegate plans & reports"}</h1><p className="muted mt-2">Every plan day contains 3–6 hospitals. Daily reports use only that date’s planned hospitals and can record any registered doctor at each hospital.</p></div>{notice && <div className={`admin-feedback mb-5 ${noticeError ? "error" : "success"}`}>{notice}</div>}{isDelegate && <div className="grid lg:grid-cols-2 gap-6"><Card className="blueprint-card"><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays size={20} /> Six-day weekly plan</CardTitle><p className="muted">For every day, select at least 3 and no more than 6 different hospitals. Select one linked doctor for each planned hospital.</p></CardHeader><CardContent className="form-stack"><label>Week starting Monday</label><Input type="date" value={weekOf} onChange={(event) => setWeekOf(mondayForDate(event.target.value))} /><div className="space-y-4">{weekEntries.map((day, index) => <HospitalPlanDay key={day.date} day={day} index={index} onChange={(next) => changePlanDay(index, next)} clients={clients} doctors={doctors} />)}</div><Button className="blueprint-button" disabled={busy || submitWeekly.isPending} onClick={submitPlan}>{submitWeekly.isPending ? "Submitting…" : "Submit six-day plan"}</Button></CardContent></Card><Card className="blueprint-card"><CardHeader><CardTitle className="flex items-center gap-2"><FileText size={20} /> Daily visits & report</CardTitle><p className="muted">Choose a report date, then record at least 3 doctor visits. You may add as many registered doctors as visited at each hospital planned for that date.</p></CardHeader><CardContent className="form-stack"><label>Report date</label><Input type="date" value={reportDate} onChange={(event) => changeReportDate(event.target.value)} /><p className={plannedClients.length ? "text-sm text-emerald-300" : "text-sm text-amber-300"}>{plannedClients.length ? `${plannedClients.length} planned hospital${plannedClients.length === 1 ? "" : "s"} available for this date.` : "No submitted weekly plan hospitals are available for this date yet."}</p><DoctorVisitRows entries={dailyEntries} onChange={setDailyEntries} reportDate={reportDate} plannedClients={plannedClients} doctors={doctors} /><label>Activity summary</label><Textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Visit and key activity…" /><label>Outcomes achieved</label><Textarea value={outcomes} onChange={(event) => setOutcomes(event.target.value)} placeholder="Decisions, completed actions, and results…" /><label>Challenges (optional)</label><Textarea value={challenges} onChange={(event) => setChallenges(event.target.value)} placeholder="Delays or help needed…" /><label>Next actions (optional)</label><Textarea value={nextActions} onChange={(event) => setNextActions(event.target.value)} placeholder="Action — owner — expected date…" /><Button className="blueprint-button" disabled={busy || submitDaily.isPending || !plannedClients.length} onClick={submitReport}>{submitDaily.isPending ? "Submitting…" : "Submit daily report"}</Button></CardContent></Card></div>}<div className="grid lg:grid-cols-2 gap-6 mt-6"><Card className="blueprint-card"><CardHeader><CardTitle>Weekly plans</CardTitle></CardHeader><CardContent className="space-y-4">{weeklyPlans.isLoading ? <p className="muted">Loading weekly plans…</p> : weeklyPlans.data?.length ? weeklyPlans.data.map((plan) => <div key={plan.id} className="border border-slate-700 p-4"><div className="flex justify-between gap-3"><strong>{isManager ? plan.delegateName : `Week of ${new Date(plan.weekOf).toLocaleDateString()}`}</strong><Badge className={statusTone(plan.status)}>{plan.status}</Badge></div><p className="mt-2 muted whitespace-pre-wrap">{plan.plannedVisits}</p>{isManager && plan.status === "pending" && <div className="flex gap-2 mt-3"><Button size="sm" className="blueprint-button" onClick={() => reviewWeekly.mutate({ id: plan.id, status: "approved" })}>Approve</Button><Button size="sm" variant="outline" onClick={() => reviewWeekly.mutate({ id: plan.id, status: "rejected", reviewNote: "Please revise the plan and resubmit." })}>Request revision</Button></div>}</div>) : <p className="muted">No weekly plans submitted yet.</p>}</CardContent></Card><Card className="blueprint-card"><CardHeader><CardTitle>Daily reports</CardTitle></CardHeader><CardContent className="space-y-4">{dailyReports.isLoading ? <p className="muted">Loading daily reports…</p> : dailyReports.data?.length ? dailyReports.data.map((report) => <div key={report.id} className="border border-slate-700 p-4"><div className="flex justify-between gap-3"><strong>{isManager ? report.delegateName : new Date(report.reportDate).toLocaleDateString()}</strong><Badge className={statusTone(report.status)}>{report.status}</Badge></div><p className="mt-2 text-white whitespace-pre-wrap"><strong>Visits & summary:</strong>{`\n${report.summary}`}</p><p className="mt-2 muted"><strong>Outcomes:</strong> {report.outcomes}</p>{isManager && report.status === "submitted" && <Button size="sm" className="blueprint-button mt-3" onClick={() => reviewDaily.mutate({ id: report.id })}><ClipboardCheck size={15} /> Mark reviewed</Button>}</div>) : <p className="muted">No daily reports submitted yet.</p>}</CardContent></Card></div></main></div>;
}
