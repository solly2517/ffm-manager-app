import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

export default function Help() {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <div className="blueprint-page"><div className="blueprint-loader">Loading FFM Help…</div></div>;
  if (!isAuthenticated) return <div className="blueprint-page login-view"><Card className="login-card blueprint-card"><p className="eyebrow">FFM / HELP</p><h1>Sign in required</h1><p className="muted">Help and privacy guidance is available to authenticated FFM users.</p><Button className="blueprint-button" onClick={() => startLogin()}>Sign in securely</Button></Card></div>;
  return <div className="blueprint-page help-page"><div className="blueprint-grid"/><main className="help-content"><p className="eyebrow">FFM / OPERATIONS GUIDE</p><h1>Help & Privacy</h1><p className="muted">A concise guide for secure field operations across the Manager and Delegate apps.</p><div className="help-grid"><Card className="blueprint-card"><CardHeader><CardTitle>Getting started</CardTitle></CardHeader><CardContent><p>Managers invite users from Administration. Delegates open assigned tasks, check in with GPS, complete the visit report, and upload evidence before checking out.</p></CardContent></Card><Card className="blueprint-card"><CardHeader><CardTitle>Evidence & privacy</CardTitle></CardHeader><CardContent><p>Photos, audio, signatures, coordinates, and reports are stored as operational records. Upload only evidence necessary for the assigned visit and follow your organization’s consent and retention policies.</p></CardContent></Card><Card className="blueprint-card"><CardHeader><CardTitle>Access support</CardTitle></CardHeader><CardContent><p>All app access requires authentication. Contact the FFM administrator for invitation issues, role changes, or account removal.</p></CardContent></Card></div><Link href="/"><Button className="blueprint-button">Return to FFM Manager</Button></Link></main></div>;
}
