import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LangSwitch } from "./SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export type NavItem = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; group: string };

function Nav({ items, active, onPick }: { items: NavItem[]; active: string; onPick: (k: string) => void }) {
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Wedding sections" className="space-y-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{g}</p>
          <ul className="space-y-0.5">
            {items.filter((i) => i.group === g).map((i) => (
              <li key={i.key}>
                <button
                  onClick={() => onPick(i.key)}
                  aria-current={active === i.key ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${active === i.key ? "bg-gold-gradient font-semibold text-gold-foreground shadow-elegant" : "text-navy-foreground/80 hover:bg-navy-foreground/10"}`}
                >
                  <i.icon className="h-4 w-4 shrink-0" /> <span className="truncate">{i.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ items, active, onPick, title, subtitle, demo, children, actions }: {
  items: NavItem[]; active: string; onPick: (k: string) => void; title: string; subtitle?: string; demo?: boolean; children: ReactNode; actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  const brand = (
    <Link to="/dashboard" className="flex items-center gap-2 px-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient font-display text-lg text-gold-foreground">श</span>
      <span className="font-display text-2xl font-bold text-navy-foreground">{t("appName")}</span>
    </Link>
  );
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 overflow-y-auto bg-navy py-5 lg:flex">
        {brand}
        <div className="flex-1 px-2"><Nav items={items} active={active} onPick={onPick} /></div>
        <div className="px-3"><Button variant="ghost" className="w-full justify-start text-navy-foreground/80 hover:bg-navy-foreground/10" onClick={signOut}><LogOut />{t("signOut")}</Button></div>
      </aside>
      <div className="lg:pl-64">
        {demo && <div className="bg-warning px-4 py-1 text-center text-xs font-semibold text-warning-foreground">{t("demo")} · {t("sandboxOnly")} · Fictional test data</div>}
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 lg:hidden" aria-label="Open menu"><Menu className="!size-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto border-0 bg-navy p-0 py-5">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="space-y-6">{brand}<div className="px-2"><Nav items={items} active={active} onPick={(k) => { onPick(k); setOpen(false); }} /></div>
                  <div className="px-3"><Button variant="ghost" className="w-full justify-start text-navy-foreground/80" onClick={signOut}><LogOut />{t("signOut")}</Button></div></div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0 lg:col-start-1 lg:col-end-3">
              <p className="truncate text-sm text-muted-foreground"><Link to="/dashboard" className="hover:text-primary">{t("dashboard")}</Link> / <span className="text-foreground">{items.find((i) => i.key === active)?.label}</span></p>
            </div>
            <div className="flex shrink-0 items-center gap-2">{demo && <Badge variant="demo" className="hidden sm:inline-flex">{t("demo")}</Badge>}<LangSwitch /></div>
          </div>
        </header>
        <section className="border-b border-border bg-royal px-4 py-6 text-primary-foreground sm:px-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-gold">{subtitle}</p>
              <h1 className="mt-1 truncate text-3xl sm:text-5xl">{title}</h1>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </section>
        <main className="mx-auto max-w-[1200px] px-3 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

/** Table on md+, stacked cards on phones. */
export function DataList<T>({ rows, cols, empty = "Nothing here yet.", primary }: {
  rows: T[]; cols: { label: string; cell: (r: T) => ReactNode }[]; empty?: string; primary?: (r: T) => ReactNode;
}) {
  if (!rows.length) return <EmptyState text={empty} />;
  return (
    <>
      <div className="hidden overflow-hidden card-premium md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>{cols.map((c) => <th key={c.label} className="px-4 py-3 font-semibold">{c.label}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border hover:bg-muted/50">{cols.map((c) => <td key={c.label} className="px-4 py-3 align-middle">{c.cell(r)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((r, i) => (
          <li key={i} className="card-premium p-4">
            {primary && <div className="mb-2 font-semibold">{primary(r)}</div>}
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              {cols.map((c) => <div key={c.label} className="contents"><dt className="text-muted-foreground">{c.label}</dt><dd className="min-w-0 break-words text-right">{c.cell(r)}</dd></div>)}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="card-premium flex flex-col items-center gap-2 p-10 text-center text-muted-foreground"><span className="text-3xl">🪔</span><p>{text}</p></div>;
}
export function LoadingState() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>;
}