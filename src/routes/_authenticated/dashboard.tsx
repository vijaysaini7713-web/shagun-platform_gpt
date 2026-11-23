import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DemoBanner, SiteHeader } from "@/components/app/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { roleLabel, type Role } from "@/lib/useWedding";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ShagunSetu" }, { name: "description", content: "Your weddings and roles." }, { property: "og:title", content: "Dashboard — ShagunSetu" }, { property: "og:description", content: "Your weddings and roles." }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-weddings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: ws } = await supabase.from("weddings").select("id, slug, bride_name, groom_name, event_date, is_demo").order("created_at");
      const { data: ms } = await supabase.from("wedding_members").select("wedding_id, role").eq("user_id", u.user!.id);
      return (ws ?? []).map((w) => ({ ...w, roles: (ms ?? []).filter((m) => m.wedding_id === w.id).map((m) => m.role as Role) }));
    },
  });
  const [f, setF] = useState({ bride: "", groom: "", slug: "", date: "", venue: "" });

  async function joinDemo(role: Role) {
    const { data: wid, error } = await supabase.rpc("join_demo_wedding", { _role: role });
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries();
    if (role === "counter_staff") navigate({ to: "/staff/$weddingId", params: { weddingId: wid as string } });
    else navigate({ to: "/app/$weddingId", params: { weddingId: wid as string }, search: { tab: "overview" } });
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { data: wid, error } = await supabase.rpc("create_wedding", { _bride: f.bride, _groom: f.groom, _slug: f.slug, _date: f.date || null as never, _venue: f.venue });
    if (error) { toast.error(error.message.includes("duplicate") ? "That link is taken" : error.message); return; }
    toast.success("Wedding created");
    navigate({ to: "/app/$weddingId", params: { weddingId: wid as string }, search: { tab: "overview" } });
  }

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <section className="rounded-3xl bg-royal p-6 text-primary-foreground shadow-elegant md:p-8">
          <Badge variant="demo">Demo mode</Badge>
          <h1 className="mt-3 text-3xl md:text-4xl">Try Aarav & Ananya's wedding as…</h1>
          <p className="mt-1 text-sm opacity-80">Pick a role. Switching only changes your access to the fictional demo wedding.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(Object.keys(roleLabel) as Role[]).map((r) => (
              <Button key={r} variant="gold" onClick={() => joinDemo(r)}>{roleLabel[r]}</Button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary">Your weddings</h2>
          {isLoading ? <p className="mt-3 text-muted-foreground">Loading…</p> : data?.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((w) => (
                <div key={w.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-2xl text-primary">{w.groom_name} & {w.bride_name}</h3>
                    {w.is_demo && <Badge variant="demo">Demo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{w.event_date ?? "Date TBD"} · /w/{w.slug}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{w.roles.map((r) => <Badge key={r} variant="secondary">{roleLabel[r]}</Badge>)}</div>
                  <div className="mt-4 flex gap-2">
                    <Button asChild size="sm"><Link to="/app/$weddingId" params={{ weddingId: w.id }} search={{ tab: "overview" }}>Admin</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to="/staff/$weddingId" params={{ weddingId: w.id }}>Gift counter</Link></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="mt-3 text-muted-foreground">No weddings yet — pick a demo role above or create one below.</p>}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold text-primary">Create a wedding</h2>
          <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><Label>Bride name</Label><Input required value={f.bride} onChange={(e) => setF({ ...f, bride: e.target.value })} /></div>
            <div><Label>Groom name</Label><Input required value={f.groom} onChange={(e) => setF({ ...f, groom: e.target.value })} /></div>
            <div><Label>Guest link (lowercase, dashes)</Label><Input required pattern="[a-z0-9-]{3,40}" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="riya-weds-kabir" /></div>
            <div><Label>Date</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Venue</Label><Input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></div>
            <Button className="sm:col-span-2" size="lg">Create wedding</Button>
          </form>
        </section>
      </main>
    </div>
  );
}