import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex overflow-hidden rounded-full border border-border text-xs" role="group" aria-label="Language">
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1 ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}

export function Logo() {
  const { t } = useI18n();
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-royal font-display text-lg text-gold">श</span>
      <span className="font-display text-2xl font-bold text-primary">{t("appName")}</span>
    </Link>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <Logo />
          <Badge variant="demo" className="hidden sm:inline-flex">{t("demo")}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <LangSwitch />
          {email ? (
            <>
              <Button asChild size="sm" variant="outline"><Link to="/dashboard">{t("dashboard")}</Link></Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth", replace: true });
                }}
              >
                {t("signOut")}
              </Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">{t("signIn")}</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function DemoBanner() {
  const { t } = useI18n();
  return (
    <div className="bg-warning px-4 py-1.5 text-center text-xs font-semibold text-warning-foreground">
      {t("demo")} · {t("sandboxOnly")} · Fictional test data
    </div>
  );
}

export function StatusBadge({ s }: { s: string }) {
  const { t } = useI18n();
  const v = s === "handed_over" || s === "success" ? "success" : s === "received" ? "gold" : s === "failed" ? "destructive" : "secondary";
  return <Badge variant={v as never}>{t(`status_${s}` as never)}</Badge>;
}