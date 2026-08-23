import { useState } from "react";
import { Link2Off, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export function ReportShareManagement() {
  const [notice, setNotice] = useState("");
  const sharesQuery = trpc.admin.monthlyDepartmentReportShares.useQuery();
  const revokeShare = trpc.admin.revokeMonthlyDepartmentReportShare.useMutation({ onSuccess: () => { setNotice("Report link revoked immediately."); sharesQuery.refetch(); }, onError: error => setNotice(error.message) });
  return <Card className="blueprint-card mb-6"><CardHeader><div><CardTitle>Shared monthly report links</CardTitle><p className="muted">Administrators can revoke a secure report link immediately. Tokens and report contents are never displayed here.</p></div></CardHeader><CardContent>{notice && <div className={revokeShare.error ? "admin-feedback error mb-3" : "admin-feedback success mb-3"}>{notice}</div>}{sharesQuery.isLoading ? <div className="admin-feedback">Loading report links…</div> : sharesQuery.error ? <div className="admin-feedback error">{sharesQuery.error.message}</div> : sharesQuery.data?.length ? <div className="space-y-3">{sharesQuery.data.map(share => <div key={share.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-cyan-400/20 bg-slate-950/20 p-3"><div><div className="flex items-center gap-2"><strong>{share.month}</strong><Badge variant="outline" className={share.active ? "border-emerald-400/40 text-emerald-300" : "border-slate-500 text-slate-400"}>{share.active ? "Active" : "Expired"}</Badge></div><p className="muted mt-1 text-xs">Created by {share.createdByName} · expires {new Date(share.expiresAt).toLocaleString()}</p></div>{share.active ? <Button variant="outline" size="sm" disabled={revokeShare.isPending} onClick={() => revokeShare.mutate({ id: share.id })}><Link2Off size={15}/>{revokeShare.isPending ? "Revoking…" : "Revoke access"}</Button> : <span className="muted text-xs inline-flex items-center gap-1"><ShieldCheck size={14}/>Inactive</span>}</div>)}</div> : <div className="admin-feedback">No shared monthly report links have been created.</div>}</CardContent></Card>;
}
