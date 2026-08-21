import { useState } from "react";
import { AlertTriangle, CheckCircle2, FolderOpen, HardDriveUpload, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL } from "@/lib/backupAccess";
import { trpc } from "@/lib/trpc";

export function BackupExportGuide() {
  const [open, setOpen] = useState(false);
  const openExternal = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const utils = trpc.useUtils();
  const status = trpc.backup.status.useQuery(undefined, { retry: false });
  const createBackup = trpc.backup.create.useMutation({ onSuccess: (result) => { if (!result.connected) { window.location.assign(result.authorizeUrl); return; } void utils.backup.status.invalidate(); } });
  const completedArchives = status.data?.archives?.filter((archive) => archive.status === "completed") ?? [];
  const latest = completedArchives[0];
  const [selectedArchiveId, setSelectedArchiveId] = useState<number | undefined>();
  const activeArchiveId = selectedArchiveId ?? latest?.id;
  const restorePreview = trpc.backup.previewRestore.useQuery({ archiveId: activeArchiveId ?? 0 }, { enabled: Boolean(activeArchiveId), retry: false });
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const restore = trpc.backup.restore.useMutation({ onSuccess: () => { setRestoreConfirmation(""); void utils.backup.status.invalidate(); } });

  return <>
    <Button className="blueprint-button" onClick={() => setOpen(true)}><HardDriveUpload size={16}/> Backup FFM data</Button>
    <Button variant="outline" onClick={() => openExternal(GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL)}><FolderOpen size={16}/> Open FFM Backups folder</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl border-blue-400/40 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="text-cyan-300" size={22}/> FFM backup to Google Drive</DialogTitle>
          <DialogDescription className="text-slate-300">Create an FFM operational snapshot in Google Drive or safely restore a completed FFM archive.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex gap-3 rounded-md border border-emerald-400/30 bg-emerald-950/25 p-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={18}/><div><strong>Destination ready</strong><p className="mt-1 text-slate-300">Google Drive: <strong>dr.seleam@gmail.com</strong> → folder: <strong>FFM Backups</strong>.</p></div></div>
          <div className="flex gap-3 rounded-md border border-blue-400/30 bg-blue-950/25 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/30 font-semibold">1</span><p>{status.data?.connected ? "Your Google Drive connection is active." : "Connect Google Drive once using the secure Google approval screen."}</p></div>
          <div className="flex gap-3 rounded-md border border-blue-400/30 bg-blue-950/25 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/30 font-semibold">2</span><p>Click <strong>Create FFM backup now</strong>. FFM will generate the data snapshot and upload it directly to <strong>FFM Backups</strong>.</p></div>
          <div className="flex gap-3 rounded-md border border-blue-400/30 bg-blue-950/25 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/30 font-semibold">3</span><p>{latest?.status === "completed" ? `Latest completed archive: ${latest.fileName}` : "After completion, open the FFM Backups folder to confirm the archive is present."}</p></div>
          {completedArchives.length > 0 && <div className="space-y-3 rounded-md border border-amber-400/40 bg-amber-950/25 p-4"><div className="flex gap-2 text-amber-200"><AlertTriangle size={18}/><strong>Administrator restore</strong></div><p className="text-slate-300">Restore replaces FFM operational database records with the selected snapshot. FFM automatically creates a fresh pre-restore rollback archive first. Original uploaded evidence files, app code, secrets, and settings are not restored by this operational snapshot.</p><select className="h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 text-sm" value={activeArchiveId ?? ""} onChange={(event) => { setSelectedArchiveId(Number(event.target.value)); setRestoreConfirmation(""); }}>{completedArchives.map((archive) => <option key={archive.id} value={archive.id}>{archive.fileName}</option>)}</select>{restorePreview.data && <div className="rounded border border-amber-300/25 bg-slate-950/40 p-3 text-xs text-slate-300">Snapshot date: {new Date(restorePreview.data.generatedAt).toLocaleString()} · Records: {Object.values(restorePreview.data.recordCounts).reduce((sum, count) => sum + Number(count), 0)} · Evidence files included: {restorePreview.data.originalBinaryFilesIncluded ? "Yes" : "No"}</div>}<Input value={restoreConfirmation} onChange={(event) => setRestoreConfirmation(event.target.value)} placeholder={restorePreview.data ? `Type ${restorePreview.data.confirmationPhrase} to restore` : "Loading restore preview…"} /><Button variant="destructive" disabled={!restorePreview.data || restoreConfirmation.trim() !== restorePreview.data.confirmationPhrase || restore.isPending} onClick={() => activeArchiveId && restore.mutate({ archiveId: activeArchiveId, confirmation: restoreConfirmation })}><RotateCcw size={16}/>{restore.isPending ? "Restoring…" : "Restore selected FFM backup"}</Button></div>}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => openExternal(GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL)}><FolderOpen size={16}/> View destination</Button>
          <Button className="blueprint-button" disabled={createBackup.isPending || status.isLoading} onClick={() => createBackup.mutate()}><HardDriveUpload size={16}/>{createBackup.isPending ? "Creating backup…" : status.data?.connected ? "Create FFM backup now" : "Connect Google Drive & continue"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
