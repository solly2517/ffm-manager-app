import { useState } from "react";
import { CheckCircle2, ExternalLink, FolderOpen, HardDriveUpload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL, OFFICIAL_FFM_BACKUP_URL } from "@/lib/backupAccess";

export function BackupExportGuide() {
  const [open, setOpen] = useState(false);
  const openExternal = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  return <>
    <Button className="blueprint-button" onClick={() => setOpen(true)}><HardDriveUpload size={16}/> Start backup</Button>
    <Button variant="outline" onClick={() => openExternal(GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL)}><FolderOpen size={16}/> Open FFM Backups folder</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl border-blue-400/40 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="text-cyan-300" size={22}/> FFM backup to Google Drive</DialogTitle>
          <DialogDescription className="text-slate-300">FFM has prepared the destination. The final export uses the official secure service because it includes your live website database, stored files, and configuration.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex gap-3 rounded-md border border-emerald-400/30 bg-emerald-950/25 p-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={18}/><div><strong>Destination ready</strong><p className="mt-1 text-slate-300">Google Drive: <strong>dr.seleam@gmail.com</strong> → folder: <strong>FFM Backups</strong>.</p></div></div>
          <div className="flex gap-3 rounded-md border border-blue-400/30 bg-blue-950/25 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/30 font-semibold">1</span><p>Choose <strong>Website tasks</strong> and <strong>All time</strong> in the secure export page.</p></div>
          <div className="flex gap-3 rounded-md border border-blue-400/30 bg-blue-950/25 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/30 font-semibold">2</span><p>Select Google Drive under <strong>dr.seleam@gmail.com</strong>. If folder selection is offered, choose <strong>FFM Backups</strong>.</p></div>
          <div className="flex gap-3 rounded-md border border-blue-400/30 bg-blue-950/25 p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/30 font-semibold">3</span><p>After the export completes, open the FFM Backups folder and confirm the archive is present.</p></div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => openExternal(GOOGLE_DRIVE_FFM_BACKUPS_FOLDER_URL)}><FolderOpen size={16}/> View destination</Button>
          <Button className="blueprint-button" onClick={() => openExternal(OFFICIAL_FFM_BACKUP_URL)}><ExternalLink size={16}/> Continue to secure export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
