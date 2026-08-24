import React, { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOptionalLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

function currentWeekStart() { const date = new Date(); const offset = (date.getDay() + 6) % 7; date.setDate(date.getDate() - offset); return date.toISOString().slice(0, 10); }

export function ManagerHandoverAnalyticsExport() {
  const { language } = useOptionalLanguage();
  const c = language === "ar" ? { eyebrow: "تحليلات المدير", title: "تسليمات المستشفى الأسبوعية", description: "تسليمات مكتملة وصور إثبات وحالة إقرار محسوبة من الخادم للأسبوع المحدد الذي يبدأ يوم الاثنين.", week: "الأسبوع الذي يبدأ", preparing: "جارٍ إعداد CSV…", export: "تصدير CSV أسبوعي", exportError: "تعذر تصدير التحليلات الأسبوعية.", exported: "عملية تسليم صُدرت للأسبوع المحدد.", calculating: "جارٍ حساب نشاط التسليم الأسبوعي…", to: "إلى", boundary: "حدود إعداد التقارير بتوقيت UTC", complete: "التسليمات المكتملة", acknowledged: "تم الإقرار", awaiting: "بانتظار الإقرار", photos: "صور الكاميرا المباشرة" } : { eyebrow: "Manager analytics", title: "Weekly hospital handovers", description: "Server-calculated completed handovers, proof photos, and acknowledgement status for the selected Monday-start week.", week: "Week starting", preparing: "Preparing CSV…", export: "Export weekly CSV", exportError: "Weekly analytics could not be exported.", exported: "handover exported for the selected week.", calculating: "Calculating weekly handover activity…", to: "to", boundary: "UTC reporting boundary", complete: "Completed handovers", acknowledged: "Acknowledged", awaiting: "Awaiting acknowledgement", photos: "Live-camera photos" };
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const queryInput = useMemo(() => ({ weekStart }), [weekStart]);
  const analytics = trpc.operations.weeklyWarehouseHandoverAnalytics.useQuery(queryInput);
  const exportQuery = trpc.operations.exportWarehouseHandoverWeeklyAnalyticsCsv.useQuery(queryInput, { enabled: false });
  const [notice, setNotice] = useState("");
  const exportCsv = async () => { setNotice(""); const result = await exportQuery.refetch(); if (!result.data || result.error) { setNotice(result.error?.message || c.exportError); return; } const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = result.data.filename; link.click(); URL.revokeObjectURL(url); setNotice(`${result.data.summary.totalHandovers} ${c.exported}`); };
  const data = analytics.data;
  return <Card className="blueprint-card section-card mt-4"><CardHeader><div><p className="eyebrow">{c.eyebrow}</p><CardTitle className="flex items-center gap-2"><BarChart3 size={19}/>{c.title}</CardTitle><p className="muted">{c.description}</p></div></CardHeader><CardContent><div className="flex flex-wrap items-end gap-3"><label className="flex flex-col gap-1 text-xs text-slate-300"><span>{c.week}</span><Input type="date" className="h-9 w-44" value={weekStart} onChange={event => setWeekStart(event.target.value)}/></label><Button variant="outline" disabled={exportQuery.isFetching || analytics.isLoading} onClick={exportCsv}><Download size={16}/>{exportQuery.isFetching ? c.preparing : c.export}</Button></div>{notice && <div className={exportQuery.error ? "admin-feedback error mt-3" : "admin-feedback success mt-3"}>{notice}</div>}{analytics.isLoading ? <div className="admin-feedback mt-4">{c.calculating}</div> : analytics.error ? <div className="admin-feedback error mt-4">{analytics.error.message}</div> : data && <><p className="muted mt-4 text-sm">{new Date(`${data.weekStart}T00:00:00Z`).toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB")} {c.to} {new Date(`${data.weekEnd}T00:00:00Z`).toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB")} ({c.boundary})</p><div className="mt-3 grid gap-3 sm:grid-cols-4"><Metric label={c.complete} value={data.totalHandovers}/><Metric label={c.acknowledged} value={data.acknowledgedHandovers}/><Metric label={c.awaiting} value={data.awaitingAcknowledgement}/><Metric label={c.photos} value={data.totalProofPhotos}/></div></>}</CardContent></Card>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-md border border-cyan-400/20 bg-slate-950/20 p-3"><p className="muted text-xs">{label}</p><strong className="mt-1 block text-xl">{value}</strong></div>; }
