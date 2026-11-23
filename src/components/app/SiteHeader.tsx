import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
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
          className={`min-h-9 px-3 ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
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
    <Link to="/" className="flex min-w-0 items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-royal font-display text-lg text-gold">श</span>
      <span className="truncate font-display text-xl font-bold text-primary sm:text-2xl">{t("appName")}</span>
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
  const [open, setOpen] = useState(false);
  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/auth", replace: true });
  }
  const links = email ? (
    <>
      <Button asChild size="lg" variant="outline" className="sm:h-9 sm:px-4"><Link to="/dashboard" onClick={() => setOpen(false)}>{t("dashboard")}</Link></Button>
      <Button size="lg" variant="ghost" className="sm:h-9 sm:px-4" onClick={signOut}>{t("signOut")}</Button>
    </>
  ) : (
    <Button asChild size="lg" className="sm:h-9 sm:px-4"><Link to="/auth" onClick={() => setOpen(false)}>{t("signIn")}</Link></Button>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Logo />
          <Badge variant="demo" className="hidden sm:inline-flex">{t("demo")}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LangSwitch />
          <div className="hidden items-center gap-2 sm:flex">{links}</div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 sm:hidden" aria-label={t("menu")}><Menu className="!size-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-navy text-navy-foreground">
              <SheetTitle className="font-display text-2xl text-gold">{t("appName")}</SheetTitle>
              <div className="mt-6 flex flex-col gap-3">
                <Button asChild size="lg" variant="ghost" className="justify-start"><Link to="/" onClick={() => setOpen(false)}>{t("home")}</Link></Button>
                <Button asChild size="lg" variant="ghost" className="justify-start"><Link to="/w/$slug" params={{ slug: "demo-wedding" }} onClick={() => setOpen(false)}>{t("tryGuest")}</Link></Button>
                {links}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 bg-navy px-4 py-10 text-center text-navy-foreground">
      <p className="font-display text-2xl text-gold">{t("appName")}</p>
      <p className="mt-1 text-sm opacity-80">{t("tagline")}</p>
      <div className="gold-rule mx-auto my-5 max-w-xs" />
      <p className="text-xs opacity-70">{t("footer")}</p>
    </footer>
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
  const v = s === "handed_over" || s === "success" || s === "verified" ? "success" : s === "received" ? "gold" : s === "failed" || s === "rejected" ? "destructive" : s === "awaiting_bank_confirmation" ? "demo" : "secondary";
  return <Badge variant={v as never}>{t(`status_${s}` as never)}</Badge>;
}