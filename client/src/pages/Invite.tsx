import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ShieldAlert } from "lucide-react";

export default function Invite() {
  const { user, loading, isAuthenticated } = useAuth();
  const token = useMemo(() => window.location.pathname.split("/").filter(Boolean)[1] || "", []);
  const preview = trpc.invitations.preview.useQuery({ token }, { enabled: Boolean(token) });
  const accept = trpc.invitations.accept.useMutation();
  if (loading || preview.isLoading) return <div className="blueprint-page"><div className="blueprint-loader">Checking invitation…</div></div>;
  if (!preview.data || preview.error) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><ShieldAlert size={34} color="#ffaaa4"/><h1>Invitation unavailable</h1><p className="muted">This invitation is invalid, expired, or has already been accepted.</p></Card></div>;
  if (!isAuthenticated) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><div className="logo-mark">FFM</div><p className="eyebrow">SECURE INVITATION</p><h1>Join FFM</h1><p className="muted">This invitation is for <strong>{preview.data.email}</strong> as a {preview.data.role}. Sign in with that email to continue.</p><Button className="w-full mt-6 blueprint-button" onClick={() => startLogin(`/invite/${token}`)}>Sign in to accept</Button></Card></div>;
  const emailMatches = user?.email?.toLowerCase() === preview.data.email.toLowerCase();
  return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><div className="logo-mark">FFM</div>{emailMatches ? <><p className="eyebrow">INVITATION READY</p><h1>Join FFM</h1><p className="muted">You are signed in as <strong>{user?.email}</strong>. Accept the invitation to activate the <strong>{preview.data.role}</strong> role.</p><Button className="w-full mt-6 blueprint-button" disabled={accept.isPending} onClick={() => accept.mutate({ token })}>{accept.isPending ? "Activating…" : "Accept invitation"}</Button>{accept.isSuccess && <div className="admin-feedback success"><CheckCircle2 size={16}/> Invitation accepted successfully.</div>}{accept.error && <div className="admin-feedback error">{accept.error.message}</div>}</> : <><p className="eyebrow">EMAIL MISMATCH</p><h1>Use the invited email</h1><p className="muted">This invitation is addressed to <strong>{preview.data.email}</strong>, but you are signed in as <strong>{user?.email}</strong>.</p></>}</Card></div>;
}
