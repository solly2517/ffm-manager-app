import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Users, Map, ClipboardList, MessageSquare, BarChart3, Globe2, Activity, Plus, LogOut, ShieldCheck, Search, Menu, X, Send, UserPlus, type LucideIcon } from "lucide-react";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "delegates", label: "Delegates", icon: Users },
  { id: "clients", label: "Clients", icon: Globe2 },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "geography", label: "Geography", icon: Map },
  { id: "admin", label: "Administration", icon: ShieldCheck },
];

const delegates = [
  { name: "Amina Hassan", city: "Riyadh", status: "Active", visits: 4, color: "bg-[#1B6FD8]" },
  { name: "Omar Khalid", city: "Jeddah", status: "Active", visits: 2, color: "bg-[#0D9E72]" },
  { name: "Noura Salem", city: "Dammam", status: "Pending", visits: 1, color: "bg-[#E8901A]" },
];

const tasks = [
  { client: "King Faisal Specialist Hospital", delegate: "Amina Hassan", date: "Today · 09:30", status: "In Progress" },
  { client: "Dr. Sulaiman Al Habib Medical Group", delegate: "Omar Khalid", date: "Today · 13:00", status: "Pending" },
  { client: "Saudi German Hospital", delegate: "Amina Hassan", date: "Tomorrow · 10:00", status: "Pending" },
];

const stats: { label: string; value: string; detail: string; icon: LucideIcon; tone: string }[] = [
  { label: "Active Delegates", value: "12", detail: "↑ 8% this month", icon: Users, tone: "blue" },
  { label: "Visits Today", value: "28", detail: "6 in progress", icon: ClipboardList, tone: "teal" },
  { label: "Pending Tasks", value: "07", detail: "Needs attention", icon: Activity, tone: "amber" },
  { label: "Coverage", value: "94%", detail: "Across 6 regions", icon: Globe2, tone: "violet" },
];

