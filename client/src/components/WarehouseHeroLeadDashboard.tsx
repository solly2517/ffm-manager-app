import React, { useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, ClipboardList, Download, Home, MapPin, PackageCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileStickyActions, WorkspaceBreadcrumbs } from "@/components/WorkspaceNavigation";
import { trpc } from "@/lib/trpc";

export function WarehouseHeroLeadDashboard({ onBack }: { onBack: () => void }) {
  const activityQuery = trpc.operations.warehouseHeroLeadActivity.useQuery();
  const exportQuery = trpc.operations.exportWarehouseHeroLeadActivityCsv.useQuery(undefined, { enabled: false });
  const [exportFeedback, setExportFeedback] = useState("");
  const rows = activityQuery.data ?? [];
  const totalTodayTasks = rows.reduce((sum, row) => sum + row.todayTaskCount, 0);
  const totalOpenTasks = rows.reduce((sum, row) => sum + row.openTaskCount, 0);
  const totalProofs = rows.reduce((sum, row) => sum + row.recentProofCount, 0);
  const totalOverdueProofs = rows.reduce((sum, row) => sum + row.overdueProofTaskCount, 0);
  const downloadCsv = async () => {
    setExportFeedback("");
    const result = await exportQuery.refetch();
    if (result.error || !result.data) { setExportFeedback(result.error?.message || "The CSV could not be prepared."); return; }
    const url = URL.createObjectURL(new Blob([result.data], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ffm-warehouse-hero-lead-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportFeedback("CSV downloaded. Only your authorized Warehouse Hero scope is included.");
  };

  return <section className="space-y-6 pb-20 md:pb-0">
    <WorkspaceBreadcrumbs items={[{ label: "Dashboard", onClick: onBack }, { label: "Warehouse operations" }, { label: "Hero Lead Activity" }]}/>
    <div className="page-intro"><div><p className="eyebrow">Warehouse operations</p><h1>Warehouse Hero Lead Activity</h1><p className="muted">Read-only supervision of your assigned Warehouse Heroes, daily tasks, delivery evidence, and latest location activity.</p></div><div className="mt-3 flex flex-wrap gap-2 sm:mt-0"><Button variant="outline" onClick={onBack}><ArrowLeft size={16}/> Back to Dashboard</Button><Button className="blueprint-button" disabled={exportQuery.isFetching} onClick={downloadCsv}><Download size={16}/>{exportQuery.isFetching ? "Preparing CSV…" : "Export CSV"}</Button></div></div>
    {exportFeedback && <div className={exportQuery.error ? "admin-feedback error" : "admin-feedback success"}>{exportFeedback}</div>}
    {activityQuery.isLoading ? <div className="admin-feedback">Loading assigned Warehouse Hero activity…</div> : activityQuery.error ? <div className="admin-feedback error">{activityQuery.error.message}</div> : <>
      <div className="grid gap-4 md:grid-cols-4"><MetricCard icon={Truck} iconClass="text-cyan-300" label="Assigned Heroes" value={rows.length}/><MetricCard icon={ClipboardList} iconClass="text-amber-300" label="Today / Open Tasks" value={`${totalTodayTasks} / ${totalOpenTasks}`}/><MetricCard icon={PackageCheck} iconClass="text-emerald-300" label="Proofs in 14 Days" value={totalProofs}/><MetricCard icon={AlertTriangle} iconClass={totalOverdueProofs ? "text-amber-300" : "text-slate-400"} label="Overdue Proof Alerts" value={totalOverdueProofs} alert={Boolean(totalOverdueProofs)}/></div>
      {totalOverdueProofs > 0 && <div className="admin-feedback error"><AlertTriangle className="mr-2 inline" size={16}/>{totalOverdueProofs} past scheduled task{totalOverdueProofs === 1 ? " is" : "s are"} missing a delivery proof. Alerts are calculated when this workspace loads; they do not send email or push notifications.</div>}
      <Card className="blueprint-card"><CardHeader><CardTitle>Assigned Warehouse Heroes</CardTitle><p className="muted">Task metrics use real Hero-assigned records. A proof alert applies to a non-cancelled task before today without proof captured at or after its scheduled time.</p></CardHeader><CardContent>{rows.length ? <div className="grid gap-4 lg:grid-cols-2">{rows.map(hero => <div key={hero.id} className="rounded-lg border border-cyan-400/20 bg-slate-950/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{hero.name}</strong><p className="muted text-sm">{hero.email || "Email unavailable"}</p></div><Badge variant="outline">{hero.todayTaskCount} today</Badge></div>{hero.overdueProofTaskCount > 0 && <div className="mt-3 rounded-md border border-amber-400/40 bg-amber-950/25 px-3 py-2 text-sm text-amber-100"><AlertTriangle className="mr-2 inline" size={14}/><strong>{hero.overdueProofTaskCount}</strong> overdue proof alert{hero.overdueProofTaskCount === 1 ? "" : "s"}. {hero.overdueProofTasks.map(task => new Date(task.scheduledAt).toLocaleDateString()).join(", ")}</div>}<div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><b className="block text-lg">{hero.openTaskCount}</b><span className="muted text-xs">Open tasks</span></div><div><b className="block text-lg">{hero.completedTaskCount}</b><span className="muted text-xs">Completed</span></div><div><b className="block text-lg">{hero.recentProofCount}</b><span className="muted text-xs">Recent proofs</span></div></div><div className="mt-4 rounded-md border border-cyan-400/15 px-3 py-2 text-sm"><span className="inline-flex items-center gap-2"><MapPin size={14} className="text-cyan-300"/>{hero.latestLocationAt ? `Latest GPS activity: ${new Date(hero.latestLocationAt).toLocaleString()}` : "No GPS activity has been shared."}</span></div><div className="mt-3"><p className="mb-2 flex items-center gap-2 text-sm font-medium"><Activity size={14}/>Recent delivery evidence</p>{hero.recentProofs.length ? <ul className="space-y-1 text-sm text-slate-300">{hero.recentProofs.map(proof => <li key={proof.id}>{new Date(proof.capturedAt).toLocaleDateString()} · {proof.note || "Delivery proof"} <span className="muted">({proof.captureSource === "live_camera" ? "live camera" : proof.mimeType})</span></li>)}</ul> : <p className="muted text-sm">No delivery evidence in the recent activity window.</p>}</div></div>)}</div> : <div className="admin-feedback">No Warehouse Heroes are currently assigned to this lead.</div>}</CardContent></Card>
    </>}
    <MobileStickyActions primary={{ label: "Dashboard", icon: Home, onClick: onBack }} secondary={{ label: "Export CSV", icon: Download, onClick: downloadCsv, disabled: exportQuery.isFetching }}/>
  </section>;
}

function MetricCard({ icon: Icon, iconClass, label, value, alert = false }: { icon: typeof Truck; iconClass: string; label: string; value: number | string; alert?: boolean }) {
  return <Card className={alert ? "border-amber-400/50 bg-amber-950/20" : "blueprint-card"}><CardContent className="pt-5"><div className="flex items-center gap-3"><Icon className={iconClass}/><div><p className="muted text-sm">{label}</p><strong className="text-2xl">{value}</strong></div></div></CardContent></Card>;
}
