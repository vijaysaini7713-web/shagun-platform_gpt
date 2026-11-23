import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/app/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — ShagunSetu" },
      { name: "description", content: "Sign in to manage your wedding gifts and counters." },
      { property: "og:title", content: "Sign in — ShagunSetu" },
      { property: "og:description", content: "Sign in to manage your wedding gifts and counters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        if (!data.session) { toast.success("Check your email to confirm your account."); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) { toast.error(String(r.error.message ?? r.error)); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen mandala-bg">
      <SiteHeader />
      <div className="mx-auto max-w-sm px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <h1 className="text-3xl font-bold text-primary">{mode === "in" ? "Welcome back" : "Create account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">For wedding owners, family admins, finance and counter staff.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button className="w-full" size="lg" disabled={busy}>{mode === "in" ? "Sign in" : "Sign up"}</Button>
          </form>
          <div className="my-4 gold-rule" />
          <Button type="button" variant="outline" className="w-full" size="lg" onClick={google}>Continue with Google</Button>
          <button className="mt-4 w-full text-center text-sm text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}