import { ClipboardPenLine } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export function WorkLogLauncher() {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading || !isAuthenticated || (user?.role !== "delegate" && user?.role !== "manager") || window.location.pathname === "/work-log") return null;
  return <a href="/work-log" className="fixed right-5 bottom-6 z-40 inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-slate-950 px-4 py-3 text-sm font-semibold text-cyan-200 shadow-lg transition hover:bg-slate-900"><ClipboardPenLine size={18}/> {user.role === "delegate" ? "Weekly plan & daily report" : "Review Delegate work logs"}</a>;
}
