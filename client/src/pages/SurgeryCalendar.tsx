import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronLeft, ChevronRight, FileCheck2, PackagePlus, Upload, ArrowLeft } from "lucide-react";

type CalendarStatus = "notified" | "confirmed" | "postponed" | "cancelled" | "completed";
const statuses: CalendarStatus[] = ["notified", "confirmed", "postponed", "cancelled", "completed"];
const statusClasses: Record<CalendarStatus, string> = {
  notified: "border-sky-400/40 bg-sky-500/15 text-sky-100",
  confirmed: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  postponed: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  cancelled: "border-rose-400/40 bg-rose-500/15 text-rose-100",
  completed: "border-violet-400/40 bg-violet-500/15 text-violet-100",
};

const dateKey = (value: Date | string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const toDateTimeLocal = (value: Date | string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function SurgeryCalendar() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedSurgeryId, setSelectedSurgeryId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleStatus, setScheduleStatus] = useState<CalendarStatus>("notified");
  const [implantName, setImplantName] = useState("");
  const [implantQuantity, setImplantQuantity] = useState("1");
  const [lotNumber, setLotNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [implantNotes, setImplantNotes] = useState("");
  const [proofNote, setProofNote] = useState("");
  const calendarQuery = trpc.operations.surgeryCalendar.useQuery(undefined, { enabled: isAuthenticated });
  const selected = (calendarQuery.data ?? []).find((surgery) => surgery.id === selectedSurgeryId) ?? null;
  const resourcesQuery = trpc.operations.surgeryResources.useQuery({ surgeryId: selectedSurgeryId ?? 0 }, { enabled: isAuthenticated && selectedSurgeryId !== null });
  const updateSchedule = trpc.operations.updateSurgerySchedule.useMutation({
    onSuccess: () => { setNotice("Surgery calendar entry updated."); calendarQuery.refetch(); utils.operations.surgeries.invalidate(); },
    onError: (error) => setNotice(error.message),
  });
  const addImplant = trpc.operations.addSurgeryImplant.useMutation({
    onSuccess: () => { setImplantName(""); setImplantQuantity("1"); setLotNumber(""); setSerialNumber(""); setImplantNotes(""); setNotice("Implant registered in the surgery record."); resourcesQuery.refetch(); },
    onError: (error) => setNotice(error.message),
  });
  const uploadProof = trpc.operations.uploadSurgeryDeliveryProof.useMutation({
    onSuccess: () => { setProofNote(""); setNotice("Patient-sheet delivery proof uploaded securely."); resourcesQuery.refetch(); },
    onError: (error) => setNotice(error.message),
  });
  const canWrite = user?.role === "delegate" || user?.role === "manager";

  useEffect(() => {
    if (!selected) return;
    setScheduleDate(toDateTimeLocal(selected.surgeryDate));
    setScheduleStatus(selected.calendarStatus);
    setNotice("");
  }, [selected?.id]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);
  const surgeriesByDay = useMemo(() => {
    const grouped = new Map<string, typeof calendarQuery.data>();
    for (const surgery of calendarQuery.data ?? []) {
      const key = dateKey(surgery.surgeryDate);
      grouped.set(key, [...(grouped.get(key) ?? []), surgery]);
    }
    return grouped;
  }, [calendarQuery.data]);

  const uploadPatientSheet = (file: File | undefined) => {
    if (!file || !selected) return;
    const accepted = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
    if (!accepted.includes(file.type as typeof accepted[number])) { setNotice("Use a PDF, JPEG, PNG, or WebP patient-sheet copy."); return; }
    if (file.size > 8 * 1024 * 1024) { setNotice("Patient-sheet files must be 8 MB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => uploadProof.mutate({ surgeryId: selected.id, fileName: file.name, mimeType: file.type as typeof accepted[number], base64: String(reader.result || ""), note: proofNote || undefined });
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="blueprint-page"><div className="blueprint-loader">Loading surgery calendar…</div></div>;
  if (!isAuthenticated) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><div className="logo-mark">FFM</div><p className="eyebrow">SHARED SURGERY CALENDAR</p><h1>FFM Surgery Calendar</h1><p className="muted">Sign in to view the current surgery schedule.</p><Button className="w-full mt-6 blueprint-button" onClick={() => startLogin()}>Sign in securely</Button></Card></div>;

  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return <div className="manager-shell"><aside className="manager-sidebar"><div className="brand-lockup"><div className="logo-mark small">FFM</div><div><strong>FFM Calendar</strong><span>Surgery planning</span></div></div><div className="sidebar-rule"/><nav><a className="sidebar-link" href="/"><ArrowLeft size={17}/><span>Back to workspace</span></a></nav><div className="sidebar-user"><div className="avatar">{(user?.name || user?.email || "F")[0].toUpperCase()}</div><div className="user-copy"><strong>{user?.name || "Authenticated user"}</strong><span>{user?.role?.replace("_", " ")}</span></div><button className="logout-icon" onClick={() => logout()} title="Sign out">Sign out</button></div></aside><main className="manager-main"><header className="manager-topbar"><div><p className="topbar-kicker">FFM / SHARED PLANNING</p><h2>Surgery calendar</h2></div><div className="topbar-actions"><div className="live-indicator"><span/> All roles can view</div></div></header><section className="manager-content"><div className="page-intro"><div><p className="eyebrow">Advance hospital notice</p><h1>Plan surgeries 2–7 days ahead.</h1><p className="muted">Delegates and Managers can create or update entries within their assignment scope. Administrators, Warehouse Heroes, and standard users can review the shared schedule only.</p></div><Badge variant="outline">{calendarQuery.data?.length ?? 0} live surgeries</Badge></div>{notice && <div className={notice.includes("updated") || notice.includes("registered") || notice.includes("uploaded") ? "admin-feedback success" : "admin-feedback error"}>{notice}</div>}<div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]"><Card className="blueprint-card"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>{monthLabel}</CardTitle><p className="muted">Select a surgery to view its materials and hospital proof.</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft size={16}/></Button><Button size="sm" variant="outline" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight size={16}/></Button></div></div></CardHeader><CardContent>{calendarQuery.isLoading ? <div className="admin-feedback">Loading the shared surgery schedule…</div> : calendarQuery.error ? <div className="admin-feedback error">Unable to load calendar: {calendarQuery.error.message}</div> : <><div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-slate-400">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}</div><div className="grid grid-cols-7 gap-1">{days.map((day) => { const dayEvents = surgeriesByDay.get(dateKey(day)) ?? []; const inMonth = day.getMonth() === month.getMonth(); return <div key={day.toISOString()} className={`min-h-28 border border-blue-500/20 p-1.5 ${inMonth ? "bg-slate-950/25" : "bg-slate-950/60 text-slate-600"}`}><div className="mb-1 text-xs font-semibold">{day.getDate()}</div><div className="space-y-1">{dayEvents.slice(0, 2).map((surgery) => <button key={surgery.id} onClick={() => setSelectedSurgeryId(surgery.id)} className={`block w-full border px-1.5 py-1 text-left text-[10px] leading-tight ${statusClasses[surgery.calendarStatus]} ${selectedSurgeryId === surgery.id ? "ring-1 ring-white" : ""}`}><strong className="block truncate">{surgery.procedureName || "Surgery"}</strong><span className="block truncate">{surgery.hospital || "Hospital pending"}</span></button>)}{dayEvents.length > 2 && <span className="block text-[10px] text-slate-400">+{dayEvents.length - 2} more</span>}</div></div>; })}</div></>}</CardContent></Card><Card className="blueprint-card"><CardHeader><div><CardTitle>{selected ? selected.procedureName || "Surgery record" : "Select a surgery"}</CardTitle><p className="muted">{selected ? `${selected.hospital || "Hospital pending"} · ${new Date(selected.surgeryDate).toLocaleString()}` : "Choose any calendar entry to register implants or store proof."}</p></div></CardHeader><CardContent>{selected ? <div className="space-y-5"><div className="rounded-md border border-blue-500/25 bg-slate-950/35 p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge className={statusClasses[selected.calendarStatus]}>{selected.calendarStatus}</Badge><Badge variant="outline">Notified {new Date(selected.notifiedAt).toLocaleDateString()}</Badge></div><p className="mt-3 text-slate-300">{selected.notes || "No additional surgery notes."}</p></div>{canWrite ? <div className="space-y-3"><Label>Calendar appointment</Label><Input type="datetime-local" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)}/><select className="blueprint-input w-full" value={scheduleStatus} onChange={(event) => setScheduleStatus(event.target.value as CalendarStatus)}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><Button className="blueprint-button w-full" disabled={!scheduleDate || updateSchedule.isPending} onClick={() => updateSchedule.mutate({ id: selected.id, surgeryDate: new Date(scheduleDate), calendarStatus: scheduleStatus })}>{updateSchedule.isPending ? "Saving appointment…" : "Save calendar appointment"}</Button></div> : <div className="admin-feedback">Calendar entries are read-only for your role.</div>}<div className="border-t border-blue-500/20 pt-4"><div className="mb-3 flex items-center gap-2"><PackagePlus size={17}/><strong>Implants used</strong></div>{resourcesQuery.isLoading ? <p className="muted">Loading materials…</p> : resourcesQuery.data?.implants.length ? <div className="space-y-2">{resourcesQuery.data.implants.map((implant) => <div className="rounded-md border border-blue-500/20 p-2 text-sm" key={implant.id}><strong>{implant.implantName} × {implant.quantity}</strong><span className="block text-xs text-slate-400">{implant.lotNumber ? `Lot ${implant.lotNumber}` : "Lot not recorded"}{implant.serialNumber ? ` · Serial ${implant.serialNumber}` : ""}</span></div>)}</div> : <p className="muted">No implants registered yet.</p>}{canWrite && <div className="mt-3 space-y-2"><Input value={implantName} onChange={(event) => setImplantName(event.target.value)} placeholder="Implant name"/><div className="grid grid-cols-3 gap-2"><Input type="number" min="1" value={implantQuantity} onChange={(event) => setImplantQuantity(event.target.value)} placeholder="Qty"/><Input value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} placeholder="Lot"/><Input value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="Serial"/></div><Input value={implantNotes} onChange={(event) => setImplantNotes(event.target.value)} placeholder="Optional implant note"/><Button className="blueprint-button w-full" disabled={!implantName.trim() || !Number(implantQuantity) || addImplant.isPending} onClick={() => addImplant.mutate({ surgeryId: selected.id, implantName: implantName.trim(), quantity: Number(implantQuantity), lotNumber: lotNumber || undefined, serialNumber: serialNumber || undefined, notes: implantNotes || undefined })}><PackagePlus size={16}/>{addImplant.isPending ? "Registering…" : "Register implant"}</Button></div>}</div><div className="border-t border-blue-500/20 pt-4"><div className="mb-3 flex items-center gap-2"><FileCheck2 size={17}/><strong>Patient-sheet delivery proof</strong></div>{resourcesQuery.data?.deliveryProofs.length ? <div className="space-y-2">{resourcesQuery.data.deliveryProofs.map((proof) => <a key={proof.id} className="block rounded-md border border-blue-500/20 p-2 text-sm hover:border-blue-300" href={proof.url} target="_blank" rel="noreferrer"><strong className="block truncate">{proof.originalName}</strong><span className="block text-xs text-slate-400">{new Date(proof.createdAt).toLocaleString()} · {(proof.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>{proof.note && <span className="mt-1 block text-slate-300">{proof.note}</span>}</a>)}</div> : <p className="muted">No patient-sheet proof uploaded yet.</p>}{canWrite && <div className="mt-3 space-y-2"><Input value={proofNote} onChange={(event) => setProofNote(event.target.value)} placeholder="Hospital handover note (optional)"/><Label className="flex cursor-pointer items-center justify-center gap-2 border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-100"><Upload size={16}/> Upload patient sheet<input className="hidden" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => uploadPatientSheet(event.target.files?.[0])}/></Label>{uploadProof.isPending && <p className="muted">Uploading hospital proof…</p>}</div>}</div></div> : <div className="admin-feedback">Select a surgery in the calendar to view its record.</div>}</CardContent></Card></div></section></main></div>;
}
