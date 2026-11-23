import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarHeart, Crown, Landmark, LayoutDashboard, Store, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DemoBanner, SiteFooter, SiteHeader } from "@/components/app/SiteHeader";
import { EmptyState, LoadingState } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { roleLabel, type Role } from "@/lib/useWedding";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ShagunSetu" }, { name: "description", content: "Your weddings and roles." }, { property: "og:title", content: "Dashboard — ShagunSetu" }, { property: "og:description", content: "Your weddings and roles." }] }),
  component: Dashboard,
});

const roleIcon: Record<Role, typeof Crown> = { wedding_owner: Crown, bride_admin: UserRound, groom_admin: UserRound, finance: Landmark, counter_staff: Store };
const roleHint: Record<Role, { en: string; hi: string }> = {
  wedding_owner: { en: "Everything, incl. settings & team", hi: "सब कुछ, सेटिंग्स और टीम सहित" },
  bride_admin: { en: "Bride side guests & gifts", hi: "वधू पक्ष के मेहमान और उपहार" },
  groom_admin: { en: "Groom side guests & gifts", hi: "वर पक्ष के मेहमान और उपहार" },
  finance: { en: "Money, UPI checks, receiving", hi: "राशि, यूपीआई जाँच, प्राप्ति" },
  counter_staff: { en: "Gift counter on phone/tablet", hi: "फ़ोन/टैबलेट पर गिफ्ट काउंटर" },
};

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, lang } = useI18n();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-weddings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: ws, error } = await supabase.from("weddings").select("id, slug, bride_name, groom_name, event_date, venue, is_demo").order("created_at");
      if (error) throw error;
      const { data: ms } = await supabase.from("wedding_members").select("wedding_id, role").eq("user_id", u.user!.id);
      return (ws ?? []).map((w) => ({ ...w, roles: (ms ?? []).filter((m) => m.wedding_id === w.id).map((m) => m.role as Role) }));
    },
  });
  const [f, setF] = useState({ bride: "", groom: "", slug: "", date: "", venue: "" });
  const [busy, setBusy] = useState<string | null>(null);

  async function joinDemo(role: Role) {
    setBusy(role);
    const { data: wid, error } = await supabase.rpc("join_demo_wedding", { _role: role });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries();
    if (role === "counter_staff") navigate({ to: "/staff/$weddingId", params: { weddingId: wid as string } });
    else navigate({ to: "/app/$weddingId", params: { weddingId: wid as string }, search: { tab: "overview" } });
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    const { data: wid, error } = await supabase.rpc("create_wedding", { _bride: f.bride, _groom: f.groom, _slug: f.slug, _date: f.date || null as never, _venue: f.venue });
    setBusy(null);
    if (error) { toast.error(error.message.includes("duplicate") ? "That link is taken" : error.message); return; }
    toast.success("Wedding created");
    navigate({ to: "/app/$weddingId", params: { weddingId: wid as string }, search: { tab: "overview" } });
  }

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:py-10">
        <section className="overflow-hidden rounded-3xl bg-royal p-5 text-primary-foreground shadow-elegant sm:p-8">
          <Badge variant="demo">{t("demo")}</Badge>
          <h1 className="mt-3 text-3xl sm:text-4xl">{t("tryAs")}</h1>
          <p className="mt-1 text-sm opacity-85">{t("tryAsHint")}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(roleLabel) as Role[]).map((r) => {
              const I = roleIcon[r];
              return (
                <button key={r} disabled={!!busy} onClick={() => joinDemo(r)}
                  className="flex min-h-16 items-center gap-3 rounded-2xl bg-navy-foreground/10 p-4 text-left ring-1 ring-gold/40 transition hover:bg-navy-foreground/20 disabled:opacity-60 lg:flex-col lg:items-start">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-gradient text-gold-foreground"><I className="h-5 w-5" /></span>
                  <span className="min-w-0"><span className="block font-semibold">{busy === r ? t("loading") : roleLabel[r]}</span><span className="block text-xs opacity-80">{roleHint[r][lang]}</span></span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-3xl text-primary">{t("yourWeddings")}</h2>
          <div className="mt-4">
            {isLoading ? <LoadingState /> : isError ? <EmptyState text="Couldn't load weddings. Please refresh." /> : data?.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.map((w) => (
                  <article key={w.id} className="card-premium flex flex-col overflow-hidden">
                    <div className="bg-royal px-5 py-4 text-primary-foreground">
                      <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 truncate text-2xl">{w.groom_name} & {w.bride_name}</h3>{w.is_demo && <Badge variant="demo">{t("demo")}</Badge>}</div>
                      <p className="mt-1 flex items-center gap-1 text-xs opacity-85"><CalendarHeart className="h-3.5 w-3.5" />{w.event_date ?? "—"}{w.venue ? ` · ${w.venue}` : ""}</p>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <p className="truncate text-xs text-muted-foreground">/w/{w.slug}</p>
                      <div className="flex flex-wrap gap-1">{w.roles.map((r) => <Badge key={r} variant="secondary">{roleLabel[r]}</Badge>)}</div>
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <Button asChild size="lg"><Link to="/app/$weddingId" params={{ weddingId: w.id }} search={{ tab: "overview" }}><LayoutDashboard />{t("admin")}</Link></Button>
                        <Button asChild size="lg" variant="outline"><Link to="/staff/$weddingId" params={{ weddingId: w.id }}><Store />{t("counter")}</Link></Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState text={t("noWeddings")} />}
          </div>
        </section>

        <section className="card-premium p-5 sm:p-8">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary"><Users className="h-5 w-5" /></span><h2 className="text-3xl text-primary">{t("createWedding")}</h2></div>
          <form onSubmit={create} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="cb">{t("brideName")}</Label><Input id="cb" className="h-12" required value={f.bride} onChange={(e) => setF({ ...f, bride: e.target.value })} /></div>
            <div><Label htmlFor="cg">{t("groomName")}</Label><Input id="cg" className="h-12" required value={f.groom} onChange={(e) => setF({ ...f, groom: e.target.value })} /></div>
            <div><Label htmlFor="cs">{t("guestLink")}</Label><Input id="cs" className="h-12" required pattern="[a-z0-9-]{3,40}" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="riya-weds-kabir" /><p className="mt-1 text-xs text-muted-foreground">a–z, 0–9, -</p></div>
            <div><Label htmlFor="cd">{t("date")}</Label><Input id="cd" className="h-12" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label htmlFor="cv">{t("venue")}</Label><Input id="cv" className="h-12" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></div>
            <Button className="sm:col-span-2 sm:w-fit" size="xl" variant="royal" disabled={busy === "create"}>{t("createWedding")}</Button>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}