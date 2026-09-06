import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function getReturnTo(): string {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("returnTo");
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function Login() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const returnTo = useMemo(getReturnTo, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await refresh();
      window.location.assign(returnTo);
    },
  });

  if (!loading && isAuthenticated) {
    window.location.replace(returnTo);
    return null;
  }

  const canSubmit = email.trim().length > 3 && password.length > 0;

  return (
    <div className="blueprint-page login-view">
      <div className="blueprint-grid" />
      <Card className="login-card blueprint-card">
        <div className="logo-mark">FFM</div>
        <p className="eyebrow">FIELD FORCE MANAGEMENT</p>
        <h1>Sign in</h1>
        <form
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || login.isPending) return;
            login.mutate({ email: email.trim(), password });
          }}
        >
          <Input type="email" placeholder="Email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button type="submit" className="w-full mt-2 blueprint-button" disabled={!canSubmit || login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        {login.error && <div className="admin-feedback error">{login.error.message}</div>}
        <p className="login-note">Don't have an account? Ask your administrator for an invitation link.</p>
      </Card>
    </div>
  );
}