function initials(name: string) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2); }

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const visibleDelegates = useMemo(() => delegates.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()) || d.city.toLowerCase().includes(query.toLowerCase())), [query]);
  const isAdmin = user?.role === "admin" || user?.email?.toLowerCase() === "dr.seleam@gmail.com";
  const usersQuery = trpc.admin.users.useQuery(undefined, { enabled: isAdmin && active === "admin" });
  const addUser = trpc.admin.addUser.useMutation({ onSuccess: () => { setNewUserEmail(""); setAdminNotice("User added to the FFM directory."); usersQuery.refetch(); } });
  const createInvitation = trpc.admin.createInvitation.useMutation({ onSuccess: (result) => { setNewUserEmail(""); setInviteUrl(`${window.location.origin}${result.inviteUrl}`); setAdminNotice("Invitation created. Share the secure link with the invited user."); usersQuery.refetch(); } });
  const setRole = trpc.admin.setRole.useMutation({ onSuccess: () => { setAdminNotice("User role updated."); usersQuery.refetch(); } });
  const removeUser = trpc.admin.removeUser.useMutation({ onSuccess: () => { setAdminNotice("User removed from the FFM directory."); usersQuery.refetch(); } });
  const adminError = usersQuery.error?.message || addUser.error?.message || setRole.error?.message || removeUser.error?.message;
  const clientsQuery = trpc.operations.clients.useQuery(undefined, { enabled: isAuthenticated });
  const tasksQuery = trpc.operations.tasks.useQuery(undefined, { enabled: isAuthenticated });
  const liveStats = stats.map((item) => item.label === "Visits Today" ? { ...item, value: tasksQuery.isLoading ? "—" : String(tasksQuery.data?.length ?? 0), detail: tasksQuery.isLoading ? "Syncing database" : "Live task records" } : item.label === "Coverage" ? { ...item, detail: clientsQuery.isLoading ? "Syncing database" : `${clientsQuery.data?.length ?? 0} live client records` } : item);

  if (loading) return <div className="blueprint-page"><div className="blueprint-loader">Loading FFM Manager…</div></div>;
  if (!isAuthenticated) return <div className="blueprint-page login-view"><div className="blueprint-grid" /><Card className="login-card blueprint-card"><div className="logo-mark">FFM</div><p className="eyebrow">FIELD FORCE MANAGEMENT</p><h1>FFM Manager</h1><p className="muted">Secure control panel for delegates, visits, clients, and clinical operations.</p><Button className="w-full mt-6 blueprint-button" onClick={() => startLogin()}>Sign in securely</Button><p className="login-note">Authentication is required for all app access.</p></Card></div>;

  const current = nav.find((item) => item.id === active) ?? nav[0];

  return <div className="manager-shell">
    <aside className={`manager-sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand-lockup"><div className="logo-mark small">FFM</div><div><strong>FFM Manager</strong><span>Control Panel</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <div className="sidebar-rule" />
      <p className="sidebar-kicker">Operations</p>
      <nav>{nav.filter((item) => item.id !== "admin" || isAdmin).map((item) => { const Icon = item.icon; return <button key={item.id} className={`sidebar-link ${active === item.id ? "active" : ""}`} onClick={() => { setActive(item.id); setMobileOpen(false); }}><Icon size={17}/><span>{item.label}</span>{item.id === "messages" && <b>3</b>}</button>; })}</nav>
      <div className="sidebar-user"><div className="avatar">{initials(user?.name || user?.email || "FFM")}</div><div className="user-copy"><strong>{user?.name || "Authenticated user"}</strong><span>{isAdmin ? "Administrator" : user?.email || "Delegate"}</span></div><button className="logout-icon" onClick={() => logout()} title="Sign out"><LogOut size={16}/></button></div>
    </aside>
    {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}
    <main className="manager-main">
      <header className="manager-topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><p className="topbar-kicker">FFM / {current.label.toUpperCase()}</p><h2>{current.label}</h2></div><div className="topbar-actions"><div className="live-indicator"><span /> Live system</div><Button variant="outline" size="sm" onClick={() => logout()}><LogOut size={14}/> Sign out</Button></div></header>
      <section className="manager-content">
        {active === "dashboard" && <>
          <div className="page-intro"><div><p className="eyebrow">Operational overview</p><h1>Good day, {user?.name?.split(" ")[0] || "Manager"}.</h1><p className="muted">A precise view of today’s field activity across the FFM network.</p></div><Button className="blueprint-button" onClick={() => setActive("tasks")}><Plus size={16}/> Create task</Button></div>
          <div className="stat-grid">{liveStats.map(({ label, value, detail, icon: Icon, tone }) => <Card key={label} className="stat-card"><CardContent><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-detail">{detail}</div></CardContent></Card>)}</div>
          <div className="dashboard-grid"><Card className="blueprint-card map-card"><CardHeader><div><CardTitle>Live delegate positions</CardTitle><p className="muted">Real-time field activity · updated every 30 seconds</p></div><Badge className="status-live"><span/> LIVE</Badge></CardHeader><CardContent><div className="map-placeholder"><div className="map-grid"/><div className="map-label label-riyadh">RIYADH <span>03</span></div><div className="map-label label-jeddah">JEDDAH <span>02</span></div><div className="map-label label-dammam">DAMMAM <span>01</span></div>{[["35%","38%"],["58%","53%"],["73%","28%"],["46%","68%"]].map(([left, top], i) => <div key={i} className="map-pin" style={{left, top}}><span/></div>)}</div></CardContent></Card><Card className="blueprint-card"><CardHeader><div><CardTitle>Today's activity</CardTitle><p className="muted">Latest events from your team</p></div><Button variant="ghost" size="sm" onClick={() => setActive("reports")}>View all</Button></CardHeader><CardContent><div className="activity-list">{tasks.map((task, i) => <div className="activity-row" key={task.client}><div className={`activity-dot ${i === 0 ? "teal" : i === 1 ? "blue" : "amber"}`} /><div><strong>{task.client}</strong><span>{task.delegate} · {task.date}</span></div><Badge variant="outline">{task.status}</Badge></div>)}</div></CardContent></Card></div>
        </>}
        {active === "delegates" && <section className="blueprint-card section-card"><div className="section-heading"><div><p className="eyebrow">Team directory</p><h1>Delegates</h1><p className="muted">Manage field representative accounts and activity.</p></div><Button className="blueprint-button"><UserPlus size={16}/> Add delegate</Button></div><div className="toolbar"><div className="search-field"><Search size={16}/><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search delegates or cities…"/></div><Badge variant="outline">{visibleDelegates.length} shown</Badge></div><div className="data-table"><div className="table-row table-head"><span>Delegate</span><span>Location</span><span>Status</span><span>Today</span><span>Action</span></div>{visibleDelegates.map((delegate) => <div className="table-row" key={delegate.name}><span className="person-cell"><span className={`avatar ${delegate.color}`}>{initials(delegate.name)}</span><strong>{delegate.name}</strong></span><span>{delegate.city}</span><span><Badge className={delegate.status === "Active" ? "badge-success" : "badge-warning"}>{delegate.status}</Badge></span><span>{delegate.visits} visits</span><Button variant="ghost" size="sm">Open</Button></div>)}</div></section>}
        {active === "tasks" && <section className="blueprint-card section-card"><div className="section-heading"><div><p className="eyebrow">Field execution</p><h1>Tasks</h1><p className="muted">Assign and track field visits across the network.</p></div><Button className="blueprint-button"><Plus size={16}/> Create task</Button></div><div className="task-stack">{tasks.map((task) => <div className="task-item" key={task.client}><div className="task-status-bar"/><div className="task-copy"><strong>{task.client}</strong><span>{task.delegate} · {task.date}</span></div><Badge className={task.status === "In Progress" ? "badge-success" : "badge-warning"}>{task.status}</Badge><Button variant="ghost" size="sm">Review</Button></div>)}</div></section>}
        {active === "messages" && <section className="blueprint-card section-card"><div className="section-heading"><div><p className="eyebrow">Team communication</p><h1>Messages</h1><p className="muted">Send messages to delegates individually or broadcast to the team.</p></div></div><div className="message-composer"><Label>Message to delegates</Label><Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write an operational update…"/><div className="composer-footer"><span className="muted">Broadcasts are visible to all active delegates.</span><Button className="blueprint-button" onClick={() => setMessage("")}><Send size={15}/> Send message</Button></div></div></section>}
        {active === "admin" && isAdmin && <section className="blueprint-card section-card"><div className="section-heading"><div><p className="eyebrow">Access control</p><h1>Administration</h1><p className="muted">Manage FFM users, roles, and access to both apps.</p></div></div><div className="admin-callout"><ShieldCheck size={18}/><div><strong>Administrator account verified</strong><p>{user?.email || "dr.seleam@gmail.com"} is assigned the admin role automatically on first login.</p></div></div><div className="admin-add-row"><Input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="new.user@example.com" type="email"/><Button className="blueprint-button" disabled={!newUserEmail || createInvitation.isPending} onClick={() => createInvitation.mutate({ email: newUserEmail, role: "delegate" })}><UserPlus size={15}/> {createInvitation.isPending ? "Creating…" : "Create invitation"}</Button></div>{adminError && <div className="admin-feedback error">{adminError}</div>}{adminNotice && <div className="admin-feedback success">{adminNotice}</div>}{inviteUrl && <div className="invite-link-row"><Input value={inviteUrl} readOnly/><Button variant="outline" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>Copy link</Button></div>}{addUser.isPending || setRole.isPending || removeUser.isPending ? <div className="admin-feedback">Saving administrator changes…</div> : null}{usersQuery.isLoading ? <div className="admin-feedback">Loading users…</div> : usersQuery.data?.length === 0 ? <div className="admin-feedback">No users have been added yet.</div> : null}<div className="data-table"><div className="table-row table-head"><span>User</span><span>Role</span><span>Last sign-in</span><span>Status</span><span>Action</span></div>{(usersQuery.data || []).map((managedUser) => { const protectedUser = managedUser.email?.toLowerCase() === "dr.seleam@gmail.com" || managedUser.openId === user?.openId; return <div className="table-row" key={managedUser.id}><span className="person-cell"><span className="avatar">{initials(managedUser.name || managedUser.email || "U")}</span><strong>{managedUser.email || managedUser.name || "Pending user"}</strong></span><span><Badge className={managedUser.role === "admin" ? "badge-admin" : "badge-success"}>{managedUser.role === "admin" ? "Administrator" : "User"}</Badge></span><span>{managedUser.lastSignedIn ? new Date(managedUser.lastSignedIn).toLocaleDateString() : "Not signed in"}</span><span><Badge className="badge-success">Active</Badge></span><span className="admin-actions"><Button variant="ghost" size="sm" disabled={protectedUser || setRole.isPending} onClick={() => { if (window.confirm(`Change ${managedUser.email || "this user"}'s role?`)) setRole.mutate({ id: managedUser.id, role: managedUser.role === "admin" ? "user" : "admin" }); }}>{managedUser.role === "admin" ? "Make user" : "Make admin"}</Button><Button variant="ghost" size="sm" disabled={protectedUser || removeUser.isPending} onClick={() => { if (window.confirm(`Remove ${managedUser.email || "this user"} from FFM?`)) removeUser.mutate({ id: managedUser.id }); }}>{removeUser.isPending ? "Removing…" : "Remove"}</Button></span></div>; })}</div></section>}
        {!["dashboard", "delegates", "tasks", "messages", "admin", "clients", "reports", "geography"].includes(active) && <section className="blueprint-card section-card empty-section"><div className="empty-illustration"><Map size={34}/></div><p className="eyebrow">FFM / {current.label.toUpperCase()}</p><h1>{current.label}</h1><p className="muted">This workspace is ready for your live data and operational records.</p><Button className="blueprint-button" onClick={() => setActive("dashboard")}>Return to dashboard</Button></section>}
      </section>
    </main>
  </div>;
}
