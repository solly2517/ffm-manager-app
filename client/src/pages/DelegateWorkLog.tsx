import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ClipboardCheck, FileText, ArrowLeft } from "lucide-react";
import { mondayForDate } from "@/lib/workLogValidation";
import { scheduleAsText, scheduleIsComplete, sixDaySchedule, type ScheduledClinicalVisit } from "@/lib/workLogSchedule";

const localDate = () => new Date().toISOString().slice(0, 10);
const statusTone = (status: string) => status === "approved" || status === "reviewed" ? "badge-success" : "badge-warning";

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
  const [schedule, setSchedule] = useState<ScheduledClinicalVisit[]>(() => sixDaySchedule(mondayForDate(localDate())));
  const [dailyClientId, setDailyClientId] = useState("");
  const [dailyDoctorId, setDailyDoctorId] = useState("");
  const [reportDate, setReportDate] = useState(localDate());
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
  const dailyDoctors = doctors.filter((doctor) => doctor.clientId === Number(dailyClientId));
  useEffect(() => { setSchedule(sixDaySchedule(weekOf)); }, [weekOf]);
  const updateSchedule = (index: number, patch: Partial<ScheduledClinicalVisit>) => setSchedule((current) => current.map((entry, position) => position === index ? { ...entry, ...patch } : entry));
  const submitSixDayPlan = () => {
    if (!scheduleIsComplete(schedule)) { setNoticeError(true); setNotice("Complete the date, hospital, and doctor for all six days before submitting the weekly plan."); return; }
    const first = schedule[0];
    const text = scheduleAsText(schedule, clientName, doctorName);
    submitWeekly.mutate({ clientId: Number(first.clientId), doctorId: Number(first.doctorId), weekOf: new Date(`${weekOf}T12:00:00`), objectives: "Six-day Delegate visit schedule", plannedVisits: text }, { onSuccess: () => { setNoticeError(false); setNotice("Six-day visit plan submitted for Manager review."); }, onError: (error) => { setNoticeError(true); setNotice(error.message); } });
  };
  const submitDailyReport = () => {
    if (!dailyClientId || !dailyDoctorId || summary.trim().length < 3 || outcomes.trim().length < 3) { setNoticeError(true); setNotice("Select the hospital and doctor, then enter a short activity summary and outcome before submitting the daily report."); return; }
    submitDaily.mutate({ clientId: Number(dailyClientId), doctorId: Number(dailyDoctorId), reportDate: new Date(`${reportDate}T12:00:00`), summary, outcomes, challenges: challenges || undefined, nextActions: nextActions || undefined }, { onSuccess: () => { setSummary(""); setOutcomes(""); setChallenges(""); setNextActions(""); setNoticeError(false); setNotice("Daily activity report submitted for Manager review."); }, onError: (error) => { setNoticeError(true); setNotice(error.message); } });
  };
  if (loading) return <div className="blueprint-page"><div className="blueprint-loader">Loading FFM Work Log…</div></div>;
  if (!isDelegate && !isManager) return <div className="blueprint-page"><Card className="login-card blueprint-card"><h1>Work Log is role restricted</h1><p className="muted">This workspace is for Delegates and their assigned Managers.</p></Card></div>;
  return <div className="blueprint-page"><div className="blueprint-grid"/><main className="container py-8 relative z-10"><a href={isDelegate ? "/delegate" : "/"} className="inline-flex items-center gap-2 text-sm text-cyan-300 mb-6"><ArrowLeft size={16}/> Back to workspace</a><div className="mb-8"><p className="eyebrow">FFM / FIELD PERFORMANCE</p><h1 className="text-4xl font-bold text-white">{isDelegate ? "My six-day plan & daily reports" : "Delegate plans & daily reports"}</h1><p className="muted mt-2">{isDelegate ? "Plan six days by date, hospital, and doctor. Submit reports directly in FFM." : "Review submissions from your assigned Delegates."}</p></div>{notice && <div className={`admin-feedback mb-5 ${noticeError ? "error" : "success"}`}>{notice}</div>}
    {isDelegate && <div className="grid lg:grid-cols-2 gap-6"><Card className="blueprint-card"><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays size={20}/> Six-day visit plan</CardTitle><p className="muted">Enter one hospital and a linked doctor for each of six consecutive days.</p></CardHeader><CardContent className="form-stack"><label>Week starting Monday</label><Input type="date" value={weekOf} onChange={(event) => setWeekOf(mondayForDate(event.target.value))}/>{schedule.map((entry, index) => { const matchingDoctors = doctors.filter((doctor) => doctor.clientId === Number(entry.clientId)); return <div className="border border-slate-700 p-3 space-y-2" key={entry.date}><strong className="text-cyan-200">Day {index + 1} · {new Date(`${entry.date}T12:00:00`).toLocaleDateString()}</strong><Input type="date" value={entry.date} onChange={(event) => updateSchedule(index, { date: event.target.value })}/><select className="blueprint-input" value={entry.clientId} onChange={(event) => updateSchedule(index, { clientId: event.target.value, doctorId: "" })}><option value="">Select hospital</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><select className="blueprint-input" value={entry.doctorId} disabled={!entry.clientId} onChange={(event) => updateSchedule(index, { doctorId: event.target.value })}><option value="">{entry.clientId ? "Select doctor" : "Select hospital first"}</option>{matchingDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ""}</option>)}</select></div>; })}<Button className="blueprint-button" disabled={busy || submitWeekly.isPending} onClick={submitSixDayPlan}>{submitWeekly.isPending ? "Submitting…" : "Submit six-day plan"}</Button></CardContent></Card>
      <Card className="blueprint-card"><CardHeader><CardTitle className="flex items-center gap-2"><FileText size={20}/> Daily activity report</CardTitle><p className="muted">Select the hospital and linked doctor, then record the outcome.</p></CardHeader><CardContent className="form-stack"><label>Hospital / client</label><select className="blueprint-input" value={dailyClientId} onChange={(event) => { setDailyClientId(event.target.value); setDailyDoctorId(""); }}><option value="">Select hospital from FFM database</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><label>Doctor</label><select className="blueprint-input" value={dailyDoctorId} disabled={!dailyClientId} onChange={(event) => setDailyDoctorId(event.target.value)}><option value="">{dailyClientId ? "Select doctor" : "Select hospital first"}</option>{dailyDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ""}</option>)}</select><label>Report date</label><Input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)}/><label>Activity summary</label><Textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Visit and key activity…"/><label>Outcomes achieved</label><Textarea value={outcomes} onChange={(event) => setOutcomes(event.target.value)} placeholder="Decisions, completed actions, and results…"/><label>Challenges (optional)</label><Textarea value={challenges} onChange={(event) => setChallenges(event.target.value)} placeholder="Delays or help needed…"/><label>Next actions (optional)</label><Textarea value={nextActions} onChange={(event) => setNextActions(event.target.value)} placeholder="Action — owner — expected date…"/><Button className="blueprint-button" disabled={busy || submitDaily.isPending} onClick={submitDailyReport}>{submitDaily.isPending ? "Submitting…" : "Submit daily report"}</Button></CardContent></Card></div>}
    <div className="grid lg:grid-cols-2 gap-6 mt-6"><Card className="blueprint-card"><CardHeader><CardTitle>Weekly plans</CardTitle></CardHeader><CardContent className="space-y-4">{weeklyPlans.isLoading ? <p className="muted">Loading weekly plans…</p> : weeklyPlans.data?.length ? weeklyPlans.data.map((plan) => <div key={plan.id} className="border border-slate-700 p-4"><div className="flex justify-between gap-3"><strong>{isManager ? plan.delegateName : `Week of ${new Date(plan.weekOf).toLocaleDateString()}`}</strong><Badge className={statusTone(plan.status)}>{plan.status}</Badge></div><p className="mt-2 muted whitespace-pre-wrap"><strong>Six-day schedule:</strong>{`\n${plan.plannedVisits}`}</p>{plan.reviewNote && <p className="mt-2 text-cyan-200"><strong>Manager note:</strong> {plan.reviewNote}</p>}{isManager && plan.status === "pending" && <div className="flex gap-2 mt-3"><Button size="sm" className="blueprint-button" onClick={() => reviewWeekly.mutate({ id: plan.id, status: "approved" })}>Approve</Button><Button size="sm" variant="outline" onClick={() => reviewWeekly.mutate({ id: plan.id, status: "rejected", reviewNote: "Please revise the plan and resubmit." })}>Request revision</Button></div>}</div>) : <p className="muted">No weekly plans submitted yet.</p>}</CardContent></Card>
      <Card className="blueprint-card"><CardHeader><CardTitle>Daily reports</CardTitle></CardHeader><CardContent className="space-y-4">{dailyReports.isLoading ? <p className="muted">Loading daily reports…</p> : dailyReports.data?.length ? dailyReports.data.map((report) => <div key={report.id} className="border border-slate-700 p-4"><div className="flex justify-between gap-3"><strong>{isManager ? report.delegateName : new Date(report.reportDate).toLocaleDateString()}</strong><Badge className={statusTone(report.status)}>{report.status}</Badge></div><p className="mt-2 text-cyan-200"><strong>{clientName(report.clientId)}</strong> · {doctorName(report.doctorId)}</p><p className="mt-2 text-white"><strong>Summary:</strong> {report.summary}</p><p className="mt-2 muted"><strong>Outcomes:</strong> {report.outcomes}</p>{report.challenges && <p className="mt-2 muted"><strong>Challenges:</strong> {report.challenges}</p>}{report.nextActions && <p className="mt-2 muted"><strong>Next:</strong> {report.nextActions}</p>}{report.managerNote && <p className="mt-2 text-cyan-200"><strong>Manager note:</strong> {report.managerNote}</p>}{isManager && report.status === "submitted" && <Button size="sm" className="blueprint-button mt-3" onClick={() => reviewDaily.mutate({ id: report.id })}><ClipboardCheck size={15}/> Mark reviewed</Button>}</div>) : <p className="muted">No daily reports submitted yet.</p>}</CardContent></Card></div>
  </main></div>;
}
