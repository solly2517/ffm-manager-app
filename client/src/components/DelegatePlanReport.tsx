import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  availableWeeks,
  buildPlanReportPrintDocument,
  buildWeekView,
  formatDayHeading,
  weekDates,
  type CompareStatus,
  type PrintMode,
} from "@/lib/delegatePlanReport";

const statusLabel: Record<CompareStatus, string> = {
  completed: "Completed",
  notReported: "Planned, not reported",
  unplanned: "Reported, not planned",
};
const statusClass: Record<CompareStatus, string> = {
  completed: "text-emerald-300",
  notReported: "text-amber-300",
  unplanned: "text-sky-300",
};

export function DelegatePlanReport() {
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isAdminUser = user?.role === "admin";
  const printLanguage = language === "ar" ? "ar" : "en";

  const plansQuery = trpc.delegatePlanning.weeklyPlans.useQuery(undefined, { enabled: isAuthenticated });
  const reportsQuery = trpc.delegatePlanning.dailyReports.useQuery(undefined, { enabled: isAuthenticated });
  const clientsQuery = trpc.operations.clients.useQuery(undefined, { enabled: isAuthenticated });
  const doctorsQuery = trpc.operations.doctors.useQuery(undefined, { enabled: isAuthenticated });
  const delegatesQuery = trpc.operations.delegates.useQuery(undefined, { enabled: isAuthenticated && isAdminUser });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState<string>("");
  const [printMode, setPrintMode] = useState<PrintMode>("compare");
  const [printRange, setPrintRange] = useState<"week" | "day">("week");
  const [printDay, setPrintDay] = useState<string>("");
  const [notice, setNotice] = useState("");

  const plans = plansQuery.data ?? [];
  const reports = reportsQuery.data ?? [];

  // Delegates: everyone the API already scopes to this user, plus (for admins) the full delegate list.
  const delegates = useMemo(() => {
    const byId = new Map<number, string>();
    for (const delegate of delegatesQuery.data ?? []) byId.set(delegate.id, delegate.name || delegate.email || `Delegate ${delegate.id}`);
    for (const row of [...plans, ...reports]) {
      if (row.delegateId != null && !byId.has(row.delegateId)) byId.set(row.delegateId, row.delegateName || row.authorName || `Delegate ${row.delegateId}`);
    }
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [delegatesQuery.data, plans, reports]);

  const clientName = useMemo(() => {
    const map = new Map((clientsQuery.data ?? []).map((client) => [client.id, client.name]));
    return (id: number) => map.get(id) ?? `Hospital #${id}`;
  }, [clientsQuery.data]);
  const doctorName = useMemo(() => {
    const map = new Map((doctorsQuery.data ?? []).map((doctor) => [doctor.id, doctor.name]));
    return (id: number) => map.get(id) ?? `Doctor #${id}`;
  }, [doctorsQuery.data]);

  const delegatePlans = useMemo(() => plans.filter((plan) => plan.delegateId === selectedId), [plans, selectedId]);
  const delegateReports = useMemo(() => reports.filter((report) => report.delegateId === selectedId), [reports, selectedId]);
  const weeks = useMemo(() => availableWeeks(delegatePlans, delegateReports), [delegatePlans, delegateReports]);

  // Keep the selected week valid whenever the delegate (or data) changes.
  useEffect(() => {
    if (!weeks.length) {
      setWeekStart("");
      return;
    }
    if (!weeks.includes(weekStart)) setWeekStart(weeks[0]!);
  }, [weeks, weekStart]);

  const weekView = useMemo(
    () => (weekStart ? buildWeekView({ weekStart, plans: delegatePlans, reports: delegateReports, clientName, doctorName }) : null),
    [weekStart, delegatePlans, delegateReports, clientName, doctorName]
  );

  useEffect(() => {
    if (weekView && !weekView.days.some((day) => day.date === printDay)) setPrintDay(weekView.days[0]?.date ?? "");
  }, [weekView, printDay]);

  const selectedDelegate = delegates.find((delegate) => delegate.id === selectedId) ?? null;
  const loading = plansQuery.isLoading || reportsQuery.isLoading;

  const print = () => {
    if (!weekView || !selectedDelegate) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=900");
    if (!printWindow) {
      setNotice("Printing was blocked by the browser. Please allow pop-ups for FFM, then try again.");
      return;
    }
    setNotice("");
    printWindow.document.open();
    printWindow.document.write(
      buildPlanReportPrintDocument({
        delegateName: selectedDelegate.name,
        week: weekView,
        mode: printMode,
        day: printRange === "day" ? printDay : null,
        language: printLanguage,
      })
    );
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  return (
    <section className="blueprint-card section-card" data-testid="delegate-plan-report">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Field performance</p>
          <h2>Delegate plan vs report</h2>
          <p className="muted">Select a delegate to compare the weekly plan with the daily reports, then print by week or by day.</p>
        </div>
      </div>

      {loading ? (
        <div className="admin-feedback">Loading delegate plans and reports…</div>
      ) : plansQuery.error || reportsQuery.error ? (
        <div className="admin-feedback error">Unable to load plans and reports: {(plansQuery.error || reportsQuery.error)?.message}</div>
      ) : !delegates.length ? (
        <div className="admin-feedback">No delegates with submitted plans or reports yet.</div>
      ) : (
        <>
          <div className="inline-form" style={{ flexWrap: "wrap" }}>
            {delegates.map((delegate) => (
              <Button
                key={delegate.id}
                variant={delegate.id === selectedId ? "default" : "outline"}
                className={delegate.id === selectedId ? "blueprint-button" : ""}
                onClick={() => {
                  setSelectedId(delegate.id);
                  setNotice("");
                }}
              >
                {delegate.name}
              </Button>
            ))}
          </div>

          {!selectedDelegate ? (
            <div className="admin-feedback">Choose a delegate above to open their plan and report.</div>
          ) : !weekView ? (
            <div className="admin-feedback">{selectedDelegate.name} has not submitted a weekly plan or daily report yet.</div>
          ) : (
            <>
              <div className="inline-form" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <strong>{selectedDelegate.name}</strong>
                <label className="muted">
                  Week (Sat–Thu){" "}
                  <select value={weekStart} onChange={(event) => setWeekStart(event.target.value)}>
                    {weeks.map((week) => (
                      <option key={week} value={week}>
                        {week} → {weekDates(week)[5]}
                      </option>
                    ))}
                  </select>
                </label>
                {weekView.plan ? <Badge variant="outline">Plan: {weekView.plan.status}</Badge> : <Badge variant="outline">No plan submitted</Badge>}
              </div>

              <div className="inline-form" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <Printer size={16} />
                <label className="muted">
                  Print{" "}
                  <select value={printMode} onChange={(event) => setPrintMode(event.target.value as PrintMode)}>
                    <option value="compare">Plan vs report</option>
                    <option value="plan">Plan only</option>
                    <option value="report">Report only</option>
                  </select>
                </label>
                <label className="muted">
                  Range{" "}
                  <select value={printRange} onChange={(event) => setPrintRange(event.target.value as "week" | "day")}>
                    <option value="week">Full week</option>
                    <option value="day">Single day</option>
                  </select>
                </label>
                {printRange === "day" && (
                  <select value={printDay} onChange={(event) => setPrintDay(event.target.value)}>
                    {weekView.days.map((day) => (
                      <option key={day.date} value={day.date}>
                        {formatDayHeading(day.date, "en")}
                      </option>
                    ))}
                  </select>
                )}
                <Button className="blueprint-button" onClick={print}>
                  <Printer size={15} /> Print / Save PDF
                </Button>
              </div>
              {notice && <div className="admin-feedback error">{notice}</div>}

              {weekView.days.map((day) => (
                <div key={day.date} className="border border-slate-700 p-4 mb-3">
                  <div className="flex justify-between gap-3 mb-2">
                    <strong>{formatDayHeading(day.date, "en")}</strong>
                    <span className="muted">
                      {day.planned.length} planned · {day.reported.length} reported
                    </span>
                  </div>
                  {day.compare.length ? (
                    <div className="data-table">
                      <div className="table-row table-head">
                        <span>Hospital</span>
                        <span>Doctor</span>
                        <span>Status</span>
                      </div>
                      {day.compare.map((line, index) => (
                        <div className="table-row" key={`${line.hospital}-${line.doctor}-${index}`}>
                          <span>{line.hospital}</span>
                          <span>{line.doctor}</span>
                          <span className={statusClass[line.status]}>{statusLabel[line.status]}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Nothing planned or reported for this day.</p>
                  )}
                  {day.reportTexts.map((text, index) => (
                    <div key={index} className="mt-3 whitespace-pre-wrap">
                      <p>
                        <strong>Activity:</strong> {text.summary}
                      </p>
                      <p className="muted">
                        <strong>Outcomes:</strong> {text.outcomes}
                      </p>
                      {text.challenges && (
                        <p className="muted">
                          <strong>Challenges:</strong> {text.challenges}
                        </p>
                      )}
                      {text.nextActions && (
                        <p className="muted">
                          <strong>Next actions:</strong> {text.nextActions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
