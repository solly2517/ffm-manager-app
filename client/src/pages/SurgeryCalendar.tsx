import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { getCatalogueSearchInput } from "@/lib/implantCatalogue";
import { selectedSurgeryIdFromSearch } from "@/lib/surgeryWorkspace";
import { dashboardHrefForWorkspaceRole } from "@/lib/workspaceDashboardReturn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  PackagePlus,
  Upload,
} from "lucide-react";

type CalendarStatus =
  | "notified"
  | "confirmed"
  | "postponed"
  | "cancelled"
  | "completed";
type ScheduleStatus = "notified" | "confirmed";
type LifecycleAction = "postponed" | "cancelled" | "completed";
const statusClasses: Record<CalendarStatus, string> = {
  notified: "border-sky-400/40 bg-sky-500/15 text-sky-100",
  confirmed: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  postponed: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  cancelled: "border-rose-400/40 bg-rose-500/15 text-rose-100",
  completed: "border-violet-400/40 bg-violet-500/15 text-violet-100",
};
const keyForDate = (value: Date | string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const localDateTime = (value: Date | string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};
const isTodayOrLater = (value: Date | string) => {
  const surgeryDate = new Date(value);
  surgeryDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return surgeryDate <= today;
};
const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};
const timelineLabel = (action: string) =>
  ({
    "surgery.created": "Surgery created",
    "manager_surgery.created": "Surgery created by Manager",
    "surgery.calendar_updated": "Appointment updated",
    "surgery.readiness_updated": "Readiness checklist updated",
    "surgery.postponed": "Surgery postponed",
    "surgery.cancelled": "Surgery cancelled",
    "surgery.completed": "Surgery completed",
    "surgery.updated": "Surgery record updated",
    "surgery.implant_registered": "Implant registered",
    "surgery.delivery_proof_uploaded": "Patient-sheet proof uploaded",
  })[action] || action.replace(/[._]/g, " ");

