import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  MapPin,
  MessageSquare,
  UserRound,
  Stethoscope,
  CalendarPlus,
  LogOut,
  CheckCircle2,
  Clock3,
  Navigation,
  Menu,
  X,
  CircleDollarSign,
} from "lucide-react";
import { describeGeolocationError } from "@/lib/delegateExperience";
import {
  androidLocationRecovery,
  requestMobileLocation,
} from "@/lib/mobileLocation";
import { opensWorkLog, WORK_LOG_PATH } from "@/lib/workLogNavigation";
import { canSendTeamMessage, formatMemberRole } from "@/lib/teamMessaging";
import { surgeryCalendarPath } from "@/lib/surgeryWorkspace";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage, type TranslationKey } from "@/contexts/LanguageContext";

const tabs: { id: "tasks" | "visit" | "messages" | "surgery" | "plan" | "profile"; labelKey: TranslationKey; icon: typeof ClipboardList }[] = [
  { id: "tasks", labelKey: "myTasks", icon: ClipboardList },
  { id: "visit", labelKey: "visit", icon: MapPin },
  { id: "messages", labelKey: "messages", icon: MessageSquare },
  { id: "surgery", labelKey: "surgeries", icon: Stethoscope },
  { id: "plan", labelKey: "workLog", icon: CalendarPlus },
  { id: "profile", labelKey: "profile", icon: UserRound },
] as const;
type DelegateTabId = (typeof tabs)[number]["id"];
const getInitialDelegateTab = (): DelegateTabId => {
  const workspace = new URLSearchParams(window.location.search).get(
    "workspace"
  );
  return tabs.some(tab => tab.id === workspace)
    ? (workspace as DelegateTabId)
    : "tasks";
};

