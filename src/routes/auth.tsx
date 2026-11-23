import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter, SiteHeader } from "@/components/app/SiteHeader";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
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
        if (!data.session) { toast.success(t("checkEmail")); return; }
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

  const google_svg = (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="!size-[18px]"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
  return (
    <div className="min-h-screen mandala-bg">
      <SiteHeader />
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-10 sm:py-16 md:grid-cols-2">
        <div className="hidden rounded-3xl bg-royal p-8 text-primary-foreground shadow-elegant md:block">
          <p className="text-xs uppercase tracking-[0.25em] text-gold">{t("appName")}</p>
          <h2 className="mt-3 text-5xl leading-tight">{t("tagline")}</h2>
          <div className="gold-rule my-6" />
          <p className="text-sm opacity-85">{t("authHint")}</p>
        </div>
        <div className="card-premium w-full p-6 sm:p-8">
          <h1 className="text-4xl font-bold text-primary">{mode === "in" ? t("welcomeBack") : t("createAccount")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("authHint")}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="email">{t("email")}</Label><Input id="email" className="h-12 text-base" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label htmlFor="pw">{t("password")}</Label><Input id="pw" className="h-12 text-base" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button className="w-full" size="xl" variant="royal" disabled={busy}>{busy ? t("loading") : mode === "in" ? t("signIn") : t("signUp")}</Button>
          </form>
          <div className="my-5 gold-rule" />
          <Button type="button" variant="outline" className="w-full bg-card" size="xl" onClick={google}>{google_svg}{t("google")}</Button>
          <button type="button" className="mt-5 min-h-11 w-full text-center text-sm text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? t("toSignUp") : t("toSignIn")}
          </button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}