export default function SurgeryCalendar() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    selectedSurgeryIdFromSearch(window.location.search)
  );
  const [notice, setNotice] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleStatus, setScheduleStatus] =
    useState<ScheduleStatus>("notified");
  const [lifecycleAction, setLifecycleAction] =
    useState<LifecycleAction>("completed");
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [rescheduledDate, setRescheduledDate] = useState("");
  const [implantMode, setImplantMode] = useState<"catalogue" | "direct">(
    "catalogue"
  );
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [catalogueId, setCatalogueId] = useState("");
  const [directName, setDirectName] = useState("");
  const [directManufacturer, setDirectManufacturer] = useState("");
  const [directCode, setDirectCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [implantNotes, setImplantNotes] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [planningDelegateId, setPlanningDelegateId] = useState("");
  const [planningClientId, setPlanningClientId] = useState("");
  const [planningProcedure, setPlanningProcedure] = useState("");
  const [planningDate, setPlanningDate] = useState("");
  const [planningHospital, setPlanningHospital] = useState("");
  const [planningSurgeon, setPlanningSurgeon] = useState("");

  const isAdmin =
    user?.role === "admin" ||
    user?.email?.toLowerCase() === "dr.seleam@gmail.com";
  const canWrite =
    user?.role === "admin" ||
    user?.role === "manager" ||
    user?.role === "delegate";
  const canPlanSurgery = isAdmin || user?.role === "manager";
  const calendarQuery = trpc.operations.surgeryCalendar.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const clientsQuery = trpc.operations.clients.useQuery(undefined, {
    enabled: isAuthenticated && canPlanSurgery,
  });
  const delegatesQuery = trpc.operations.delegates.useQuery(undefined, {
    enabled: isAuthenticated && canPlanSurgery,
  });
  const doctorsQuery = trpc.operations.doctors.useQuery(undefined, {
    enabled: isAuthenticated && canPlanSurgery,
  });
  const catalogueSearchInput = useMemo(
    () => getCatalogueSearchInput(catalogueSearch),
    [catalogueSearch]
  );
  const catalogueQuery = trpc.operations.implantCatalogue.useQuery(
    catalogueSearchInput,
    { enabled: isAuthenticated && canWrite && Boolean(catalogueSearchInput) }
  );
  const selected =
    (calendarQuery.data ?? []).find(item => item.id === selectedId) ?? null;
  const planningClient = useMemo(
    () =>
      (clientsQuery.data ?? []).find(
        client => String(client.id) === planningClientId
      ),
    [clientsQuery.data, planningClientId]
  );
  const planningDoctors = useMemo(
    () =>
      planningClient
        ? (doctorsQuery.data ?? []).filter(
            doctor => doctor.clientId === planningClient.id
          )
        : [],
    [doctorsQuery.data, planningClient]
  );
  const resourcesQuery = trpc.operations.surgeryResources.useQuery(
    { surgeryId: selectedId ?? 0 },
    { enabled: isAuthenticated && selectedId !== null && canWrite }
  );
  const timelineQuery = trpc.operations.surgeryTimeline.useQuery(
    { surgeryId: selectedId ?? 0 },
    { enabled: isAuthenticated && selectedId !== null && canWrite }
  );
  const isFinal =
    selected?.calendarStatus === "cancelled" ||
    selected?.calendarStatus === "completed";
  const canResolve = Boolean(
    selected && canWrite && !isFinal && isTodayOrLater(selected.surgeryDate)
  );
  const lineAmount = Number(quantity || 0) * Number(unitPrice || 0);
  const completionReady = Boolean(
    resourcesQuery.data?.implants.length &&
      resourcesQuery.data?.deliveryProofs.length
  );
  const implantLineCount = resourcesQuery.data?.implants.length ?? 0;

  const products = catalogueQuery.data ?? [];
  const surgeriesByDay = useMemo(() => {
    const result = new Map<string, typeof calendarQuery.data>();
    for (const surgery of calendarQuery.data ?? []) {
      const key = keyForDate(surgery.surgeryDate);
      result.set(key, [...(result.get(key) ?? []), surgery]);
    }
    return result;
  }, [calendarQuery.data]);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [month]);

  const refresh = async (message: string) => {
    setNotice(message);
    await Promise.all([
      calendarQuery.refetch(),
      resourcesQuery.refetch(),
      timelineQuery.refetch(),
      utils.operations.surgeries.invalidate(),
    ]);
  };
  const createManagerSurgery = trpc.operations.createManagerSurgery.useMutation({
    onSuccess: async surgery => {
      setPlanningClientId("");
      setPlanningProcedure("");
      setPlanningDate("");
      setPlanningHospital("");
      setPlanningSurgeon("");
      if (surgery?.id) setSelectedId(surgery.id);
      if (surgery?.surgeryDate) setMonth(new Date(surgery.surgeryDate));
      await refresh("Surgery planned and added to the shared calendar.");
    },
    onError: () => setNotice("Surgery could not be saved. Please check the required details and try again."),
  });
  const updateSchedule = trpc.operations.updateSurgerySchedule.useMutation({
    onSuccess: () => refresh("Surgery appointment updated."),
    onError: error => setNotice(error.message),
  });
  const resolveLifecycle = trpc.operations.resolveSurgeryLifecycle.useMutation({
    onSuccess: () => refresh("Surgery lifecycle updated."),
    onError: error => setNotice(error.message),
  });
  const removeSurgery = trpc.operations.removeSurgery.useMutation({
    onSuccess: async () => {
      setSelectedId(null);
      setNotice(
        "Surgery and its registered implant and delivery-proof metadata were deleted."
      );
      await Promise.all([
        calendarQuery.refetch(),
        utils.operations.surgeries.invalidate(),
        utils.operations.surgeryCalendar.invalidate(),
      ]);
    },
    onError: error => setNotice(error.message),
  });
  const addImplant = trpc.operations.addSurgeryImplant.useMutation({
    onSuccess: () => {
      setCatalogueId("");
      setDirectName("");
      setDirectManufacturer("");
      setDirectCode("");
      setQuantity("1");
      setUnitPrice("");
      setImplantNotes("");
      refresh(
        `Implant line ${implantLineCount + 1} registered. Add another implant line for this surgery when needed.`
      );
    },
    onError: error => setNotice(error.message),
  });
  const uploadProof = trpc.operations.uploadSurgeryDeliveryProof.useMutation({
    onSuccess: () => {
      setProofNote("");
      refresh("Patient-sheet delivery proof uploaded securely.");
    },
    onError: error => setNotice(error.message),
  });

  useEffect(() => {
    if (!selected) return;
    setScheduleDate(localDateTime(selected.surgeryDate));
    setScheduleStatus(
      selected.calendarStatus === "confirmed" ? "confirmed" : "notified"
    );
    setLifecycleReason("");
    setRescheduledDate("");
  }, [selected?.id]);
  useEffect(() => {
    if (selected) setMonth(new Date(selected.surgeryDate));
  }, [selected?.id]);
  useEffect(() => {
    const hospital = planningClient?.name ?? "";
    if (planningHospital !== hospital) setPlanningHospital(hospital);
    if (!planningDoctors.some(doctor => doctor.name === planningSurgeon)) {
      setPlanningSurgeon("");
    }
  }, [planningClient, planningDoctors, planningHospital, planningSurgeon]);

  const uploadPatientSheet = (file?: File) => {
    if (!file || !selected) return;
    const accepted = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ] as const;
    if (!(accepted as readonly string[]).includes(file.type))
      return setNotice("Upload a PDF, JPEG, PNG, or WEBP patient sheet.");
    if (file.size > 8 * 1024 * 1024)
      return setNotice("Patient-sheet files must be 8 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () =>
      uploadProof.mutate({
        surgeryId: selected.id,
        fileName: file.name,
        mimeType: file.type as (typeof accepted)[number],
        base64: String(reader.result || ""),
        note: proofNote || undefined,
      });
    reader.readAsDataURL(file);
  };
  const registerImplant = () => {
    if (!selected) return;
    addImplant.mutate({
      surgeryId: selected.id,
      implantCatalogueId:
        implantMode === "catalogue" ? Number(catalogueId) : undefined,
      implantName: implantMode === "direct" ? directName.trim() : undefined,
      manufacturer:
        implantMode === "direct"
          ? directManufacturer.trim() || undefined
          : undefined,
      productCode:
        implantMode === "direct" ? directCode.trim() || undefined : undefined,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      currency: currency.trim(),
      notes: implantNotes || undefined,
    });
  };

  if (loading)
    return (
      <div className="blueprint-page">
        <div className="blueprint-loader">{t("loadingManager")}</div>
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="blueprint-page login-view">
        <Card className="login-card blueprint-card">
          <div className="login-language"><LanguageSwitcher /></div><div className="logo-mark">FFM</div>
          <p className="eyebrow">{t("sharedSurgeryCalendar")}</p>
          <h1>FFM {t("surgeryCalendar")}</h1>
          <p className="muted">{t("surgeryCalendarLoginDescription")}</p>
          <Button
            className="w-full mt-6 blueprint-button"
            onClick={() => startLogin()}
          >
            {t("signIn")}
          </Button>
        </Card>
      </div>
    );

  return (
    <div className="manager-shell">
      <aside className="manager-sidebar">
        <div className="brand-lockup">
          <div className="logo-mark small">FFM</div>
          <div>
            <strong>FFM {t("surgeryCalendar")}</strong>
            <span>{t("surgeryPlanning")}</span>
          </div>
        </div>
        <div className="sidebar-rule" />
        <a
          className="sidebar-link"
          href={user?.role === "delegate" ? "/delegate" : "/"}
        >
          <ArrowLeft size={17} />
          <span>
            {t("backToWorkspace")} {user?.role === "delegate" ? t("delegateWorkspace") : ""}
          </span>
        </a>
        <div className="sidebar-user">
          <div className="avatar">
            {(user?.name || user?.email || "F")[0].toUpperCase()}
          </div>
          <div className="user-copy">
            <strong>{user?.name || user?.email || "FFM"}</strong>
            <span>{user?.role?.replace("_", " ")}</span>
          </div>
          <button
            className="logout-icon"
            onClick={() => logout()}
            title={t("signOut")}
          >
            {t("signOut")}
          </button>
        </div>
      </aside>
      <main className="manager-main">
        <header className="manager-topbar">
          <div>
            <p className="topbar-kicker">FFM / {t("sharedPlanning")}</p>
            <h2>{t("surgeryCalendar")}</h2>
          </div>
          <div className="topbar-actions workspace-topbar-actions"><div className="live-indicator"><span /> {t("allRolesCanView")}</div><LanguageSwitcher compact/><a className="header-dashboard-return" href={dashboardHrefForWorkspaceRole(user?.role)} aria-label={`${t("backToWorkspace")} ${t("dashboard")}`}><ArrowLeft size={16} aria-hidden="true"/><span>{t("dashboard")}</span></a></div>
        </header>
        <section className="manager-content">
          <div className="page-intro">
            <div>
              <p className="eyebrow">{t("dayOfSurgeryControl")}</p>
              <h1>{t("surgeryCalendarIntro")}</h1>
              <p className="muted">{t("surgeryCalendarDescription")}</p>
            </div>
            <Badge variant="outline">
              {t("liveSurgeries", { count: calendarQuery.data?.length ?? 0 })}
            </Badge>
          </div>
          {notice && (
            <div
              className={
                notice.includes("updated") ||
                notice.includes("planned") ||
                notice.includes("registered") ||
                notice.includes("uploaded") ||
                notice.includes("deleted")
                  ? "admin-feedback success"
                  : "admin-feedback error"
              }
            >
              {notice}
            </div>
          )}
          {canPlanSurgery && (
            <Card className="blueprint-card border-sky-400/30">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-sky-500/15 p-2 text-sky-200">
                    <CalendarPlus size={20} />
                  </div>
                  <div>
                    <CardTitle>Plan a surgery</CardTitle>
                    <p className="muted mt-1">
                      Choose one of your assigned Delegates, then select the
                      hospital and its registered surgeon. The appointment is
                      immediately visible on the shared calendar.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {delegatesQuery.isLoading ? (
                  <div className="admin-feedback">Loading assigned Delegates…</div>
                ) : !(delegatesQuery.data?.length) ? (
                  <div className="admin-feedback error">
                    No Delegate is assigned to this Manager yet. Ask an
                    Administrator to assign a Delegate before planning a
                    surgery.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="calendar-planning-delegate">
                        Assigned Delegate
                      </Label>
                      <select
                        id="calendar-planning-delegate"
                        aria-label="Assigned Delegate for surgery"
                        className="blueprint-input w-full"
                        value={planningDelegateId}
                        onChange={event => setPlanningDelegateId(event.target.value)}
                      >
                        <option value="">Choose assigned Delegate</option>
                        {(delegatesQuery.data ?? []).map(delegate => (
                          <option key={delegate.id} value={delegate.id}>
                            {delegate.name || delegate.email || "Delegate"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="calendar-planning-client">Hospital / client</Label>
                      <select
                        id="calendar-planning-client"
                        aria-label="Hospital or client for surgery"
                        className="blueprint-input w-full"
                        value={planningClientId}
                        onChange={event => setPlanningClientId(event.target.value)}
                      >
                        <option value="">Choose hospital / client</option>
                        {(clientsQuery.data ?? []).map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="calendar-planning-procedure">Procedure</Label>
                      <Input
                        id="calendar-planning-procedure"
                        aria-label="Surgery procedure"
                        value={planningProcedure}
                        onChange={event => setPlanningProcedure(event.target.value)}
                        placeholder="Procedure name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="calendar-planning-date">Surgery date</Label>
                      <Input
                        id="calendar-planning-date"
                        aria-label="Surgery date"
                        type="date"
                        value={planningDate}
                        onChange={event => setPlanningDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="calendar-planning-hospital">Hospital</Label>
                      <Input
                        id="calendar-planning-hospital"
                        aria-label="Selected hospital"
                        value={planningHospital}
                        readOnly
                        title="Hospital is selected automatically from the client."
                        placeholder="Select hospital / client first"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="calendar-planning-surgeon">Surgeon</Label>
                      <select
                        id="calendar-planning-surgeon"
                        aria-label="Surgeon for surgery"
                        className="blueprint-input w-full"
                        value={planningSurgeon}
                        disabled={!planningClient || !planningDoctors.length}
                        onChange={event => setPlanningSurgeon(event.target.value)}
                      >
                        <option value="">
                          {!planningClient
                            ? "Select hospital first"
                            : planningDoctors.length
                              ? "Choose registered surgeon"
                              : "No registered surgeons for this hospital"}
                        </option>
                        {planningDoctors.map(doctor => (
                          <option key={doctor.id} value={doctor.name}>
                            {doctor.name}
                            {doctor.specialty ? ` — ${doctor.specialty}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex flex-col gap-2 border-t border-slate-700/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="muted text-sm">
                        Managers can plan surgery only for their assigned
                        Delegates. Warehouse Heroes cannot create clinical
                        surgery records.
                      </p>
                      <Button
                        className="blueprint-button w-full sm:w-auto"
                        disabled={
                          !planningDelegateId ||
                          !planningClientId ||
                          !planningDate ||
                          planningProcedure.trim().length < 2 ||
                          createManagerSurgery.isPending
                        }
                        onClick={() =>
                          createManagerSurgery.mutate({
                            delegateId: Number(planningDelegateId),
                            clientId: Number(planningClientId),
                            surgeryDate: new Date(`${planningDate}T09:00:00`),
                            procedureName: planningProcedure.trim(),
                            hospital: planningHospital || undefined,
                            surgeon: planningSurgeon || undefined,
                          })
                        }
                      >
                        {createManagerSurgery.isPending
                          ? "Planning surgery…"
                          : "Plan surgery"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
            <Card className="blueprint-card">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>
                      {month.toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })}
                    </CardTitle>
                    <p className="muted">
                      Select a surgery to manage its clinical record.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMonth(
                          new Date(month.getFullYear(), month.getMonth() - 1, 1)
                        )
                      }
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMonth(
                          new Date(month.getFullYear(), month.getMonth() + 1, 1)
                        )
                      }
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {calendarQuery.isLoading ? (
                  <div className="admin-feedback">Loading surgeries…</div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        day => (
                          <div key={day} className="py-2">
                            {day}
                          </div>
                        )
                      )}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {days.map(day => {
                        const events =
                          surgeriesByDay.get(keyForDate(day)) ?? [];
                        return (
                          <div
                            className={`min-h-28 border border-blue-500/20 p-1.5 ${day.getMonth() === month.getMonth() ? "bg-slate-950/25" : "bg-slate-950/60 text-slate-600"}`}
                            key={day.toISOString()}
                          >
                            <div className="mb-1 text-xs font-semibold">
                              {day.getDate()}
                            </div>
                            {events.slice(0, 2).map(surgery => (
                              <button
                                className={`mb-1 block w-full border px-1.5 py-1 text-left text-[10px] ${statusClasses[surgery.calendarStatus]} ${selectedId === surgery.id ? "ring-1 ring-white" : ""}`}
                                key={surgery.id}
                                onClick={() => setSelectedId(surgery.id)}
                              >
                                <strong className="block truncate">
                                  {surgery.procedureName || "Surgery"}
                                </strong>
                                <span className="block truncate">
                                  {surgery.hospital || "Hospital pending"}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="blueprint-card">
              <CardHeader>
                <CardTitle>
                  {selected?.procedureName || "Select a surgery"}
                </CardTitle>
                <p className="muted">
                  {selected
                    ? `${selected.hospital || "Hospital pending"} · ${new Date(selected.surgeryDate).toLocaleString()}`
                    : "Choose a calendar entry to view its clinical record."}
                </p>
              </CardHeader>
              <CardContent>
                {!selected ? (
                  <div className="admin-feedback">
                    Select a surgery in the calendar.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-md border border-blue-500/25 bg-slate-950/35 p-3 text-sm">
                      <Badge className={statusClasses[selected.calendarStatus]}>
                        {selected.calendarStatus}
                      </Badge>
                      {selected.lifecycleReason && (
                        <p className="mt-3 text-slate-300">
                          <strong>Lifecycle note:</strong>{" "}
                          {selected.lifecycleReason}
                        </p>
                      )}
                    </div>
                    {canWrite && !isFinal && (
                      <section className="space-y-3 border-t border-blue-500/20 pt-4">
                        <Label>Appointment details</Label>
                        <Input
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={event =>
                            setScheduleDate(event.target.value)
                          }
                        />
                        <select
                          className="blueprint-input w-full"
                          value={scheduleStatus}
                          onChange={event =>
                            setScheduleStatus(
                              event.target.value as ScheduleStatus
                            )
                          }
                        >
                          <option value="notified">Notified</option>
                          <option value="confirmed">Confirmed</option>
                        </select>
                        <Button
                          className="blueprint-button w-full"
                          disabled={!scheduleDate || updateSchedule.isPending}
                          onClick={() =>
                            updateSchedule.mutate({
                              id: selected.id,
                              surgeryDate: new Date(scheduleDate),
                              calendarStatus: scheduleStatus,
                            })
                          }
                        >
                          {updateSchedule.isPending
                            ? "Saving…"
                            : "Save appointment"}
                        </Button>
                      </section>
                    )}
                    {canResolve ? (
                      <section className="space-y-3 border-t border-blue-500/20 pt-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={17} />
                          <strong>Day-of-surgery outcome</strong>
                        </div>
                        <select
                          className="blueprint-input w-full"
                          value={lifecycleAction}
                          onChange={event =>
                            setLifecycleAction(
                              event.target.value as LifecycleAction
                            )
                          }
                        >
                          <option value="completed">C — Surgery done</option>
                          <option value="postponed">
                            A — Postponed to a new date
                          </option>
                          <option value="cancelled">B — Cancelled</option>
                        </select>
                        {lifecycleAction === "postponed" && (
                          <Input
                            type="datetime-local"
                            value={rescheduledDate}
                            onChange={event =>
                              setRescheduledDate(event.target.value)
                            }
                          />
                        )}
                        <Input
                          value={lifecycleReason}
                          onChange={event =>
                            setLifecycleReason(event.target.value)
                          }
                          placeholder={
                            lifecycleAction === "completed"
                              ? "Completion note (optional)"
                              : "Reason is required"
                          }
                        />
                        {lifecycleAction === "completed" && (
                          <p className="text-xs text-slate-400">
                            Completion needs one implant and one patient-sheet
                            proof.
                          </p>
                        )}
                        <Button
                          className="blueprint-button w-full"
                          disabled={
                            resolveLifecycle.isPending ||
                            (lifecycleAction !== "completed" &&
                              !lifecycleReason.trim()) ||
                            (lifecycleAction === "postponed" &&
                              !rescheduledDate) ||
                            (lifecycleAction === "completed" &&
                              !completionReady)
                          }
                          onClick={() =>
                            resolveLifecycle.mutate({
                              id: selected.id,
                              action: lifecycleAction,
                              reason: lifecycleReason || undefined,
                              rescheduledDate:
                                lifecycleAction === "postponed"
                                  ? new Date(rescheduledDate)
                                  : undefined,
                            })
                          }
                        >
                          {lifecycleAction === "completed"
                            ? "Mark surgery completed"
                            : lifecycleAction === "postponed"
                              ? "Postpone surgery"
                              : "Cancel surgery"}
                        </Button>
                      </section>
                    ) : canWrite && !isFinal ? (
                      <div className="admin-feedback">
                        Day-of-surgery actions are available on the scheduled
                        date.
                      </div>
                    ) : null}
                    {isAdmin && (
                      <section className="border-t border-rose-400/30 pt-4">
                        <strong className="text-sm text-rose-100">
                          Administrator deletion
                        </strong>
                        <p className="mt-1 text-xs text-slate-400">
                          This permanently removes the surgery and its
                          registered implant and delivery-proof metadata. The
                          audit record remains.
                        </p>
                        <Button
                          className="mt-3 w-full"
                          variant="destructive"
                          disabled={removeSurgery.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete ${selected.procedureName || "this surgery"}? This cannot be undone.`
                              )
                            )
                              removeSurgery.mutate({ id: selected.id });
                          }}
                        >
                          {removeSurgery.isPending
                            ? "Deleting…"
                            : "Delete surgery"}
                        </Button>
                      </section>
                    )}
                    <section className="border-t border-blue-500/20 pt-4">
                      <div className="mb-3 flex items-center gap-2">
                        <PackagePlus size={17} />
                        <strong>Implants used</strong>
                        <Badge variant="outline">
                          {implantLineCount} implant {implantLineCount === 1 ? "line" : "lines"}
                        </Badge>
                      </div>
                      {resourcesQuery.isLoading ? (
                        <p className="muted">Loading implants…</p>
                      ) : resourcesQuery.data?.implants.length ? (
                        <div className="space-y-2">
                          {resourcesQuery.data.implants.map(implant => (
                            <div
                              className="rounded-md border border-blue-500/20 p-2 text-sm"
                              key={implant.id}
                            >
                              <div className="flex justify-between gap-3">
                                <strong>
                                  {implant.catalogueName || implant.implantName}{" "}
                                  × {implant.quantity}
                                </strong>
                                <strong className="text-emerald-200">
                                  {formatMoney(
                                    implant.lineTotal,
                                    implant.currency
                                  )}
                                </strong>
                              </div>
                              <span className="block text-xs text-slate-400">
                                {formatMoney(
                                  implant.unitPrice,
                                  implant.currency
                                )}{" "}
                                each
                                {implant.productCode
                                  ? ` · ${implant.productCode}`
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="muted">No implants registered yet.</p>
                      )}
                      {resourcesQuery.data?.implantTotals.length ? (
                        <div className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
                          <strong>Implant total</strong>
                          {resourcesQuery.data.implantTotals.map(total => (
                            <span
                              className="block text-lg text-emerald-100"
                              key={total.currency}
                            >
                              {formatMoney(total.total, total.currency)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {canWrite && !isFinal && (
                        <div className="mt-3 space-y-2">
                          <p className="rounded-md border border-cyan-400/30 bg-cyan-500/10 p-2 text-xs text-cyan-50">
                            Register one implant line, then add another as often as needed. A surgery can include any number of separate implant lines, such as a plate, cancellous screws, cortical screws, and other components.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={
                                implantMode === "catalogue"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => setImplantMode("catalogue")}
                            >
                              Find implant
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                implantMode === "direct" ? "default" : "outline"
                              }
                              onClick={() => setImplantMode("direct")}
                            >
                              Add new implant
                            </Button>
                          </div>
                          {implantMode === "catalogue" ? (
                            <>
                              <Input
                                value={catalogueSearch}
                                onChange={event => {
                                  setCatalogueSearch(event.target.value);
                                  setCatalogueId("");
                                }}
                                placeholder="Search all implants by name, code, or manufacturer"
                              />
                              {catalogueSearch.trim().length < 2 ? (
                                <p className="text-xs text-slate-400">
                                  Type at least 2 characters to search all
                                  validated implant records.
                                </p>
                              ) : (
                                <>
                                  <select
                                    className="blueprint-input w-full"
                                    value={catalogueId}
                                    onChange={event =>
                                      setCatalogueId(event.target.value)
                                    }
                                  >
                                    <option value="">
                                      Choose an implant
                                      {catalogueQuery.isFetching
                                        ? " — searching…"
                                        : products.length
                                          ? ` — ${products.length} matching results`
                                          : " — no matches"}
                                    </option>
                                    {products.map(item => (
                                      <option value={item.id} key={item.id}>
                                        {item.name}
                                        {item.productCode
                                          ? ` · ${item.productCode}`
                                          : ""}
                                        {item.manufacturer
                                          ? ` · ${item.manufacturer}`
                                          : ""}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-xs text-slate-400">
                                    Search results come from the full validated
                                    implant catalogue. Prices are recorded only
                                    on this surgery.
                                  </p>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <Input
                                value={directName}
                                onChange={event =>
                                  setDirectName(event.target.value)
                                }
                                placeholder="New implant name"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={directManufacturer}
                                  onChange={event =>
                                    setDirectManufacturer(event.target.value)
                                  }
                                  placeholder="Manufacturer (optional)"
                                />
                                <Input
                                  value={directCode}
                                  onChange={event =>
                                    setDirectCode(event.target.value)
                                  }
                                  placeholder="Product code (optional)"
                                />
                              </div>
                              <p className="text-xs text-slate-400">
                                This implant is saved to the shared catalogue
                                and recorded in the audit history.
                              </p>
                            </>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={event =>
                                setQuantity(event.target.value)
                              }
                              placeholder="Quantity"
                            />
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={unitPrice}
                              onChange={event =>
                                setUnitPrice(event.target.value)
                              }
                              placeholder="Unit price"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={currency}
                              maxLength={3}
                              onChange={event =>
                                setCurrency(event.target.value.toUpperCase())
                              }
                              placeholder="Currency (SAR)"
                            />
                            <div className="rounded-md border border-blue-500/25 px-3 py-2 text-sm">
                              Line amount:{" "}
                              <strong>
                                {formatMoney(
                                  Number.isFinite(lineAmount) ? lineAmount : 0,
                                  currency || "SAR"
                                )}
                              </strong>
                            </div>
                          </div>
                          <Input
                            value={implantNotes}
                            onChange={event =>
                              setImplantNotes(event.target.value)
                            }
                            placeholder="Optional implant note"
                          />
                          <Button
                            className="blueprint-button w-full"
                            disabled={
                              addImplant.isPending ||
                              !(implantMode === "catalogue"
                                ? catalogueId
                                : directName.trim()) ||
                              !Number(quantity) ||
                              Number(unitPrice) <= 0 ||
                              currency.trim().length !== 3
                            }
                            onClick={registerImplant}
                          >
                            <PackagePlus size={16} />
                            {addImplant.isPending
                              ? "Registering…"
                              : "Register implant line"}
                          </Button>
                        </div>
                      )}
                    </section>
                    <section className="border-t border-blue-500/20 pt-4">
                      <div className="mb-3 flex items-center gap-2">
                        <FileCheck2 size={17} />
                        <strong>Patient-sheet delivery proof</strong>
                      </div>
                      {resourcesQuery.data?.deliveryProofs.length ? (
                        resourcesQuery.data.deliveryProofs.map(proof => (
                          <a
                            className="mb-2 block rounded-md border border-blue-500/20 p-2 text-sm"
                            href={proof.url}
                            key={proof.id}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <strong>{proof.originalName}</strong>
                            <span className="block text-xs text-slate-400">
                              {new Date(proof.createdAt).toLocaleString()}
                            </span>
                          </a>
                        ))
                      ) : (
                        <p className="muted">
                          No patient-sheet proof uploaded yet.
                        </p>
                      )}
                      {canWrite && !isFinal && (
                        <div className="mt-3 space-y-2">
                          <Input
                            value={proofNote}
                            onChange={event => setProofNote(event.target.value)}
                            placeholder="Hospital handover note (optional)"
                          />
                          <Label className="flex cursor-pointer items-center justify-center gap-2 border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-100">
                            <Upload size={16} /> Upload patient sheet
                            <input
                              className="hidden"
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              onChange={event =>
                                uploadPatientSheet(event.target.files?.[0])
                              }
                            />
                          </Label>
                        </div>
                      )}
                    </section>
                    {canWrite && (
                      <section className="border-t border-blue-500/20 pt-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Clock3 size={17} />
                          <strong>Surgery activity timeline</strong>
                        </div>
                        {timelineQuery.isLoading ? (
                          <p className="muted">Loading activity…</p>
                        ) : timelineQuery.data?.length ? (
                          <div className="space-y-3">
                            {timelineQuery.data.map(event => (
                              <div
                                className="border-l-2 border-cyan-400/50 pl-3 text-sm"
                                key={event.id}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <strong>{timelineLabel(event.action)}</strong>
                                  <time className="whitespace-nowrap text-xs text-slate-500">
                                    {new Date(event.createdAt).toLocaleString()}
                                  </time>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                  {event.actorName}
                                  {event.actorRole
                                    ? ` · ${event.actorRole.replace("_", " ")}`
                                    : ""}
                                </p>
                                {event.metadata &&
                                Object.keys(event.metadata).length ? (
                                  <p className="mt-1 text-xs text-slate-300">
                                    {Object.entries(event.metadata)
                                      .filter(
                                        ([key]) =>
                                          ![
                                            "proofId",
                                            "implantId",
                                            "implantCatalogueId",
                                          ].includes(key)
                                      )
                                      .map(
                                        ([key, value]) =>
                                          `${key.replace(/([A-Z])/g, " $1")}: ${value instanceof Date ? value.toLocaleString() : String(value)}`
                                      )
                                      .join(" · ")}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="muted">No recorded activity yet.</p>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
