import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
} from "lucide-react";
import { saturdayForDate } from "@/lib/workLogValidation";
import {
  formatPlan,
  MAX_HOSPITALS_PER_DAY,
  MIN_HOSPITALS_PER_DAY,
  planIsComplete,
  planPayload,
  sixDayHospitalPlan,
  type ScheduledHospital,
  type ScheduledPlanDay,
} from "@/lib/workLogSchedule";
import { parseWeeklySchedule } from "@shared/workLogRules";
import { formatFfmDate } from "@/lib/ffmDate";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

const localDate = () => new Date().toISOString().slice(0, 10);
const statusTone = (status: string) =>
  status === "approved" || status === "reviewed" || status === "manager_recorded"
    ? "badge-success"
    : "badge-warning";
const blankHospital = (doctorSlots = 1): ScheduledHospital => ({
  clientId: "",
  doctorIds: Array.from({ length: doctorSlots }, () => ""),
});
type Client = { id: number; name: string };
type Doctor = {
  id: number;
  clientId: number;
  name: string;
  specialty?: string | null;
};

function HospitalDoctorGroup({
  entry,
  title,
  clients,
  doctors,
  onChange,
  onRemove,
  canRemove,
  usedHospitalIds,
  minimumDoctors,
}: {
  entry: ScheduledHospital;
  title: string;
  clients: Client[];
  doctors: Doctor[];
  onChange: (next: ScheduledHospital) => void;
  onRemove: () => void;
  canRemove: boolean;
  usedHospitalIds: string[];
  minimumDoctors: number;
}) {
  const hospitalDoctors = doctors.filter(
    doctor => doctor.clientId === Number(entry.clientId)
  );
  const setHospital = (clientId: string) =>
    onChange({ clientId, doctorIds: [""] });
  const setDoctor = (index: number, doctorId: string) =>
    onChange({
      ...entry,
      doctorIds: entry.doctorIds.map((value, position) =>
        position === index ? doctorId : value
      ),
    });
  const addDoctor = () =>
    onChange({ ...entry, doctorIds: [...entry.doctorIds, ""] });
  const removeDoctor = (index: number) =>
    onChange({
      ...entry,
      doctorIds: entry.doctorIds.filter((_, position) => position !== index),
    });
  return (
    <div className="border border-slate-700 rounded-md p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-cyan-200">{title}</strong>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Remove ${title}`}
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 size={15} />
        </Button>
      </div>
      <select
        aria-label={`${title} hospital`}
        className="blueprint-input"
        value={entry.clientId}
        onChange={event => setHospital(event.target.value)}
      >
        <option value="">Select hospital</option>
        {clients
          .filter(
            client =>
              !usedHospitalIds.includes(String(client.id)) ||
              String(client.id) === entry.clientId
          )
          .map(client => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
      </select>
      {entry.doctorIds.map((doctorId, doctorIndex) => (
        <div
          className="grid gap-2 md:grid-cols-[1fr_auto]"
          key={`${title}-doctor-${doctorIndex}`}
        >
          <select
            aria-label={`${title} doctor ${doctorIndex + 1}`}
            className="blueprint-input"
            value={doctorId}
            disabled={!entry.clientId}
            onChange={event => setDoctor(doctorIndex, event.target.value)}
          >
            <option value="">
              {entry.clientId
                ? "Select registered doctor"
                : "Select hospital first"}
            </option>
            {hospitalDoctors
              .filter(
                doctor =>
                  !entry.doctorIds.includes(String(doctor.id)) ||
                  String(doctor.id) === doctorId
              )
              .map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                  {doctor.specialty ? ` — ${doctor.specialty}` : ""}
                </option>
              ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Remove doctor ${doctorIndex + 1} from ${title}`}
            disabled={entry.doctorIds.length <= minimumDoctors}
            onClick={() => removeDoctor(doctorIndex)}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!entry.clientId}
        onClick={addDoctor}
      >
        <Plus size={15} /> Add doctor
      </Button>
    </div>
  );
}

