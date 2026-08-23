import React, { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

function currentWeekStart() {
  const date = new Date();
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function ManagerHandoverAnalyticsExport() {
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const queryInput = useMemo(() => ({ weekStart }), [weekStart]);
  const analytics = trpc.operations.weeklyWarehouseHandoverAnalytics.useQuery(queryInput);
  const exportQuery = trpc.operations.exportWarehouseHandoverWeeklyAnalyticsCsv.useQuery(queryInput, { enabled: false });
  const [notice, setNotice] = useState("");
  const exportCsv = async () => {
    setNotice("");
    const result = await exportQuery.refetch();
    if (!result.data || result.error) { setNotice(result.error?.message || "Weekly analytics could not be exported."); return; }
    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`${result.data.summary.totalHandovers} handover${result.data.summary.totalHandovers === 1 ? "" : "s"} exported for the selected week.`);
  };
  const data = analytics.data;
  return <Card className="blueprint-card section-card mt-4"><CardHeader><div><p className="eyebrow">Manager analytics</p><CardTitle className="flex items-center gap-2"><BarChart3 size={19}/> Weekly hospital handovers</CardTitle><p className="muted">Server-calculated completed handovers, proof photos, and acknowledgement status for the selected Monday-start week.</p></div></CardHeader><CardContent><div className="flex flex-wrap items-end gap-3"><label className="flex flex-col gap-1 text-xs text-slate-300"><span>Week starting</span><Input type="date" className="h-9 w-44" value={weekStart} onChange={event => setWeekStart(event.target.value)}/></label><Button variant="outline" disabled={exportQuery.isFetching || analytics.isLoading} onClick={exportCsv}><Download size={16}/>{exportQuery.isFetching ? "Preparing CSV…" : "Export weekly CSV"}</Button></div>{notice && <div className={exportQuery.error ? "admin-feedback error mt-3" : "admin-feedback success mt-3"}>{notice}</div>}{analytics.isLoading ? <div className="admin-feedback mt-4">Calculating weekly handover activity…</div> : analytics.error ? <div className="admin-feedback error mt-4">{analytics.error.message}</div> : data && <><p className="muted mt-4 text-sm">{new Date(`${data.weekStart}T00:00:00Z`).toLocaleDateString()} to {new Date(`${data.weekEnd}T00:00:00Z`).toLocaleDateString()} (UTC reporting boundary)</p><div className="mt-3 grid gap-3 sm:grid-cols-4"><Metric label="Completed handovers" value={data.totalHandovers}/><Metric label="Acknowledged" value={data.acknowledgedHandovers}/><Metric label="Awaiting acknowledgement" value={data.awaitingAcknowledgement}/><Metric label="Live-camera photos" value={data.totalProofPhotos}/></div></>}</CardContent></Card>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-md border border-cyan-400/20 bg-slate-950/20 p-3"><p className="muted text-xs">{label}</p><strong className="mt-1 block text-xl">{value}</strong></div>; }
