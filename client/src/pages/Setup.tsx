import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// One-time setup screen for creating the very first admin account. The
// backend refuses this once any user already exists, so it's safe to leave
// this route in place permanently.
export default function Setup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const bootstrap = trpc.auth.bootstrapAdmin.useMutation({
    onSuccess: () => {
      window.location.assign("/");
    },
  });

  const canSubmit = name.trim().length >= 2 && email.trim().length > 3 && password.length >= 8;

  return (
    <div className="blueprint-page login-view">
      <div className="blueprint-grid" />
      <Card className="login-card blueprint-card">
        <div className="logo-mark">FFM</div>
        <p className="eyebrow">FIRST-TIME SETUP</p>
        <h1>Create the admin account</h1>
        <p className="muted">This runs once, for a brand-new deployment. Once an admin exists, this page stops working and you'll invite everyone else from inside the app.</p>
        <form
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || bootstrap.isPending) return;
            bootstrap.mutate({ name: name.trim(), email: email.trim(), password });
          }}
        >
          <Input type="text" placeholder="Your full name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input type="email" placeholder="Email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input type="password" placeholder="Choose a password (min. 8 characters)" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button type="submit" className="w-full mt-2 blueprint-button" disabled={!canSubmit || bootstrap.isPending}>
            {bootstrap.isPending ? "Creating account…" : "Create admin account"}
          </Button>
        </form>
        {bootstrap.error && <div className="admin-feedback error">{bootstrap.error.message}</div>}
      </Card>
    </div>
  );
}
