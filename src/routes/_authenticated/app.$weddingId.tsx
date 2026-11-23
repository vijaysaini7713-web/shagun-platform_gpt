import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DemoBanner, SiteHeader, StatusBadge } from "@/components/app/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { roleLabel, useMyRoles, type Role } from "@/lib/useWedding";
import { inr } from "@/lib/validation";

const tabs = ["overview", "guests", "gifts", "envelopes", "payments", "transactions", "reports", "counters", "team", "settings", "qr"] as const;
type Tab = (typeof tabs)[number];
const ownerOnly: Tab[] = ["counters", "team", "settings"];
const moneyTabs: Tab[] = ["payments", "transactions"];

export const Route = createFileRoute("/_authenticated/app/$weddingId")({
  validateSearch: z.object({ tab: z.enum(tabs).default("overview") }),
  head: () => ({ meta: [{ title: "Wedding admin — ShagunSetu" }, { name: "description", content: "Guests, gifts, envelopes and sandbox payments." }, { property: "og:title", content: "Wedding admin — ShagunSetu" }, { property: "og:description", content: "Guests, gifts, envelopes and sandbox payments." }] }),
  component: AdminPage,
});

function useData(wid: string) {
  return useQuery({
    queryKey: ["wdata", wid],
    queryFn: async () => {
      const [g, gf, p, l, c, m] = await Promise.all([
        supabase.from("guests").select("*").eq("wedding_id", wid).order("created_at", { ascending: false }),
        supabase.from("gifts").select("*").eq("wedding_id", wid).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("wedding_id", wid).order("created_at", { ascending: false }),
        supabase.from("activity_log").select("*").eq("wedding_id", wid).order("created_at", { ascending: false }).limit(200),
        supabase.from("counters").select("*").eq("wedding_id", wid).order("created_at"),
        supabase.from("wedding_members").select("*").eq("wedding_id", wid),
      ]);
      return { guests: g.data ?? [], gifts: gf.data ?? [], payments: p.data ?? [], log: l.data ?? [], counters: c.data ?? [], members: m.data ?? [] };
    },
  });
}

function AdminPage() {
  const { weddingId } = Route.useParams();
  const { tab } = Route.useSearch();
  const { t } = useI18n();
  const r = useMyRoles(weddingId);
  const d = useData(weddingId);
  if (r.isLoading || d.isLoading) return <Shell><p className="p-10 text-muted-foreground">Loading…</p></Shell>;
  if (!r.data?.wedding) return <Shell><p className="p-10">You don't have access to this wedding.</p></Shell>;
  const w = r.data.wedding;
  const roles = r.data.roles;
  const isOwner = roles.includes("wedding_owner");
  const canMoney = isOwner || roles.some((x) => ["finance", "bride_admin", "groom_admin"].includes(x));
  const visible = tabs.filter((x) => (ownerOnly.includes(x) ? isOwner : moneyTabs.includes(x) ? canMoney : true));
  const data = d.data!;
  const guestById = new Map(data.guests.map((g) => [g.id, g]));

  return (
    <Shell demo={w.is_demo}>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link to="/dashboard" className="text-sm text-muted-foreground">← Dashboard</Link>
            <h1 className="text-4xl text-primary">{w.groom_name} & {w.bride_name} {w.is_demo && <Badge variant="demo" className="align-middle">Demo</Badge>}</h1>
            <div className="mt-1 flex flex-wrap gap-1">{roles.map((x) => <Badge key={x} variant="secondary">{roleLabel[x]}</Badge>)}</div>
          </div>
          <Button asChild variant="gold"><Link to="/staff/$weddingId" params={{ weddingId }}>{t("staffCounter")}</Link></Button>
        </div>
        <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-border pb-px">
          {visible.map((x) => (
            <Link key={x} to="/app/$weddingId" params={{ weddingId }} search={{ tab: x }}
              className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm ${tab === x ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}>
              {t(x === "overview" ? "overview" : (x as TKey))}
            </Link>
          ))}
        </nav>
        <div className="py-6">
          {tab === "overview" && <Overview data={data} canMoney={canMoney} demo={w.is_demo} />}
          {tab === "guests" && <Table head={["Ref", "Name", "Side", "Relation", "Phone", "Date"]} rows={data.guests.map((g) => [g.ref_code, g.name, g.side, g.relation, g.phone, new Date(g.created_at).toLocaleString()])} />}
          {tab === "gifts" && <GiftTable gifts={data.gifts.filter((x) => x.kind === "physical")} guestById={guestById} />}
          {tab === "envelopes" && <GiftTable gifts={data.gifts.filter((x) => x.kind === "envelope")} guestById={guestById} />}
          {tab === "payments" && canMoney && (
            <>
              <p className="mb-3 rounded-lg bg-warning p-3 text-sm font-semibold text-warning-foreground">DEMO · SANDBOX ONLY · These are simulated records, not real payments.</p>
              <Table head={["Sandbox ref", "Guest", "Amount", "Routed to", "Status"]} rows={data.payments.map((p) => [p.sandbox_ref, guestById.get(p.guest_id)?.name ?? "—", inr(p.amount), p.routed_to, <StatusBadge key="s" s={p.status} />])} />
            </>
          )}
          {tab === "transactions" && <Table head={["When", "Action", "Detail"]} rows={data.log.map((l) => [new Date(l.created_at).toLocaleString(), l.action, l.detail ?? ""])} />}
          {tab === "reports" && <Reports data={data} guestById={guestById} canMoney={canMoney} />}
          {tab === "counters" && isOwner && <Counters wid={weddingId} counters={data.counters} />}
          {tab === "team" && isOwner && <Team wid={weddingId} members={data.members} demo={w.is_demo} />}
          {tab === "settings" && isOwner && <Settings w={w} />}
          {tab === "qr" && <QR slug={w.slug} />}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, demo = true }: { children: React.ReactNode; demo?: boolean }) {
  return <div className="min-h-screen">{demo && <DemoBanner />}<SiteHeader />{children}</div>;
}

