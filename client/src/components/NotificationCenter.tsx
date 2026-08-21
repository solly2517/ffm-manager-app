import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck } from "lucide-react";

export function NotificationCenter() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 30_000 });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => utils.notifications.list.invalidate() });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => utils.notifications.list.invalidate() });
  if (!isAuthenticated) return null;
  const notifications = notificationsQuery.data || [];
  const unread = notifications.filter((notification) => !notification.readAt).length;
  return <div className="fixed right-5 top-24 z-50"><Popover><PopoverTrigger asChild><Button variant="outline" size="icon" className="relative border-cyan-300/60 bg-slate-950/90 text-cyan-100 hover:bg-slate-900" aria-label="Open notifications"><Bell size={18}/>{unread ? <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-cyan-400 px-1 text-xs font-bold text-slate-950">{unread > 9 ? "9+" : unread}</span> : null}</Button></PopoverTrigger><PopoverContent align="end" className="w-[360px] border-cyan-400/30 bg-slate-950 p-0 text-slate-100"><div className="flex items-center justify-between border-b border-cyan-400/20 px-4 py-3"><div><p className="text-sm font-semibold">Operational alerts</p><p className="text-xs text-slate-400">{unread ? `${unread} unread alert${unread === 1 ? "" : "s"}` : "All caught up"}</p></div><Button variant="ghost" size="sm" className="text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100" disabled={!unread || markAllRead.isPending} onClick={() => markAllRead.mutate()}><CheckCheck size={15} className="mr-1"/>Mark all read</Button></div><ScrollArea className="max-h-[420px]">{notificationsQuery.isLoading ? <div className="p-4 text-sm text-slate-400">Loading alerts…</div> : notifications.length ? <div className="divide-y divide-cyan-400/10">{notifications.map((notification) => <button key={notification.id} type="button" className={`w-full px-4 py-3 text-left hover:bg-cyan-400/10 ${notification.readAt ? "opacity-65" : "bg-cyan-400/5"}`} onClick={() => { if (!notification.readAt) markRead.mutate({ id: notification.id }); }}><p className="text-sm font-semibold text-slate-100">{notification.title}</p><p className="mt-1 text-xs leading-5 text-slate-300">{notification.body}</p><div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{notification.actorName || "FFM system"}{notification.actorRole ? ` · ${notification.actorRole.replace("_", " ")}` : ""}</span><time>{new Date(notification.createdAt).toLocaleString()}</time></div></button>)}</div> : <div className="p-6 text-center text-sm text-slate-400">No operational alerts yet.</div>}</ScrollArea></PopoverContent></Popover></div>;
}
