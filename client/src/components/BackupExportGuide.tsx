import { useState } from "react";
import { CheckCircle2, FolderOpen, HardDriveUpload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL } from "@/lib/backupAccess";
import { trpc } from "@/lib/trpc";

export function BackupExportGuide() {
  const [open, setOpen] = useState(false);
  const openExternal = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const utils = trpc.useUtils();
  const status = trpc.backup.status.useQuery(undefined, { retry: false });
  const createBackup = trpc.backup.create.useMutation({ onSuccess: (result) => { if (!result.connected) { window.location.assign(result.authorizeUrl); return; } void utils.backup.status.invalidate(); } });
  const latest = status.data?.archives?.[0];

  return <>
    <Button className="blueprint-button" onClick={() => setOpen(true)}><HardDriveUpload size={16}/> Backup FFM data</Button>
    <Button variant="destructive" onClick={() => setOpen(true)}>Restore FFM backup</Button>
    <Button variant="outline" onClick={() => openExternal(GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL)}><FolderOpen size={16}/> Open FFM Backups folder</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl border-blue-400/40 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="text-cyan-300" size={22}/> FFM backup to Google Drive</DialogTitle>
          <DialogDescription className="text-slate-300">This creates an FFM operational data snapshot and evidence manifest directly in your approved Google Drive folder.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex gap-3 rounded-md border border-emerald-400/30 bg-emerald-950/25 p-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={18}/><div><strong>Destination ready</strong><p className="mt-1 text-slate-300">Google Drive: <strong>dr.seleam@gmail.com</strong> → folder: <strong>FFM Backups</strong>.</p></div></div>
          <div className="flex gap-3 rounded-md border border-blue-400/30 bg-blue-950/25 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/30 font-semibold">1</span><p>{status.data?.connected ? "Your Google Drive connection is active." : "Connect Google Drive once using the secure Google approval screen."}</p></div>
          <div className="flex gap-3 rounded-md border border-blue-400/30 bg-blue-950/25 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/30 font-semibold">2</span><p>Click <strong>Create FFM backup now</strong>. FFM will generate the data snapshot and upload it directly to <strong>FFM Backups</strong>.</p></div>
          <div className="flex gap-3 rounded-md border border-blue-400/30 bg-blue-950/25 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/30 font-semibold">3</span><p>{latest?.status === "completed" ? `Latest completed archive: ${latest.fileName}` : "After completion, open the FFM Backups folder to confirm the archive is present."}</p></div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => openExternal(GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL)}><FolderOpen size={16}/> View destination</Button>
          <Button className="blueprint-button" disabled={createBackup.isPending || status.isLoading} onClick={() => createBackup.mutate()}><HardDriveUpload size={16}/>{createBackup.isPending ? "Creating backup…" : status.data?.connected ? "Create FFM backup now" : "Connect Google Drive & continue"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