type D = NonNullable<ReturnType<typeof useData>["data"]>;

function Stat({ label, value, demo }: { label: string; value: string | number; demo?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p>{demo && <Badge variant="demo">Demo</Badge>}</div>
      <p className="mt-2 font-display text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}

function Overview({ data, canMoney, demo }: { data: D; canMoney: boolean; demo: boolean }) {
  const phys = data.gifts.filter((g) => g.kind === "physical");
  const env = data.gifts.filter((g) => g.kind === "envelope");
  const envTotal = env.reduce((s, g) => s + Number(g.amount ?? 0), 0);
  const paid = data.payments.filter((p) => p.status === "success").reduce((s, p) => s + Number(p.amount), 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Guests" value={data.guests.length} />
        <Stat label="Physical gifts" value={`${phys.filter((g) => g.status !== "declared").length}/${phys.length} received`} />
        <Stat label="Envelopes (declared amount)" value={inr(envTotal)} demo={demo} />
        {canMoney && <Stat label="Sandbox shagun (success)" value={inr(paid)} demo />}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(["bride", "groom"] as const).map((s) => (
          <div key={s} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xl text-primary">{s === "bride" ? "Bride's side" : "Groom's side"}</h3>
            <p className="text-sm text-muted-foreground">{data.guests.filter((g) => g.side === s).length} guests · {data.gifts.filter((g) => g.side === s).length} gifts/envelopes{canMoney ? ` · ${inr(data.payments.filter((p) => p.side === s && p.status === "success").reduce((a, p) => a + Number(p.amount), 0))} sandbox` : ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <p className="text-muted-foreground">Nothing here yet.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="px-3 py-2 align-middle">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function GiftTable({ gifts, guestById }: { gifts: D["gifts"]; guestById: Map<string, D["guests"][number]> }) {
  async function view(path: string) {
    const { data, error } = await supabase.storage.from("gift-photos").createSignedUrl(path, 120);
    if (error || !data) { toast.error("Photo unavailable"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }
  return <Table head={["Guest", "Ref", "Side", "Item", "Amount", "Status", "Handed to", "Photo"]} rows={gifts.map((g) => {
    const gu = guestById.get(g.guest_id);
    return [gu?.name ?? "—", gu?.ref_code ?? "—", g.side, g.description ?? "", inr(g.amount), <StatusBadge key="s" s={g.status} />, g.handed_to ?? "—", g.photo_path ? <Button key="p" size="sm" variant="outline" onClick={() => view(g.photo_path!)}>View</Button> : "—"];
  })} />;
}

function Reports({ data, guestById, canMoney }: { data: D; guestById: Map<string, D["guests"][number]>; canMoney: boolean }) {
  function csv() {
    const rows = [["guest", "ref", "side", "kind", "item", "amount", "status", "handed_to"], ...data.gifts.map((g) => { const gu = guestById.get(g.guest_id); return [gu?.name, gu?.ref_code, g.side, g.kind, g.description, g.amount ?? "", g.status, g.handed_to ?? ""]; })];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "shagunsetu-gifts-demo.csv"; a.click();
  }
  const byStatus = (k: string) => data.gifts.filter((g) => g.status === k).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Declared (pending at counter)" value={byStatus("declared")} />
        <Stat label="Received" value={byStatus("received")} />
        <Stat label="Handed over to family" value={byStatus("handed_over")} />
      </div>
      {canMoney && <div className="grid gap-4 sm:grid-cols-3">{(["success", "pending", "failed"] as const).map((s) => <Stat key={s} label={`Sandbox ${s}`} value={inr(data.payments.filter((p) => p.status === s).reduce((a, p) => a + Number(p.amount), 0))} demo />)}</div>}
      <Button onClick={csv} variant="outline">Download gifts CSV</Button>
    </div>
  );
}

function Counters({ wid, counters }: { wid: string; counters: D["counters"] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [side, setSide] = useState<"bride" | "groom" | "both">("both");
  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("counters").insert({ wedding_id: wid, name: name.trim(), side });
    if (error) { toast.error(error.message); return; }
    setName(""); qc.invalidateQueries({ queryKey: ["wdata", wid] });
  }
  async function del(id: string) { await supabase.from("counters").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["wdata", wid] }); }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Counter name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="rounded-md border border-input bg-background px-2" value={side} onChange={(e) => setSide(e.target.value as never)}><option value="both">Both</option><option value="bride">Bride</option><option value="groom">Groom</option></select>
        <Button onClick={add}>Add counter</Button>
      </div>
      <Table head={["Name", "Side", ""]} rows={counters.map((c) => [c.name, c.side, <Button key="d" size="sm" variant="ghost" onClick={() => del(c.id)}>Remove</Button>])} />
    </div>
  );
}

function Team({ wid, members, demo }: { wid: string; members: D["members"]; demo: boolean }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("counter_staff");
  async function add() {
    const { error } = await supabase.rpc("add_member_by_email", { _w: wid, _email: email, _role: role });
    if (error) { toast.error(error.message); return; }
    toast.success("Added"); setEmail(""); qc.invalidateQueries({ queryKey: ["wdata", wid] });
  }
  async function del(id: string) { await supabase.from("wedding_members").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["wdata", wid] }); }
  return (
    <div className="space-y-4">
      {demo && <p className="text-sm text-muted-foreground">Demo wedding: anyone signed in can join with a role from the dashboard.</p>}
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" type="email" placeholder="team member email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="rounded-md border border-input bg-background px-2" value={role} onChange={(e) => setRole(e.target.value as Role)}>{(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select>
        <Button onClick={add}>Add</Button>
      </div>
      <Table head={["Email", "Role", ""]} rows={members.map((m) => [m.email ?? m.user_id.slice(0, 8), roleLabel[m.role as Role], <Button key="d" size="sm" variant="ghost" onClick={() => del(m.id)}>Remove</Button>])} />
    </div>
  );
}

function Settings({ w }: { w: NonNullable<NonNullable<ReturnType<typeof useMyRoles>["data"]>["wedding"]> }) {
  const qc = useQueryClient();
  const [s, setS] = useState({ bride_name: w.bride_name, groom_name: w.groom_name, venue: w.venue ?? "", event_date: w.event_date ?? "", welcome_message: w.welcome_message ?? "", payment_routing: w.payment_routing, bride_receiver_label: w.bride_receiver_label, groom_receiver_label: w.groom_receiver_label, allow_digital: w.allow_digital });
  async function save() {
    const { error } = await supabase.from("weddings").update({ ...s, event_date: s.event_date || null }).eq("id", w.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); qc.invalidateQueries();
  }
  const f = (k: keyof typeof s, label: string) => <div><Label>{label}</Label><Input value={String(s[k])} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>;
  return (
    <div className="grid max-w-2xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">{f("bride_name", "Bride name")}{f("groom_name", "Groom name")}{f("venue", "Venue")}<div><Label>Date</Label><Input type="date" value={s.event_date} onChange={(e) => setS({ ...s, event_date: e.target.value })} /></div></div>
      {f("welcome_message", "Welcome message")}
      <div className="rounded-2xl border border-border bg-secondary p-4">
        <div className="flex items-center justify-between"><h3 className="text-xl text-primary">Payment receiving routing</h3><Badge variant="demo">Demo mode</Badge></div>
        <p className="mb-3 text-xs text-muted-foreground">Labels only. No real UPI ID or bank account is used until merchant verification is complete.</p>
        <div className="flex flex-wrap gap-2">{(["by_side", "bride_only", "groom_only"] as const).map((r) => <button key={r} onClick={() => setS({ ...s, payment_routing: r })} className={`rounded-full border px-3 py-1 text-sm ${s.payment_routing === r ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{r === "by_side" ? "By guest's side" : r === "bride_only" ? "All to bride family" : "All to groom family"}</button>)}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{f("bride_receiver_label", "Bride receiver label")}{f("groom_receiver_label", "Groom receiver label")}</div>
        <label className="mt-3 flex items-center gap-2 text-sm"><Switch checked={s.allow_digital} onCheckedChange={(v) => setS({ ...s, allow_digital: v })} /> Allow sandbox digital shagun</label>
      </div>
      <Button onClick={save} size="lg">Save settings</Button>
    </div>
  );
}

function QR({ slug }: { slug: string }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/w/${slug}` : `/w/${slug}`;
  return (
    <div className="mx-auto max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-elegant">
      <h3 className="text-2xl text-primary">Scan to bless the couple</h3>
      <div className="my-4 inline-block rounded-xl p-3 ring-1 ring-border"><QRCodeSVG value={url} size={220} className="text-primary" fgColor="currentColor" /></div>
      <p className="break-all text-xs text-muted-foreground">{url}</p>
      <div className="mt-4 flex justify-center gap-2"><Button variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}>Copy link</Button><Button onClick={() => window.print()}>Print</Button></div>
    </div>
  );
}