export default function Delegate() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { language, t } = useLanguage();
  const [active, setActive] = useState<DelegateTabId>(getInitialDelegateTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine
  );
  const [offlineAction, setOfflineAction] = useState("");
  const [notes, setNotes] = useState(
    () => localStorage.getItem("ffm-visit-draft") || ""
  );
  const [gpsStatus, setGpsStatus] = useState("");
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem("ffm-delegate-onboarding") !== "1"
  );
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskStatusNotice, setTaskStatusNotice] = useState("");
  const [surgeryClientId, setSurgeryClientId] = useState("");
  const [surgeryProcedure, setSurgeryProcedure] = useState("");
  const [surgeryHospital, setSurgeryHospital] = useState("");
  const [surgeryDate, setSurgeryDate] = useState("");
  const [messageRecipientId, setMessageRecipientId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageNotice, setMessageNotice] = useState("");
  const signatureCanvas = useRef<HTMLCanvasElement>(null);
  const messagesReadWorkspaceRef = useRef(false);
  const tasksQuery = trpc.operations.tasks.useQuery();
  const messagesQuery = trpc.operations.messages.useQuery(undefined, {
    enabled: isAuthenticated && active === "messages",
  });
  const messageRecipientsQuery = trpc.operations.messageRecipients.useQuery(
    undefined,
    { enabled: isAuthenticated && active === "messages" }
  );
  const markMessagesRead = trpc.operations.markMessagesRead.useMutation({
    onSuccess: () => messagesQuery.refetch(),
    onError: () => {
      messagesReadWorkspaceRef.current = false;
    },
  });
  const sendMessage = trpc.operations.sendMessage.useMutation({
    onSuccess: () => {
      setMessageBody("");
      setMessageNotice("Message sent to the selected FFM member.");
      messagesQuery.refetch();
    },
    onError: error => setMessageNotice(error.message),
  });
  const clientsQuery = trpc.operations.clients.useQuery(undefined, {
    enabled: isAuthenticated && (active === "surgery" || active === "plan"),
  });
  const visitPlansQuery = trpc.operations.visitPlans.useQuery(undefined, {
    enabled: isAuthenticated && active === "plan",
  });
  const submitVisitPlan = trpc.operations.submitVisitPlan.useMutation({
    onSuccess: () => visitPlansQuery.refetch(),
  });
  const surgeriesQuery = trpc.operations.surgeries.useQuery(undefined, {
    enabled: isAuthenticated && active === "surgery",
  });
  const preferencesQuery = trpc.preferences.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const updatePreferences = trpc.preferences.update.useMutation({
    onSuccess: data => {
      setPushNotifications(data.pushNotifications);
      setEmailNotifications(data.emailNotifications);
      setLocationSharing(data.locationSharing);
      preferencesQuery.refetch();
    },
  });
  const addSurgery = trpc.operations.addSurgery.useMutation({
    onSuccess: () => {
      setSurgeryClientId("");
      setSurgeryProcedure("");
      setSurgeryHospital("");
      setSurgeryDate("");
      surgeriesQuery.refetch();
    },
  });
  const updateSurgery = trpc.operations.updateSurgery.useMutation({
    onSuccess: () => surgeriesQuery.refetch(),
  });
  const utils = trpc.useUtils();
  const uploadEvidence = trpc.operations.uploadEvidence.useMutation();
  const checkIn = trpc.operations.checkIn.useMutation();
  const checkOut = trpc.operations.checkOut.useMutation();
  const updateTaskStatus = trpc.operations.updateTaskStatus.useMutation({
    onSuccess: (_, variables) => {
      setTaskStatusNotice(
        `Task status updated to ${variables.status.replace("_", " ")}.`
      );
      tasksQuery.refetch();
    },
    onError: error => setTaskStatusNotice(error.message),
  });
  const saveVisitReport = trpc.operations.saveVisitReport.useMutation({
    onSuccess: () => {
      setGpsStatus("Visit report saved.");
      visitQuery.refetch();
    },
  });
  const currentTask =
    tasksQuery.data?.find(task => task.id === selectedTaskId) ??
    tasksQuery.data?.[0];
  const taskMarkers = (tasksQuery.data ?? []).flatMap(task => {
    const latitude = Number(task.clientLatitude);
    const longitude = Number(task.clientLongitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [
          {
            id: task.id,
            position: { lat: latitude, lng: longitude },
            title: task.clientName,
          },
        ]
      : [];
  });
  const currentVisitMarkers =
    currentTask &&
    Number.isFinite(Number(currentTask.clientLatitude)) &&
    Number.isFinite(Number(currentTask.clientLongitude))
      ? [
          {
            id: currentTask.id,
            position: {
              lat: Number(currentTask.clientLatitude),
              lng: Number(currentTask.clientLongitude),
            },
            title: currentTask.clientName,
          },
        ]
      : [];
  const visitQuery = trpc.operations.visit.useQuery(
    { taskId: currentTask?.id || 0 },
    { enabled: Boolean(currentTask?.id) }
  );
  const current = tabs.find(tab => tab.id === active) ?? tabs[0];
  useEffect(() => {
    localStorage.setItem("ffm-visit-draft", notes);
  }, [notes]);
  useEffect(() => {
    if (opensWorkLog(active)) window.location.assign(WORK_LOG_PATH);
  }, [active]);
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setOfflineAction("");
      tasksQuery.refetch();
      messagesQuery.refetch();
      visitPlansQuery.refetch();
      surgeriesQuery.refetch();
      preferencesQuery.refetch();
      const queued = localStorage.getItem("ffm-pending-visit-report");
      if (queued) {
        try {
          const pending = JSON.parse(queued) as {
            taskId: number;
            report: string;
          };
          saveVisitReport.mutate(pending, {
            onSuccess: () =>
              localStorage.removeItem("ffm-pending-visit-report"),
            onError: () =>
              setOfflineAction(
                "A queued visit report could not be sent yet. Please retry from the Visit workspace."
              ),
          });
        } catch {
          localStorage.removeItem("ffm-pending-visit-report");
        }
      }
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [
    messagesQuery,
    preferencesQuery,
    saveVisitReport,
    surgeriesQuery,
    tasksQuery,
    visitPlansQuery,
  ]);
  useEffect(() => {
    if (preferencesQuery.data) {
      setPushNotifications(preferencesQuery.data.pushNotifications);
      setEmailNotifications(preferencesQuery.data.emailNotifications);
      setLocationSharing(preferencesQuery.data.locationSharing);
    }
  }, [preferencesQuery.data]);
  useEffect(() => {
    if (!isAuthenticated) return;
    const existing = document.getElementById("ffm-direct-gps");
    existing?.remove();
    const host = document.querySelector(".delegate-topbar");
    if (!host) return;
    const button = document.createElement("button");
    button.id = "ffm-direct-gps";
    button.type = "button";
    button.textContent = locationSharing ? "GPS active" : "Activate GPS";
    button.style.cssText =
      "position:static;margin-left:auto;margin-right:8px;padding:8px 10px;border:1px solid #67e8f9;border-radius:8px;background:#0b5ed7;color:#fff;font-weight:700;font-size:12px;white-space:nowrap;";
    button.disabled = locationSharing;
    button.onclick = () => activateDelegateGps();
    host.appendChild(button);
    return () => button.remove();
  }, [isAuthenticated, locationSharing]);
  useEffect(() => {
    if (active !== "messages") {
      messagesReadWorkspaceRef.current = false;
      return;
    }
    if (
      isAuthenticated &&
      !messagesReadWorkspaceRef.current &&
      !markMessagesRead.isPending
    ) {
      messagesReadWorkspaceRef.current = true;
      markMessagesRead.mutate();
    }
  }, [
    active,
    isAuthenticated,
    markMessagesRead.isPending,
    markMessagesRead.mutate,
  ]);
  const guardOffline = () => {
    if (!isOffline) return false;
    setOfflineAction(
      "Reconnect to the internet before sending changes. Your visit draft remains saved locally."
    );
    return true;
  };
  const queueVisitReport = (taskId: number, report: string) => {
    localStorage.setItem(
      "ffm-pending-visit-report",
      JSON.stringify({ taskId, report, queuedAt: Date.now() })
    );
    setOfflineAction(
      "Visit report queued on this device and will send automatically when you reconnect."
    );
  };
  const activateDelegateGps = () => {
    if (guardOffline()) return;
    setGpsStatus(
      "Requesting Android location permission… choose Allow when Chrome asks."
    );
    requestMobileLocation(
      position => {
        setLocationSharing(true);
        setGpsStatus(
          `GPS is active: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}. Live location sharing is enabled.`
        );
        updatePreferences.mutate({ locationSharing: true });
      },
      code => {
        setLocationSharing(false);
        setGpsStatus(androidLocationRecovery(code));
      }
    );
  };
  const updatePreference = (
    key: "pushNotifications" | "emailNotifications" | "locationSharing",
    value: boolean
  ) => {
    if (guardOffline()) return;
    if (key === "locationSharing" && value) {
      activateDelegateGps();
      return;
    }
    if (key === "pushNotifications") setPushNotifications(value);
    else if (key === "emailNotifications") setEmailNotifications(value);
    else setLocationSharing(value);
    updatePreferences.mutate(
      key === "pushNotifications"
        ? { pushNotifications: value }
        : key === "emailNotifications"
          ? { emailNotifications: value }
          : { locationSharing: value }
    );
  };
  if (loading)
    return (
      <div className="blueprint-page">
        <div className="blueprint-loader">{t("loadingManager")}</div>
      </div>
    );
  const uploadFile = async (
    file: File,
    kind: "photo" | "audio" | "signature" | "document"
  ) => {
    if (guardOffline()) return;
    const visitId = visitQuery.data?.id;
    if (!visitId) {
      setGpsStatus("Check in before uploading visit evidence.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      uploadEvidence.mutate({
        visitId,
        kind,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        base64: value,
      });
    };
    reader.readAsDataURL(file);
  };
  const saveSignature = () => {
    if (guardOffline()) return;
    const visitId = visitQuery.data?.id;
    const canvas = signatureCanvas.current;
    if (!visitId || !canvas) {
      setGpsStatus("Check in before saving a signature.");
      return;
    }
    uploadEvidence.mutate({
      visitId,
      kind: "signature",
      fileName: "client-signature.png",
      mimeType: "image/png",
      base64: canvas.toDataURL("image/png"),
    });
  };
  const drawSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvas.current;
    if (!canvas || event.buttons !== 1) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  };
  const captureGps = (action: "in" | "out") => {
    if (guardOffline()) return;
    if (!currentTask || !navigator.geolocation) {
      setGpsStatus(describeGeolocationError());
      return;
    }
    setGpsStatus("Acquiring location…");
    navigator.geolocation.getCurrentPosition(
      position => {
        const latitude = position.coords.latitude.toFixed(7);
        const longitude = position.coords.longitude.toFixed(7);
        const mutation = action === "in" ? checkIn : checkOut;
        mutation.mutate(
          action === "in"
            ? { taskId: currentTask.id, latitude, longitude }
            : { taskId: currentTask.id, latitude, longitude, report: notes },
          {
            onSuccess: () => {
              setGpsStatus(
                action === "in"
                  ? "Checked in with GPS."
                  : "Checked out with GPS."
              );
              utils.operations.visit.invalidate();
            },
            onError: error => setGpsStatus(error.message),
          }
        );
      },
      error => setGpsStatus(describeGeolocationError(error.code)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };
  const testGpsAndEnableSharing = activateDelegateGps;
  if (!isAuthenticated)
    return (
      <div className="blueprint-page login-view">
        <div className="blueprint-grid" />
        <Card className="login-card blueprint-card">
          <div className="login-language"><LanguageSwitcher /></div>
          <div className="logo-mark">FFM</div>
          <p className="eyebrow">{t("fieldRepresentative")}</p>
          <h1>FFM Delegate</h1>
          <p className="muted">{t("delegateLoginDescription")}</p>
          <Button
            className="w-full mt-6 blueprint-button"
            onClick={() => startLogin()}
          >
            {t("signIn")}
          </Button>
          <p className="login-note">
            {t("authenticationRequired")}
          </p>
        </Card>
      </div>
    );
  return (
    <div className="delegate-shell">
      <header className="delegate-topbar">
        <button className="delegate-menu" onClick={() => setMenuOpen(true)} aria-label={t("operations")}>
          <Menu size={20} />
        </button>
        <div className="delegate-brand">
          <div className="logo-mark small">FFM</div>
          <div>
            <strong>FFM Delegate</strong>
            <span>{t("fieldRepresentative")}</span>
          </div>
        </div>
        <div className="delegate-user">
          <LanguageSwitcher compact/>
          <span>{user?.name || user?.email || t("delegate")}</span>
          <button onClick={() => logout()} aria-label={t("signOut")}>
            <LogOut size={16} />
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="delegate-drawer">
          <div className="drawer-head">
            <strong>FFM Delegate</strong>
            <button onClick={() => setMenuOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {tabs.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActive(id);
                setMenuOpen(false);
              }}
              className={active === id ? "selected" : ""}
            >
              <Icon size={17} />
              {t(labelKey)}
            </button>
          ))}
          <button onClick={() => window.location.assign("/travel-expenses")}>
            <CircleDollarSign size={17} /> {t("travelExpenses")}
          </button>
          <button onClick={() => logout()}>
            <LogOut size={17} /> {t("signOut")}
          </button>
        </div>
      )}
      <main className="delegate-content">
        {isOffline && (
          <div className="admin-feedback error offline-banner">
            {offlineAction ||
              "You are offline. Visit drafts stay on this device and live updates will retry when you reconnect."}
          </div>
        )}
        {showWelcome && (
          <div className="welcome-banner">
            <div>
              <p className="eyebrow">{t("welcomeToFfm")}</p>
              <strong>{t("completeVisit")}</strong>
              <p className="muted">{t("delegateOnboardingText")}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.setItem("ffm-delegate-onboarding", "1");
                setShowWelcome(false);
              }}
            >
              {t("gotIt")}
            </Button>
          </div>
        )}
        <div className="delegate-heading">
          <div>
            <p className="eyebrow">FFM / {t(current.labelKey).toUpperCase()}</p>
            <h1>{t(current.labelKey)}</h1>
          </div>
          <div className="delegate-live">
            <span />{" "}
            {locationSharing ? t("liveLocationOn") : t("liveLocationOff")}
          </div>
        </div>
        {active === "tasks" && (
          <>
            <Card className="blueprint-card delegate-map">
              <CardHeader>
                <div>
                  <CardTitle>{t("todayRoute")}</CardTitle>
                  <p className="muted">
                    {tasksQuery.isLoading
                      ? t("syncingAssignedVisits")
                      : t("assignedVisits", { count: tasksQuery.data?.length ?? 0 })}
                  </p>
                </div>
                <Badge className="status-live">{t("live")}</Badge>
              </CardHeader>
              <CardContent>
                <MapView
                  className="delegate-map-height"
                  initialCenter={{ lat: 24.7136, lng: 46.6753 }}
                  initialZoom={11}
                  markers={taskMarkers}
                  route={
                    taskMarkers.length > 1
                      ? {
                          origin: taskMarkers[0].position,
                          destination:
                            taskMarkers[taskMarkers.length - 1].position,
                          waypoints: taskMarkers
                            .slice(1, -1)
                            .map(marker => ({
                              location: marker.position,
                              stopover: true,
                            })),
                        }
                      : undefined
                  }
                />
              </CardContent>
            </Card>
            <div className="delegate-task-list">
              <div className="delegate-section-title">
                <span>{t("assignedTasks")}</span>
                <Badge variant="outline">
                  {tasksQuery.data?.length ?? 0} {t("live")}
                </Badge>
              </div>
              {tasksQuery.isLoading ? (
                <div className="admin-feedback">{t("loadingAssignedTasks")}</div>
              ) : tasksQuery.error ? (
                <div className="admin-feedback error">
                  {t("unableLoadAssignedTasks", { message: tasksQuery.error.message })}
                </div>
              ) : tasksQuery.data?.length ? (
                tasksQuery.data.map((task, i) => (
                  <button
                    className="delegate-task-card"
                    key={task.id}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setTaskStatusNotice("");
                      setActive("visit");
                    }}
                  >
                    <div
                      className={`task-icon ${task.status === "in_progress" ? "active" : ""}`}
                    >
                      {task.status === "in_progress" ? (
                        <Navigation size={17} />
                      ) : (
                        <Clock3 size={17} />
                      )}
                    </div>
                    <div>
                      <strong>{task.clientName}</strong>
                      <span>
                        <MapPin size={12} /> {t("scheduledFieldVisit")}
                      </span>
                      <small>
                        {new Date(task.scheduledAt).toLocaleString(language === "ar" ? "ar-SA" : "en-GB")}
                      </small>
                    </div>
                    <Badge
                      className={
                        task.status === "in_progress"
                          ? "badge-success"
                          : "badge-warning"
                      }
                    >
                      {task.status.replace("_", " ")}
                    </Badge>
                  </button>
                ))
              ) : (
                <div className="admin-feedback">
                  {t("noAssignedTasks")}
                </div>
              )}
            </div>
          </>
        )}
        {active === "visit" && (
          <Card className="blueprint-card section-card delegate-visit">
            {visitQuery.isLoading && (
              <div className="admin-feedback">
                Loading current visit record…
              </div>
            )}
            {visitQuery.error && (
              <div className="admin-feedback error">
                Unable to load current visit: {visitQuery.error.message}
              </div>
            )}
            <div className="visit-banner">
              <div className="task-icon active">
                <Navigation size={17} />
              </div>
              <div>
                <p className="eyebrow">{t("currentAssignment")}</p>
                <h2>{currentTask?.clientName || t("noAssignmentSelected")}</h2>
                <p className="muted">
                  {currentTask?.scheduledAt
                    ? new Date(currentTask.scheduledAt).toLocaleString(language === "ar" ? "ar-SA" : "en-GB")
                    : t("schedulePending")} {" "}
                  · {currentTask?.clientCity || t("locationPending")}
                </p>
                <small className="visit-state">
                  {visitQuery.data?.checkOutAt
                    ? t("completedAt", { date: new Date(visitQuery.data.checkOutAt).toLocaleString(language === "ar" ? "ar-SA" : "en-GB") })
                    : visitQuery.data?.checkInAt
                      ? t("checkedInAt", { date: new Date(visitQuery.data.checkInAt).toLocaleString(language === "ar" ? "ar-SA" : "en-GB") })
                      : t("notCheckedIn")}
                </small>
              </div>
            </div>
            <MapView
              className="delegate-map-height small-map"
              initialCenter={{
                lat: Number(currentTask?.clientLatitude) || 24.7136,
                lng: Number(currentTask?.clientLongitude) || 46.6753,
              }}
              initialZoom={currentTask?.clientLatitude ? 14 : 11}
              markers={currentVisitMarkers}
            />
            <div className="location-caption">
              {currentTask?.clientCity || t("locationPending")} ·{" "}
              {currentTask?.clientLatitude
                ? t("liveClientCoordinates")
                : t("clientCoordinatesUnavailable")}
            </div>
            <div className="visit-status-control">
              <label htmlFor="delegate-task-status">{t("taskStatus")}</label>
              <select
                id="delegate-task-status"
                value={currentTask?.status || "pending"}
                disabled={!currentTask || updateTaskStatus.isPending}
                onChange={e => {
                  if (currentTask && !guardOffline())
                    updateTaskStatus.mutate({
                      id: currentTask.id,
                      status: e.target.value as
                        | "pending"
                        | "in_progress"
                        | "completed"
                        | "cancelled",
                    });
                }}
              >
                <option value="pending">{t("pending")}</option>
                <option value="in_progress">{t("inProgress")}</option>
                <option value="completed">{t("completed")}</option>
                <option value="cancelled">{t("cancelled")}</option>
              </select>
              {taskStatusNotice && (
                <span
                  className={
                    taskStatusNotice.startsWith("Task status updated")
                      ? "copy-notice success"
                      : "copy-notice error"
                  }
                >
                  {taskStatusNotice}
                </span>
              )}
            </div>
            <div className="visit-actions">
              <Button
                className="blueprint-button"
                disabled={checkIn.isPending || !currentTask}
                onClick={() => captureGps("in")}
              >
                <CheckCircle2 size={16} />{" "}
                {checkIn.isPending ? t("checkingIn") : t("checkIn")}
              </Button>
              <Button
                variant="outline"
                disabled={checkOut.isPending || !currentTask}
                onClick={() => captureGps("out")}
              >
                <Navigation size={16} />{" "}
                {checkOut.isPending ? t("checkingOut") : t("checkOut")}
              </Button>
            </div>
            <div className="form-stack">
              {gpsStatus && <div className="admin-feedback">{gpsStatus}</div>}
              <label>{t("visitReport")}</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t("visitReportPlaceholder")}
              />
              <Button
                className="blueprint-button"
                disabled={
                  !currentTask || !notes.trim() || saveVisitReport.isPending
                }
                onClick={() => {
                  if (currentTask) {
                    if (isOffline) queueVisitReport(currentTask.id, notes);
                    else
                      saveVisitReport.mutate({
                        taskId: currentTask.id,
                        report: notes,
                      });
                  }
                }}
              >
                {saveVisitReport.isPending ? t("savingReport") : t("saveReport")}
              </Button>
              {saveVisitReport.isSuccess && (
                <div className="admin-feedback success">
                  {t("visitReportSaved")}
                </div>
              )}
              {saveVisitReport.error && (
                <div className="admin-feedback error">
                  {saveVisitReport.error.message}
                </div>
              )}
              <label>{t("visitEvidence")}</label>
              <div className="evidence-upload-grid">
                <label className="evidence-upload">
                  {t("photo")}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e =>
                      e.target.files?.[0] &&
                      uploadFile(e.target.files[0], "photo")
                    }
                  />
                </label>
                <label className="evidence-upload">
                  {t("audio")}
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={e =>
                      e.target.files?.[0] &&
                      uploadFile(e.target.files[0], "audio")
                    }
                  />
                </label>
                <div className="evidence-upload signature-capture">
                  <span>{t("signature")}</span>
                  <canvas
                    ref={signatureCanvas}
                    width={260}
                    height={90}
                    onPointerDown={event => {
                      const canvas = signatureCanvas.current;
                      const rect = canvas?.getBoundingClientRect();
                      const ctx = canvas?.getContext("2d");
                      if (ctx && rect) {
                        ctx.beginPath();
                        ctx.moveTo(
                          event.clientX - rect.left,
                          event.clientY - rect.top
                        );
                      }
                    }}
                    onPointerMove={drawSignature}
                  />
                  <Button size="sm" variant="outline" onClick={saveSignature}>
                    {t("saveSignature")}
                  </Button>
                </div>
              </div>
              {uploadEvidence.isPending && (
                <div className="admin-feedback">{t("uploadingEvidence")}</div>
              )}
              {uploadEvidence.isSuccess && (
                <div className="admin-feedback success">
                  {t("evidenceUploaded")}
                </div>
              )}
              {uploadEvidence.error && (
                <div className="admin-feedback error">
                  {uploadEvidence.error.message}
                </div>
              )}
            </div>
          </Card>
        )}
        {active === "messages" && (
          <Card className="blueprint-card section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Team communication</p>
                <h1>Messages</h1>
                <p className="muted">
                  Send and receive messages with FFM team members.
                </p>
              </div>
            </div>
            <div className="form-stack mb-6">
              <label htmlFor="delegate-message-recipient">Recipient</label>
              <select
                id="delegate-message-recipient"
                value={messageRecipientId}
                disabled={messageRecipientsQuery.isLoading || sendMessage.isPending}
                onChange={event => {
                  setMessageRecipientId(event.target.value);
                  setMessageNotice("");
                }}
              >
                <option value="">— choose an FFM team member —</option>
                {(messageRecipientsQuery.data ?? []).map(recipient => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.displayName} · {formatMemberRole(recipient.role)}
                  </option>
                ))}
              </select>
              {messageRecipientsQuery.error && (
                <div className="admin-feedback error">
                  Unable to load FFM recipients: {messageRecipientsQuery.error.message}
                </div>
              )}
              <label htmlFor="delegate-message-body">Message</label>
              <Textarea
                id="delegate-message-body"
                value={messageBody}
                maxLength={5000}
                placeholder="Write a message to your FFM team…"
                onChange={event => {
                  setMessageBody(event.target.value);
                  setMessageNotice("");
                }}
              />
              <Button
                className="blueprint-button"
                disabled={!canSendTeamMessage(messageRecipientId, messageBody, sendMessage.isPending)}
                onClick={() => {
                  if (!guardOffline()) {
                    sendMessage.mutate({
                      recipientId: Number(messageRecipientId),
                      body: messageBody.trim(),
                    });
                  }
                }}
              >
                <MessageSquare size={15} />
                {sendMessage.isPending ? "Sending…" : "Send message"}
              </Button>
              {messageNotice && (
                <div
                  className={
                    messageNotice.startsWith("Message sent")
                      ? "admin-feedback success"
                      : "admin-feedback error"
                  }
                >
                  {messageNotice}
                </div>
              )}
            </div>
            {messagesQuery.isLoading ? (
              <div className="admin-feedback">Loading messages…</div>
            ) : messagesQuery.error ? (
              <div className="admin-feedback error">
                Unable to load messages: {messagesQuery.error.message}
              </div>
            ) : messagesQuery.data?.length ? (
              messagesQuery.data
                .slice()
                .reverse()
                .map(item => (
                  <div
                    className={
                      item.senderId === user?.id
                        ? "delegate-message from-me"
                        : "delegate-message from-manager"
                    }
                    key={item.id}
                  >
                    <strong>
                      {item.senderId === user?.id ? "You" : item.senderName}
                    </strong>
                    <p>{item.body}</p>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </div>
                ))
            ) : (
              <div className="admin-feedback">
                No team messages yet. Choose a recipient above to start a conversation.
              </div>
            )}
          </Card>
        )}
        {active === "surgery" && (
          <Card className="blueprint-card section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Clinical records</p>
                <h1>My Surgery Log</h1>
                <p className="muted">
                  Review scheduled and completed procedures from the FFM
                  database.
                </p>
              </div>
            </div>
            <div className="inline-form">
              <select
                value={surgeryClientId}
                onChange={e => setSurgeryClientId(e.target.value)}
              >
                <option value="">Choose client</option>
                {(clientsQuery.data || []).map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <Input
                value={surgeryProcedure}
                onChange={e => setSurgeryProcedure(e.target.value)}
                placeholder="Procedure name"
              />
              <Input
                value={surgeryHospital}
                onChange={e => setSurgeryHospital(e.target.value)}
                placeholder="Hospital"
              />
              <Input
                type="date"
                value={surgeryDate}
                onChange={e => setSurgeryDate(e.target.value)}
              />
              <Button
                className="blueprint-button"
                disabled={
                  !surgeryClientId ||
                  !surgeryProcedure ||
                  !surgeryDate ||
                  addSurgery.isPending
                }
                onClick={() => {
                  if (!guardOffline())
                    addSurgery.mutate({
                      clientId: Number(surgeryClientId),
                      procedureName: surgeryProcedure,
                      hospital: surgeryHospital || undefined,
                      surgeryDate: new Date(surgeryDate),
                    });
                }}
              >
                <CalendarPlus size={15} />
                {addSurgery.isPending ? "Saving…" : "Add record"}
              </Button>
            </div>
            {surgeriesQuery.isLoading ? (
              <div className="admin-feedback">Loading surgery records…</div>
            ) : surgeriesQuery.error ? (
              <div className="admin-feedback error">
                Unable to load surgery records: {surgeriesQuery.error.message}
              </div>
            ) : surgeriesQuery.data?.length ? (
              surgeriesQuery.data.map(record => (
                <div className="surgery-row" key={record.id}>
                  <div className="task-icon active">
                    <Stethoscope size={17} />
                  </div>
                  <div>
                    <strong>{record.procedureName}</strong>
                    <span>
                      {record.hospital || "Hospital not set"} ·{" "}
                      {new Date(record.surgeryDate).toLocaleDateString()}
                    </span>
                  </div>
                  <select
                    className="admin-role-select compact"
                    value={record.status}
                    disabled={updateSurgery.isPending}
                    onChange={e => {
                      if (!guardOffline())
                        updateSurgery.mutate({
                          id: record.id,
                          status: e.target.value as
                            | "pending"
                            | "partial"
                            | "collected",
                        });
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="collected">Collected</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.assign(surgeryCalendarPath(record.id))}
                  >
                    Implants & details
                  </Button>
                </div>
              ))
            ) : (
              <div className="admin-feedback">
                No surgery records yet. Add the first record above.
              </div>
            )}
          </Card>
        )}
        {active === "plan" && (
          <Card className="blueprint-card section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Self-service planning</p>
                <h1>Plan My Visits</h1>
                <p className="muted">
                  Submit proposed visits for Manager review.
                </p>
              </div>
            </div>
            <div className="form-stack">
              <label>Select hospital / client</label>
              <select
                value={surgeryClientId}
                onChange={e => setSurgeryClientId(e.target.value)}
              >
                <option value="">— choose client —</option>
                {(clientsQuery.data || []).map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <label>Visit date</label>
              <Input
                type="date"
                value={surgeryDate}
                onChange={e => setSurgeryDate(e.target.value)}
              />
              <label>Purpose / notes</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Describe the proposed visit…"
              />
              <Button
                className="blueprint-button"
                disabled={
                  !surgeryClientId || !surgeryDate || submitVisitPlan.isPending
                }
                onClick={() => {
                  if (!guardOffline())
                    submitVisitPlan.mutate({
                      clientId: Number(surgeryClientId),
                      proposedAt: new Date(surgeryDate),
                      notes,
                    });
                }}
              >
                <CalendarPlus size={15} />
                {submitVisitPlan.isPending
                  ? "Submitting…"
                  : "Submit visit plan"}
              </Button>
            </div>
            {submitVisitPlan.isSuccess && (
              <div className="admin-feedback success">
                Visit plan submitted for Manager review.
              </div>
            )}
            {submitVisitPlan.error && (
              <div className="admin-feedback error">
                {submitVisitPlan.error.message}
              </div>
            )}
            <div className="invite-summary">
              <strong>My submitted plans</strong>
              {visitPlansQuery.isLoading ? (
                <span>Loading plans…</span>
              ) : visitPlansQuery.error ? (
                <span className="copy-notice error">
                  Unable to load plans: {visitPlansQuery.error.message}
                </span>
              ) : visitPlansQuery.data?.length ? (
                visitPlansQuery.data
                  .slice()
                  .reverse()
                  .map(plan => (
                    <span key={plan.id}>
                      {new Date(plan.proposedAt).toLocaleDateString()} ·{" "}
                      {plan.status === "approved"
                        ? "Approved"
                        : plan.status === "rejected"
                          ? "Rejected"
                          : "Pending review"}
                      {plan.reviewedAt
                        ? ` · reviewed ${new Date(plan.reviewedAt).toLocaleString()}`
                        : ""}
                      {plan.reviewerName || plan.reviewerEmail
                        ? ` by ${plan.reviewerName || plan.reviewerEmail}`
                        : ""}
                    </span>
                  ))
              ) : (
                <span>No plans submitted yet.</span>
              )}
            </div>
          </Card>
        )}
        {active === "profile" && (
          <Card className="blueprint-card section-card profile-card">
            <div className="profile-avatar">
              {(user?.name || user?.email || "D")[0].toUpperCase()}
            </div>
            <p className="eyebrow">Authenticated delegate</p>
            <h1>{user?.name || "Field Delegate"}</h1>
            <p className="muted">{user?.email || "Delegate profile"}</p>
            <div className="profile-grid">
              <div>
                <span>Role</span>
                <strong>Field Representative</strong>
              </div>
              <div>
                <span>Coverage</span>
                <strong>Assigned region pending</strong>
              </div>
              <div>
                <span>Account status</span>
                <strong className="green-text">Active</strong>
              </div>
            </div>
            <div className="notification-preferences">
              <p className="eyebrow">Notification preferences</p>
              <p className="muted">
                {preferencesQuery.isLoading
                  ? "Loading saved preferences…"
                  : updatePreferences.isPending
                    ? "Saving preference…"
                    : updatePreferences.error
                      ? `Unable to save: ${updatePreferences.error.message}`
                      : "Saved to your account"}
              </p>
              <p className="muted">
                Live location sharing is optional; visit GPS check-in remains
                available for visit evidence and timestamps.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  disabled={
                    preferencesQuery.isLoading || updatePreferences.isPending
                  }
                  onChange={e =>
                    updatePreference("pushNotifications", e.target.checked)
                  }
                />{" "}
                Push alerts for assigned visits
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  disabled={
                    preferencesQuery.isLoading || updatePreferences.isPending
                  }
                  onChange={e =>
                    updatePreference("emailNotifications", e.target.checked)
                  }
                />{" "}
                Email summaries and reminders
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={locationSharing}
                  disabled={
                    preferencesQuery.isLoading || updatePreferences.isPending
                  }
                  onChange={e =>
                    updatePreference("locationSharing", e.target.checked)
                  }
                />{" "}
                Share live location with assigned manager
              </label>
            </div>
            <Button variant="outline" onClick={() => logout()}>
              <LogOut size={15} /> Sign out
            </Button>
          </Card>
        )}
      </main>
      <nav className="delegate-bottom-nav">
        {tabs.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            className={active === id ? "active" : ""}
            onClick={() => setActive(id)}
          >
            <Icon size={18} />
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