function HospitalPlanDay({
  day,
  index,
  onChange,
  clients,
  doctors,
}: {
  day: ScheduledPlanDay;
  index: number;
  onChange: (next: ScheduledPlanDay) => void;
  clients: Client[];
  doctors: Doctor[];
}) {
  const updateHospital = (hospitalIndex: number, next: ScheduledHospital) =>
    onChange({
      ...day,
      hospitals: day.hospitals.map((hospital, position) =>
        position === hospitalIndex ? next : hospital
      ),
    });
  const removeHospital = (hospitalIndex: number) =>
    onChange({
      ...day,
      hospitals: day.hospitals.filter(
        (_, position) => position !== hospitalIndex
      ),
    });
  return (
    <div className="border border-slate-700 rounded-md p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-cyan-200">Day {index + 1}</strong>
        <span className="text-xs text-slate-400">
          {day.date} · {day.hospitals.length}/{MAX_HOSPITALS_PER_DAY} hospitals
        </span>
      </div>
      {day.hospitals.map((hospital, hospitalIndex) => (
        <HospitalDoctorGroup
          key={`${day.date}-${hospitalIndex}`}
          entry={hospital}
          title={`Hospital ${hospitalIndex + 1}`}
          clients={clients}
          doctors={doctors}
          onChange={next => updateHospital(hospitalIndex, next)}
          onRemove={() => removeHospital(hospitalIndex)}
          canRemove={day.hospitals.length > MIN_HOSPITALS_PER_DAY}
          usedHospitalIds={day.hospitals
            .filter((_, position) => position !== hospitalIndex)
            .map(entry => entry.clientId)}
          minimumDoctors={1}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={day.hospitals.length >= MAX_HOSPITALS_PER_DAY}
        onClick={() =>
          onChange({ ...day, hospitals: [...day.hospitals, blankHospital()] })
        }
      >
        <Plus size={15} /> Add hospital
      </Button>
    </div>
  );
}

function DailyHospitalGroups({
  entries,
  onChange,
  plannedClients,
  doctors,
}: {
  entries: ScheduledHospital[];
  onChange: (next: ScheduledHospital[]) => void;
  plannedClients: Client[];
  doctors: Doctor[];
}) {
  const totalDoctorVisits = entries.reduce(
    (total, entry) => total + entry.doctorIds.length,
    0
  );
  const updateHospital = (index: number, next: ScheduledHospital) =>
    onChange(
      entries.map((entry, position) => (position === index ? next : entry))
    );
  const removeHospital = (index: number) =>
    onChange(entries.filter((_, position) => position !== index));
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <HospitalDoctorGroup
          key={`daily-hospital-${index}`}
          entry={entry}
          title={`Hospital visit ${index + 1}`}
          clients={plannedClients}
          doctors={doctors}
          onChange={next => updateHospital(index, next)}
          onRemove={() => removeHospital(index)}
          canRemove={entries.length > 1}
          usedHospitalIds={entries
            .filter((_, position) => position !== index)
            .map(hospital => hospital.clientId)}
          minimumDoctors={totalDoctorVisits <= 3 ? entry.doctorIds.length : 1}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!plannedClients.length}
        onClick={() => onChange([...entries, blankHospital()])}
      >
        <Plus size={15} /> Add planned hospital
      </Button>
    </div>
  );
}

export default function DelegateWorkLog() {
  const { user, loading, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const clientsQuery = trpc.operations.clients.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const doctorsQuery = trpc.operations.doctors.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const weeklyPlans = trpc.delegatePlanning.weeklyPlans.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const dailyReports = trpc.delegatePlanning.dailyReports.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const submitWeekly = trpc.delegatePlanning.submitWeeklyPlan.useMutation({
    onSuccess: () => utils.delegatePlanning.weeklyPlans.invalidate(),
  });
  const submitDaily = trpc.delegatePlanning.submitDailyReport.useMutation({
    onSuccess: () => utils.delegatePlanning.dailyReports.invalidate(),
  });
  const reviewWeekly = trpc.delegatePlanning.reviewWeeklyPlan.useMutation({
    onSuccess: () => utils.delegatePlanning.weeklyPlans.invalidate(),
  });
  const reviewDaily = trpc.delegatePlanning.reviewDailyReport.useMutation({
    onSuccess: () => utils.delegatePlanning.dailyReports.invalidate(),
  });
  const [weekOf, setWeekOf] = useState(() => saturdayForDate(localDate()));
  const [weekEntries, setWeekEntries] = useState<ScheduledPlanDay[]>(() =>
    sixDayHospitalPlan(saturdayForDate(localDate()))
  );
  const [reportDate, setReportDate] = useState(localDate());
  const [dailyHospitals, setDailyHospitals] = useState<ScheduledHospital[]>(
    () => [blankHospital(3)]
  );
  const [summary, setSummary] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [challenges, setChallenges] = useState("");
  const [nextActions, setNextActions] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCity, setNewClientCity] = useState("");
  const [newDoctorClientId, setNewDoctorClientId] = useState("");
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newDoctorSpecialty, setNewDoctorSpecialty] = useState("");
  const [directoryNotice, setDirectoryNotice] = useState("");
  const [directoryNoticeError, setDirectoryNoticeError] = useState(false);
  const addClient = trpc.operations.addClient.useMutation({
    onSuccess: client => {
      setNewClientName("");
      setNewClientCity("");
      if (client) setNewDoctorClientId(String(client.id));
      setDirectoryNoticeError(false);
      setDirectoryNotice("Hospital saved. You can now add its linked doctor.");
      utils.operations.clients.invalidate();
    },
    onError: error => {
      setDirectoryNoticeError(true);
      setDirectoryNotice(error.message);
    },
  });
  const addDoctor = trpc.operations.addDoctor.useMutation({
    onSuccess: () => {
      setNewDoctorName("");
      setNewDoctorSpecialty("");
      setDirectoryNoticeError(false);
      setDirectoryNotice("Doctor saved and linked to the selected hospital.");
      utils.operations.doctors.invalidate();
    },
    onError: error => {
      setDirectoryNoticeError(true);
      setDirectoryNotice(error.message);
    },
  });
  const isDelegate = user?.role === "delegate";
  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const canAuthor = isDelegate || isManager || isAdmin;
  const canReview = isManager || isAdmin;
  const authorRoleLabel = isAdmin ? "Administrator" : isManager ? "Manager" : "Delegate";
  const clients = clientsQuery.data ?? [];
  const doctors = doctorsQuery.data ?? [];
  const busy = clientsQuery.isLoading || doctorsQuery.isLoading;
  const clientName = (id: string | number) =>
    clients.find(client => client.id === Number(id))?.name || "Hospital";
  const doctorName = (id: string | number) =>
    doctors.find(doctor => doctor.id === Number(id))?.name || "Doctor";
  useEffect(() => {
    setWeekEntries(sixDayHospitalPlan(weekOf));
  }, [weekOf]);
  const plannedHospitalIds = useMemo(
    () =>
      Array.from(
        new Set(
          (weeklyPlans.data ?? [])
            .filter(plan => plan.authorId === user?.id)
            .filter(plan => plan.status !== "rejected")
            .flatMap(plan =>
              parseWeeklySchedule(plan.scheduleJson)
                .filter(day => day.date === reportDate)
                .flatMap(day => day.visits.map(visit => visit.clientId))
            )
        )
      ),
    [reportDate, user?.id, weeklyPlans.data]
  );
  const plannedClients = useMemo(
    () => clients.filter(client => plannedHospitalIds.includes(client.id)),
    [clients, plannedHospitalIds]
  );
  const changeReportDate = (value: string) => {
    setReportDate(value);
    setDailyHospitals([blankHospital(3)]);
  };
  const changePlanDay = (index: number, next: ScheduledPlanDay) =>
    setWeekEntries(entries =>
      entries.map((day, position) => (position === index ? next : day))
    );
  const submitPlan = () => {
    if (!planIsComplete(weekEntries)) {
      setNoticeError(true);
      setNotice(
        "Each plan day needs 3 to 6 different hospitals. Every hospital may include one or more registered doctors."
      );
      return;
    }
    const schedule = planPayload(weekEntries);
    submitWeekly.mutate(
      {
        weekOf: new Date(`${weekOf}T12:00:00`),
        objectives: `Six-day ${authorRoleLabel} hospital and doctor visit plan`,
        plannedVisits: formatPlan(weekEntries, clientName, doctorName),
        schedule,
      },
      {
        onSuccess: () => {
          setNoticeError(false);
          setNotice(
            `Six-day ${authorRoleLabel} plan submitted. Daily reports can now use the planned hospitals and their registered doctors on matching dates.`
          );
        },
        onError: error => {
          setNoticeError(true);
          setNotice(error.message);
        },
      }
    );
  };
  const submitReport = () => {
    const dailyVisits = dailyHospitals.flatMap(hospital =>
      hospital.doctorIds.map(doctorId => ({
        date: reportDate,
        clientId: Number(hospital.clientId),
        doctorId: Number(doctorId),
      }))
    );
    if (!plannedClients.length) {
      setNoticeError(true);
      setNotice(
        "No submitted plan covers this date. Submit the weekly plan first, then choose the matching report date."
      );
      return;
    }
    if (
      dailyVisits.length < 3 ||
      dailyHospitals.some(
        hospital =>
          !hospital.clientId || hospital.doctorIds.some(doctorId => !doctorId)
      )
    ) {
      setNoticeError(true);
      setNotice(
        "Record at least three doctor visits. Each hospital can include multiple registered doctors."
      );
      return;
    }
    if (
      new Set(dailyHospitals.map(hospital => hospital.clientId)).size !==
      dailyHospitals.length
    ) {
      setNoticeError(true);
      setNotice(
        "Add each planned hospital only once, then add all visited doctors below it."
      );
      return;
    }
    if (
      new Set(dailyVisits.map(visit => `${visit.clientId}:${visit.doctorId}`))
        .size !== dailyVisits.length
    ) {
      setNoticeError(true);
      setNotice("Choose each doctor only once under the same hospital.");
      return;
    }
    if (summary.trim().length < 3 || outcomes.trim().length < 3) {
      setNoticeError(true);
      setNotice(
        "Enter an activity summary and outcome before submitting the daily report."
      );
      return;
    }
    submitDaily.mutate(
      {
        reportDate: new Date(`${reportDate}T12:00:00`),
        visits: dailyVisits,
        summary,
        outcomes,
        challenges: challenges || undefined,
        nextActions: nextActions || undefined,
      },
      {
        onSuccess: () => {
          setSummary("");
          setOutcomes("");
          setChallenges("");
          setNextActions("");
          setNoticeError(false);
          setNotice(isDelegate ? "Daily doctor-visit report submitted for Manager review." : `${authorRoleLabel} daily doctor-visit report recorded.`);
        },
        onError: error => {
          setNoticeError(true);
          setNotice(error.message);
        },
      }
    );
  };
  if (loading)
    return (
      <div className="blueprint-page">
        <div className="blueprint-loader">{t("loadingManager")}</div>
      </div>
    );
  if (!canAuthor)
    return (
      <div className="blueprint-page">
        <Card className="login-card blueprint-card">
          <h1>{t("workLogRestricted")}</h1>
          <p className="muted">{t("workLogRestrictedDescription")}</p>
        </Card>
      </div>
    );
  return (
    <div className="blueprint-page">
      <div className="blueprint-grid" />
      <main className="container py-8 relative z-10">
        <a
          href={isDelegate ? "/delegate" : "/"}
          className="inline-flex items-center gap-2 text-sm text-cyan-300 mb-6"
        >
          <ArrowLeft size={16} /> {t("backToWorkspace")}
        </a>
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3"><p className="eyebrow">FFM / {t("fieldPerformance")}</p><LanguageSwitcher compact/></div>
          <h1 className="text-4xl font-bold text-white">
            {isDelegate
              ? t("delegateWorkLogTitle")
              : t("managerWorkLogTitle")}
          </h1>
          <p className="muted mt-2">
            {t("workLogDescription")}
          </p>
          {canReview && (
            <p className="admin-feedback mt-4 mb-0">
              You can record your own weekly plans and daily reports here. Your
              entries are labelled <strong>manager recorded</strong> and are not
              sent to your own review queue; Delegate submissions remain available
              for permitted approval and review below.
            </p>
          )}
        </div>
        {notice && (
          <div
            className={`admin-feedback mb-5 ${noticeError ? "error" : "success"}`}
          >
            {notice}
          </div>
        )}
        {canAuthor && (
          <section className="grid lg:grid-cols-2 gap-6 mb-6" aria-label="Add hospital and doctor">
            <Card className="blueprint-card">
              <CardHeader>
                <CardTitle>{t("addHospital")}</CardTitle>
                <p className="muted">Create a hospital/client so it can be selected in plans and reports.</p>
              </CardHeader>
              <CardContent className="form-stack">
                <label htmlFor="delegate-new-hospital">Hospital name</label>
                <Input id="delegate-new-hospital" value={newClientName} onChange={event => setNewClientName(event.target.value)} placeholder="Hospital name" />
                <label htmlFor="delegate-new-hospital-city">City (optional)</label>
                <Input id="delegate-new-hospital-city" value={newClientCity} onChange={event => setNewClientCity(event.target.value)} placeholder="City" />
                <Button className="blueprint-button" disabled={newClientName.trim().length < 2 || addClient.isPending} onClick={() => addClient.mutate({ name: newClientName.trim(), city: newClientCity.trim() || undefined })}>
                  <Plus size={15} /> {addClient.isPending ? "Saving hospital…" : "Add hospital"}
                </Button>
              </CardContent>
            </Card>
            <Card className="blueprint-card">
              <CardHeader>
                <CardTitle>{t("addLinkedDoctor")}</CardTitle>
                <p className="muted">Choose the hospital first; the doctor will be linked to it automatically.</p>
              </CardHeader>
              <CardContent className="form-stack">
                <label htmlFor="delegate-new-doctor-hospital">Hospital</label>
                <select id="delegate-new-doctor-hospital" className="blueprint-input" value={newDoctorClientId} onChange={event => setNewDoctorClientId(event.target.value)}>
                  <option value="">Select hospital</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
                <label htmlFor="delegate-new-doctor">Doctor name</label>
                <Input id="delegate-new-doctor" value={newDoctorName} onChange={event => setNewDoctorName(event.target.value)} placeholder="Doctor name" />
                <label htmlFor="delegate-new-doctor-specialty">Specialty (optional)</label>
                <Input id="delegate-new-doctor-specialty" value={newDoctorSpecialty} onChange={event => setNewDoctorSpecialty(event.target.value)} placeholder="Orthopedic, for example" />
                <Button className="blueprint-button" disabled={!newDoctorClientId || newDoctorName.trim().length < 2 || addDoctor.isPending} onClick={() => addDoctor.mutate({ clientId: Number(newDoctorClientId), name: newDoctorName.trim(), specialty: newDoctorSpecialty.trim() || undefined })}>
                  <Plus size={15} /> {addDoctor.isPending ? "Saving doctor…" : "Add doctor"}
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
        {canAuthor && directoryNotice && (
          <div className={`admin-feedback mb-5 ${directoryNoticeError ? "error" : "success"}`}>{directoryNotice}</div>
        )}
        {canAuthor && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="blueprint-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays size={20} /> {t("sixDayWorkweekPlan")}
                </CardTitle>
                <p className="muted">
                  Saturday through Thursday: select 3–6 hospitals for each
                  workday. Under each hospital, use Add doctor to include every
                  registered doctor you plan to visit.
                </p>
              </CardHeader>
              <CardContent className="form-stack">
                <label>{t("weekStartingSaturday")}</label>
                <Input
                  type="date"
                  value={weekOf}
                  onChange={event =>
                    setWeekOf(saturdayForDate(event.target.value))
                  }
                />
                <div className="space-y-4">
                  {weekEntries.map((day, index) => (
                    <HospitalPlanDay
                      key={day.date}
                      day={day}
                      index={index}
                      onChange={next => changePlanDay(index, next)}
                      clients={clients}
                      doctors={doctors}
                    />
                  ))}
                </div>
                <Button
                  className="blueprint-button"
                  disabled={busy || submitWeekly.isPending}
                  onClick={submitPlan}
                >
                  {submitWeekly.isPending
                    ? "Submitting…"
                    : t("submitWorkweekPlan")}
                </Button>
              </CardContent>
            </Card>
            <Card className="blueprint-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={20} /> {t("dailyVisitsReport")}
                </CardTitle>
                <p className="muted">
                  Choose a planned hospital once, then add every registered
                  doctor visited there. Friday is the weekly weekend day; daily
                  reports are for Saturday through Thursday.
                </p>
              </CardHeader>
              <CardContent className="form-stack">
                <label>{t("reportDate")}</label>
                <Input
                  type="date"
                  value={reportDate}
                  onChange={event => changeReportDate(event.target.value)}
                />
                <p
                  className={
                    plannedClients.length
                      ? "text-sm text-emerald-300"
                      : "text-sm text-amber-300"
                  }
                >
                  {new Date(`${reportDate}T12:00:00`).getDay() === 5
                    ? "Friday is the weekend day; choose Saturday through Thursday for a daily report."
                    : plannedClients.length
                      ? `${plannedClients.length} planned hospital${plannedClients.length === 1 ? "" : "s"} available for this date.`
                      : "No submitted weekly plan hospitals are available for this date yet."}
                </p>
                <DailyHospitalGroups
                  entries={dailyHospitals}
                  onChange={setDailyHospitals}
                  plannedClients={plannedClients}
                  doctors={doctors}
                />
                <label>Activity summary</label>
                <Textarea
                  value={summary}
                  onChange={event => setSummary(event.target.value)}
                  placeholder="Visit and key activity…"
                />
                <label>Outcomes achieved</label>
                <Textarea
                  value={outcomes}
                  onChange={event => setOutcomes(event.target.value)}
                  placeholder="Decisions, completed actions, and results…"
                />
                <label>Challenges (optional)</label>
                <Textarea
                  value={challenges}
                  onChange={event => setChallenges(event.target.value)}
                  placeholder="Delays or help needed…"
                />
                <label>Next actions (optional)</label>
                <Textarea
                  value={nextActions}
                  onChange={event => setNextActions(event.target.value)}
                  placeholder="Action — owner — expected date…"
                />
                <Button
                  className="blueprint-button"
                  disabled={
                    busy ||
                    submitDaily.isPending ||
                    !plannedClients.length ||
                    new Date(`${reportDate}T12:00:00`).getDay() === 5
                  }
                  onClick={submitReport}
                >
                  {submitDaily.isPending
                    ? "Submitting…"
                    : t("submitDailyReport")}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <Card className="blueprint-card">
            <CardHeader>
              <CardTitle>{t("weeklyPlans")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklyPlans.isLoading ? (
                <p className="muted">Loading weekly plans…</p>
              ) : weeklyPlans.data?.length ? (
                weeklyPlans.data.map(plan => (
                  <div key={plan.id} className="border border-slate-700 p-4">
                    <div className="flex justify-between gap-3">
                      <strong>
                        {canReview
                          ? plan.authorId === user?.id
                            ? `My plan · Week of ${formatFfmDate(plan.weekOf)}`
                            : `${plan.delegateName || plan.authorName || "Delegate"} · Week of ${formatFfmDate(plan.weekOf)}`
                          : `Week of ${formatFfmDate(plan.weekOf)}`}
                      </strong>
                      <Badge className={statusTone(plan.status)}>
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="mt-2 muted whitespace-pre-wrap">
                      {plan.plannedVisits}
                    </p>
                    {canReview && plan.delegateId != null && plan.authorId !== user?.id && plan.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="blueprint-button"
                          onClick={() =>
                            reviewWeekly.mutate({
                              id: plan.id,
                              status: "approved",
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            reviewWeekly.mutate({
                              id: plan.id,
                              status: "rejected",
                              reviewNote:
                                "Please revise the plan and resubmit.",
                            })
                          }
                        >
                          Request revision
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="muted">No weekly plans submitted yet.</p>
              )}
            </CardContent>
          </Card>
          <Card className="blueprint-card">
            <CardHeader>
              <CardTitle>{t("dailyReports")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dailyReports.isLoading ? (
                <p className="muted">Loading daily reports…</p>
              ) : dailyReports.data?.length ? (
                dailyReports.data.map(report => (
                  <div key={report.id} className="border border-slate-700 p-4">
                    <div className="flex justify-between gap-3">
                      <strong>
                        {canReview
                          ? report.authorId === user?.id
                            ? `My report · ${formatFfmDate(report.reportDate)}`
                            : `${report.delegateName || report.authorName || "Delegate"} · ${formatFfmDate(report.reportDate)}`
                          : formatFfmDate(report.reportDate)}
                      </strong>
                      <Badge className={statusTone(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-white whitespace-pre-wrap">
                      <strong>Visits & summary:</strong>
                      {`\n${report.summary}`}
                    </p>
                    <p className="mt-2 muted">
                      <strong>Outcomes:</strong> {report.outcomes}
                    </p>
                    {canReview && report.delegateId != null && report.authorId !== user?.id && report.status === "submitted" && (
                      <Button
                        size="sm"
                        className="blueprint-button mt-3"
                        onClick={() => reviewDaily.mutate({ id: report.id })}
                      >
                        <ClipboardCheck size={15} /> Mark reviewed
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="muted">No daily reports submitted yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
