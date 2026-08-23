import { useState } from "react";
import { Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ALTAMAM_REPORT_LOGO_URL, departmentComparisonRows, departmentExecutiveSummary, type DepartmentMonthlySummary } from "@/lib/departmentMonthlySummaryPdf";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: DepartmentMonthlySummary | null;
  commentary: string;
  onCommentaryChange: (value: string) => void;
  onDownload: (summary: DepartmentMonthlySummary) => void;
  onShare: (commentary: string) => void;
  isSharing: boolean;
  shareLink: string;
};

export function DepartmentMonthlySummaryPreview({ open, onOpenChange, summary, commentary, onCommentaryChange, onDownload, onShare, isSharing, shareLink }: Props) {
  const [copied, setCopied] = useState(false);
  const comparison = departmentComparisonRows(summary?.totals ?? []);
  const executive = departmentExecutiveSummary(summary?.totals ?? []);
  const maximum = Math.max(1, ...comparison.flatMap(item => [item.members, item.tasks, item.workLog]));
  const monthLabel = summary ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${summary.month}-01T00:00:00.000Z`)) : "Monthly report";
  const copyShareLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard?.writeText(shareLink);
    setCopied(true);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-teal-900/30 bg-[#f7faf8] text-[#19373b]"><DialogHeader><div className="flex flex-wrap items-start justify-between gap-4 pr-8"><div className="rounded-xl border border-teal-900/10 bg-white px-3 py-2 shadow-sm"><img src={ALTAMAM_REPORT_LOGO_URL} alt="Al Tamam Medical Corporation" className="h-10 w-auto" /></div><div className="text-right"><DialogTitle className="text-[#19373b]">Monthly Department Summary</DialogTitle><DialogDescription className="text-[#5b6c6c]">Review the authorized report data before generating or securely sharing the PDF.</DialogDescription></div></div></DialogHeader>{summary && <div className="space-y-5"><div className="rounded-xl border border-teal-900/10 bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-lg font-semibold text-[#19373b]">{monthLabel}</p><p className="text-sm text-[#5b6c6c]">{summary.from} to {summary.to}</p></div><Badge className="border border-teal-900/15 bg-[#dff1ed] text-[#1b6f6f]">{summary.totals.length} departments</Badge></div><p className="mt-3 text-xs text-[#5b6c6c]">Member-role counts reflect current department assignments. Task and Work Log counts use the selected month.</p></div><div className="rounded-xl border border-teal-900/10 bg-white p-4"><p className="mb-3 text-sm font-semibold">Executive overview</p><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#f6faf8] p-3"><span className="text-xs text-[#5b6c6c]">Current members</span><strong className="block text-2xl text-[#1b6f6f]">{executive.memberCount}</strong></div><div className="rounded-lg bg-[#f6faf8] p-3"><span className="text-xs text-[#5b6c6c]">Monthly tasks</span><strong className="block text-2xl text-[#1b6f6f]">{executive.taskCount}</strong></div><div className="rounded-lg bg-[#f6faf8] p-3"><span className="text-xs text-[#5b6c6c]">Work Log activity</span><strong className="block text-2xl text-[#1b6f6f]">{executive.workLogCount}</strong></div></div><p className="mt-3 text-sm text-[#5b6c6c]">Top task volume: <strong className="text-[#19373b]">{executive.topTaskDepartment ? `${executive.topTaskDepartment.name} (${executive.topTaskDepartment.taskCount})` : "No department data"}</strong> · Top Work Log activity: <strong className="text-[#19373b]">{executive.topWorkLogDepartment ? `${executive.topWorkLogDepartment.name} (${executive.topWorkLogDepartment.weeklyPlanCount + executive.topWorkLogDepartment.dailyReportCount})` : "No department data"}</strong></p></div><div className="rounded-xl border border-teal-900/10 bg-white p-4"><div className="mb-3 flex flex-wrap gap-3 text-xs font-medium"><span className="text-[#1b6f6f]">■ Members</span><span className="text-[#55cfcc]">■ Tasks</span><span className="text-[#19373b]">■ Work Log</span></div><div className="space-y-4">{comparison.map(row => <div key={row.name}><div className="mb-1 flex justify-between gap-3 text-sm"><strong>{row.name}</strong><span className="text-[#5b6c6c]">{row.members} members · {row.tasks} tasks · {row.workLog} Work Log</span></div><div className="space-y-1"><div className="h-2 rounded-full bg-[#e7efed]"><div className="h-2 rounded-full bg-[#1b6f6f]" style={{ width: `${(row.members / maximum) * 100}%` }} /></div><div className="h-2 rounded-full bg-[#e7efed]"><div className="h-2 rounded-full bg-[#55cfcc]" style={{ width: `${(row.tasks / maximum) * 100}%` }} /></div><div className="h-2 rounded-full bg-[#e7efed]"><div className="h-2 rounded-full bg-[#19373b]" style={{ width: `${(row.workLog / maximum) * 100}%` }} /></div></div></div>)}</div></div><div className="rounded-xl border border-teal-900/10 bg-white p-4"><Label htmlFor="monthly-report-commentary" className="text-[#19373b]">Optional Administrator commentary</Label><Textarea id="monthly-report-commentary" value={commentary} onChange={event => { onCommentaryChange(event.target.value.slice(0, 2000)); setCopied(false); }} maxLength={2000} placeholder="Add context, decisions, or next steps for report readers." className="mt-2 min-h-28 border-teal-900/15 bg-[#fdfefd] text-[#19373b]"/><p className="mt-2 text-right text-xs text-[#5b6c6c]">{commentary.length}/2,000</p></div>{shareLink && <div className="rounded-xl border border-teal-900/10 bg-[#dff1ed] p-4"><p className="text-sm font-semibold text-[#19373b]">Secure Administrator share link</p><p className="mt-1 text-xs text-[#5b6c6c]">This link expires in 30 days and requires an authenticated Administrator; report data is not placed in the URL.</p><div className="mt-3 flex gap-2"><Input aria-label="Secure report share link" readOnly value={shareLink} className="bg-white text-[#19373b]"/><Button type="button" variant="outline" onClick={copyShareLink}><Copy size={16}/>{copied ? "Copied" : "Copy"}</Button></div></div>}</div>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Back to dashboard</Button><Button variant="outline" disabled={!summary || isSharing} onClick={() => onShare(commentary)}>{isSharing ? "Creating secure link…" : "Share Report"}</Button><Button className="bg-[#1b6f6f] text-white hover:bg-[#155859]" disabled={!summary} onClick={() => summary && onDownload({ ...summary, commentary: commentary.trim() || null })}>Download PDF</Button></DialogFooter></DialogContent></Dialog>;
}
