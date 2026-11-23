import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, Banknote, CheckCheck, Gift, Landmark, LayoutDashboard, Mail, QrCode, Settings as Cog, Store, Users, UserCog, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/app/SiteHeader";
import { AppShell, DataList, EmptyState, LoadingState, type NavItem } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { roleLabel, useMyRoles, type Role } from "@/lib/useWedding";
import { inr } from "@/lib/validation";
import { maskAccount, isVpa } from "@/lib/upi";
import { savePaymentAccount, setReceivingMode } from "@/lib/payments.functions";

const tabs = ["overview", "guests", "gifts", "envelopes", "upi", "payments", "receiving", "transactions", "reports", "counters", "team", "settings", "qr"] as const;
type Tab = (typeof tabs)[number];

export const Route = createFileRoute("/_authenticated/app/$weddingId")({
  validateSearch: z.object({ tab: z.enum(tabs).default("overview") }),
  head: () => ({ meta: [{ title: "Wedding admin — ShagunSetu" }, { name: "description", content: "Guests, gifts, envelopes, UPI and reports." }, { property: "og:title", content: "Wedding admin — ShagunSetu" }, { property: "og:description", content: "Guests, gifts, envelopes, UPI and reports." }] }),
  component: AdminPage,
});

function useData(wid: string, money: boolean) {
  return useQuery({
    queryKey: ["wdata", wid, money],
    queryFn: async () => {
      const [g, gf, p, l, c, m, u, a] = await Promise.all([
        supabase.from("guests").select("*").eq("wedding_id", wid).order("created_at", { ascending: false }),
        supabase.from("gifts").select("*").eq("wedding_id", wid).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("wedding_id", wid).order("created_at", { ascending: false }),
        supabase.from("activity_log").select("*").eq("wedding_id", wid).order("created_at", { ascending: false }).limit(200),
        supabase.from("counters").select("*").eq("wedding_id", wid).order("created_at"),
        supabase.from("wedding_members").select("*").eq("wedding_id", wid),
        supabase.from("upi_payments").select("*").eq("wedding_id", wid).order("created_at", { ascending: false }),
        supabase.from("payment_accounts").select("id, side, enabled, beneficiary_name, upi_vpa, bank_holder, bank_account_last4, ifsc, bank_name, notes, show_bank_to_guests, updated_at").eq("wedding_id", wid),
      ]);
      return { guests: g.data ?? [], gifts: gf.data ?? [], payments: p.data ?? [], log: l.data ?? [], counters: c.data ?? [], members: m.data ?? [], upi: u.data ?? [], accounts: a.data ?? [] };
    },
  });
}
type D = NonNullable<ReturnType<typeof useData>["data"]>;
type W = NonNullable<NonNullable<ReturnType<typeof useMyRoles>["data"]>["wedding"]>;

function AdminPage() {
  const { weddingId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const r = useMyRoles(weddingId);
  const roles = r.data?.roles ?? [];
  const isOwner = roles.includes("wedding_owner");
  const isFinance = isOwner || roles.includes("finance");
  const canMoney = isFinance || roles.some((x) => x === "bride_admin" || x === "groom_admin");
  const d = useData(weddingId, canMoney);

  const all: (NavItem & { show: boolean })[] = [
    { key: "overview", label: t("overview"), icon: LayoutDashboard, group: t("overview"), show: true },
    { key: "guests", label: t("guests"), icon: Users, group: t("manage"), show: true },
    { key: "gifts", label: t("gifts"), icon: Gift, group: t("manage"), show: true },
    { key: "envelopes", label: t("envelopes"), icon: Mail, group: t("manage"), show: true },
    { key: "upi", label: t("upiRecon"), icon: CheckCheck, group: t("money"), show: canMoney },
    { key: "payments", label: `${t("payments")} (sandbox)`, icon: Wallet, group: t("money"), show: canMoney },
    { key: "receiving", label: t("receiving"), icon: Landmark, group: t("money"), show: isFinance },
    { key: "transactions", label: t("transactions"), icon: Activity, group: t("money"), show: canMoney },
    { key: "reports", label: t("reports"), icon: BarChart3, group: t("money"), show: true },
    { key: "counters", label: t("counters"), icon: Store, group: t("setup"), show: isOwner },
    { key: "team", label: t("team"), icon: UserCog, group: t("setup"), show: isOwner },
    { key: "settings", label: t("settings"), icon: Cog, group: t("setup"), show: isOwner },
    { key: "qr", label: t("qr"), icon: QrCode, group: t("setup"), show: true },
  ];
  const items = all.filter((i) => i.show);
  const pick = (k: string) => navigate({ to: "/app/$weddingId", params: { weddingId }, search: { tab: k as Tab } });

  if (r.isLoading) return <div className="p-6"><LoadingState /></div>;
  if (!r.data?.wedding) return <div className="mx-auto max-w-md p-10"><EmptyState text="You don't have access to this wedding." /><Button asChild className="mt-4 w-full"><Link to="/dashboard">{t("dashboard")}</Link></Button></div>;
  const w = r.data.wedding;
  const current = items.some((i) => i.key === tab) ? tab : "overview";

  return (
    <AppShell
      items={items} active={current} onPick={pick} demo={w.is_demo}
      title={`${w.groom_name} & ${w.bride_name}`}
      subtitle={[w.event_date, w.venue].filter(Boolean).join(" · ") || "Wedding"}
      actions={<>
        {roles.map((x) => <Badge key={x} variant="gold">{roleLabel[x]}</Badge>)}
        <Button asChild variant="gold" size="sm"><Link to="/staff/$weddingId" params={{ weddingId }}><Store />{t("staffCounter")}</Link></Button>
      </>}
    >
      {d.isLoading || !d.data ? <LoadingState /> : d.isError ? <EmptyState text="Couldn't load data. Please refresh." /> : (
        <Body tab={current} w={w} data={d.data} canMoney={canMoney} isFinance={isFinance} isOwner={isOwner} />
      )}
    </AppShell>
  );
}

function Body({ tab, w, data, canMoney, isFinance, isOwner }: { tab: Tab; w: W; data: D; canMoney: boolean; isFinance: boolean; isOwner: boolean }) {
  const gb = new Map(data.guests.map((g) => [g.id, g]));
  switch (tab) {
    case "overview": return <Overview data={data} canMoney={canMoney} demo={w.is_demo} />;
    case "guests": return <DataList rows={data.guests} primary={(g) => g.name} cols={[
      { label: "Ref", cell: (g) => <span className="font-mono text-xs">{g.ref_code}</span> },
      { label: "Name", cell: (g) => g.name }, { label: "Side", cell: (g) => <SideBadge s={g.side} /> },
      { label: "Relation", cell: (g) => g.relation }, { label: "Phone", cell: (g) => g.phone },
      { label: "Added", cell: (g) => new Date(g.created_at).toLocaleDateString() }]} empty="No guests yet. Share the QR code to get started." />;
    case "gifts": return <GiftList gifts={data.gifts.filter((x) => x.kind === "physical")} gb={gb} />;
    case "envelopes": return <GiftList gifts={data.gifts.filter((x) => x.kind === "envelope")} gb={gb} />;
    case "upi": return <UpiRecon rows={data.upi} gb={gb} canVerify={isFinance} />;
    case "payments": return <>
      <Notice>SANDBOX · Simulated test records only. No money moved. Not counted in verified totals.</Notice>
      <DataList rows={data.payments} primary={(p) => gb.get(p.guest_id)?.name} cols={[
        { label: "Sandbox ref", cell: (p) => <span className="font-mono text-xs">{p.sandbox_ref}</span> },
        { label: "Guest", cell: (p) => gb.get(p.guest_id)?.name ?? "—" }, { label: "Amount", cell: (p) => inr(p.amount) },
        { label: "Routed to", cell: (p) => p.routed_to }, { label: "Status", cell: (p) => <StatusBadge s={p.status} /> }]} />
    </>;
    case "receiving": return <Receiving w={w} accounts={data.accounts} />;
    case "transactions": return <DataList rows={data.log} primary={(l) => l.action} cols={[
      { label: "When", cell: (l) => new Date(l.created_at).toLocaleString() }, { label: "Action", cell: (l) => <Badge variant="secondary">{l.action}</Badge> }, { label: "Detail", cell: (l) => l.detail ?? "" }]} />;
    case "reports": return <Reports data={data} gb={gb} canMoney={canMoney} />;
    case "counters": return isOwner ? <Counters wid={w.id} counters={data.counters} /> : null;
    case "team": return isOwner ? <Team wid={w.id} members={data.members} demo={w.is_demo} /> : null;
    case "settings": return isOwner ? <Settings w={w} /> : null;
    case "qr": return <QR slug={w.slug} names={`${w.groom_name} & ${w.bride_name}`} />;
  }
}

const Notice = ({ children }: { children: React.ReactNode }) => <p className="mb-4 rounded-xl border border-warning bg-warning/30 p-3 text-sm font-medium text-warning-foreground">{children}</p>;
const SideBadge = ({ s }: { s: string }) => <Badge variant={s === "bride" ? "secondary" : "outline"}>{s === "bride" ? "Bride" : "Groom"}</Badge>;

function Kpi({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "demo" | "gold" }) {
  return (
    <div className="card-premium p-5">
      <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{label}</p>{tone && <Badge variant={tone}>{tone === "demo" ? "Sandbox" : "Verified"}</Badge>}</div>
      <p className="mt-2 font-display text-3xl font-bold text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Overview({ data, canMoney, demo }: { data: D; canMoney: boolean; demo: boolean }) {
  const phys = data.gifts.filter((g) => g.kind === "physical");
  const env = data.gifts.filter((g) => g.kind === "envelope");
  const verified = data.upi.filter((u) => u.status === "verified").reduce((s, u) => s + Number(u.amount), 0);
  const awaiting = data.upi.filter((u) => u.status === "awaiting_bank_confirmation");
  const chart = (["bride", "groom"] as const).map((s) => ({
    side: s === "bride" ? "Bride" : "Groom",
    Guests: data.guests.filter((g) => g.side === s).length,
    Gifts: data.gifts.filter((g) => g.side === s && g.kind === "physical").length,
    Envelopes: data.gifts.filter((g) => g.side === s && g.kind === "envelope").length,
  }));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Guests" value={data.guests.length} hint={`${chart[0]!.Guests} bride · ${chart[1]!.Guests} groom`} />
        <Kpi label="Physical gifts received" value={`${phys.filter((g) => g.status !== "declared").length}/${phys.length}`} hint={`${phys.filter((g) => g.status === "handed_over").length} handed to family`} />
        <Kpi label="Envelopes logged" value={env.length} hint={`${inr(env.reduce((s, g) => s + Number(g.amount ?? 0), 0))} counted/declared`} />
        {canMoney ? <Kpi label="UPI verified" value={inr(verified)} tone="gold" hint={`${awaiting.length} awaiting bank confirmation (${inr(awaiting.reduce((s, u) => s + Number(u.amount), 0))}) — not counted`} /> : <Kpi label="Gifts pending at counter" value={data.gifts.filter((g) => g.status === "declared").length} />}
      </div>
      {canMoney && demo && <p className="text-xs text-muted-foreground">Sandbox simulated total (not real money): {inr(data.payments.filter((p) => p.status === "success").reduce((s, p) => s + Number(p.amount), 0))}</p>}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card-premium p-5 lg:col-span-3">
          <h3 className="text-xl text-primary">By side</h3>
          <div className="mt-3 h-64"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="side" stroke="var(--muted-foreground)" /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" /><Tooltip /><Bar dataKey="Guests" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /><Bar dataKey="Gifts" fill="var(--chart-2)" radius={[6, 6, 0, 0]} /><Bar dataKey="Envelopes" fill="var(--chart-3)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="card-premium p-5 lg:col-span-2">
          <h3 className="text-xl text-primary">Recent activity</h3>
          {data.log.length ? <ul className="mt-3 space-y-3">{data.log.slice(0, 7).map((l) => <li key={l.id} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" /><div className="min-w-0"><p className="truncate">{l.detail ?? l.action}</p><p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p></div></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}

function GiftList({ gifts, gb }: { gifts: D["gifts"]; gb: Map<string, D["guests"][number]> }) {
  async function view(path: string) {
    const { data, error } = await supabase.storage.from("gift-photos").createSignedUrl(path, 120);
    if (error || !data) { toast.error("Photo unavailable"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }
  return <DataList rows={gifts} primary={(g) => `${gb.get(g.guest_id)?.name ?? "—"} · ${g.description ?? ""}`} cols={[
    { label: "Guest", cell: (g) => gb.get(g.guest_id)?.name ?? "—" }, { label: "Ref", cell: (g) => <span className="font-mono text-xs">{gb.get(g.guest_id)?.ref_code}</span> },
    { label: "Side", cell: (g) => <SideBadge s={g.side} /> }, { label: "Item", cell: (g) => g.description ?? "" }, { label: "Amount", cell: (g) => inr(g.amount) },
    { label: "Status", cell: (g) => <StatusBadge s={g.status} /> }, { label: "Handed to", cell: (g) => g.handed_to ?? "—" },
    { label: "Photo", cell: (g) => g.photo_path ? <Button size="sm" variant="outline" onClick={() => view(g.photo_path!)}>View</Button> : "—" }]} />;
}

function UpiRecon({ rows, gb, canVerify }: { rows: D["upi"]; gb: Map<string, D["guests"][number]>; canVerify: boolean }) {
  const qc = useQueryClient();
  const [note, setNote] = useState<Record<string, string>>({});
  async function act(id: string, status: string) {
    const { error } = await supabase.rpc("verify_upi_payment", { _id: id, _status: status, _note: note[id] ?? "" });
    if (error) { toast.error(error.message); return; }
    toast.success("Updated"); qc.invalidateQueries();
  }
  async function proof(path: string) {
    const { data } = await supabase.storage.from("gift-photos").createSignedUrl(path, 120);
    if (data) window.open(data.signedUrl, "_blank", "noopener");
  }
  const sum = (s: string) => inr(rows.filter((r) => r.status === s).reduce((a, r) => a + Number(r.amount), 0));
  return (
    <div className="space-y-4">
      <Notice>Direct UPI transfers go straight to the family's bank. ShagunSetu cannot see them. Only mark “Verified” after matching the amount/UTR in your bank statement.</Notice>
      <div className="grid gap-4 sm:grid-cols-3"><Kpi label="Verified" value={sum("verified")} tone="gold" /><Kpi label="Awaiting bank confirmation" value={sum("awaiting_bank_confirmation")} hint="Not counted in totals" /><Kpi label="Rejected" value={sum("rejected")} /></div>
      <DataList rows={rows} empty="No UPI declarations yet." primary={(u) => `${gb.get(u.guest_id)?.name ?? "—"} · ${inr(u.amount)}`} cols={[
        { label: "Guest", cell: (u) => gb.get(u.guest_id)?.name ?? "—" }, { label: "Amount", cell: (u) => inr(u.amount) },
        { label: "To", cell: (u) => <span className="text-xs">{u.payee_name}<br />{u.payee_vpa}</span> }, { label: "UTR", cell: (u) => u.utr ?? "—" },
        { label: "Proof", cell: (u) => u.proof_path ? <Button size="sm" variant="outline" onClick={() => proof(u.proof_path!)}>View</Button> : "—" },
        { label: "Status", cell: (u) => <div><StatusBadge s={u.status} />{u.verified_at && <p className="text-[11px] text-muted-foreground">{new Date(u.verified_at).toLocaleString()}</p>}</div> },
        ...(canVerify ? [{ label: "Reconcile", cell: (u: D["upi"][number]) => (
          <div className="flex min-w-[12rem] flex-col gap-1">
            <Input className="h-9" placeholder="Bank note" value={note[u.id] ?? ""} onChange={(e) => setNote({ ...note, [u.id]: e.target.value })} />
            <div className="flex gap-1">{u.status !== "verified" && <Button size="sm" onClick={() => act(u.id, "verified")}>Verify</Button>}{u.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => act(u.id, "rejected")}>Reject</Button>}{u.status !== "awaiting_bank_confirmation" && <Button size="sm" variant="ghost" onClick={() => act(u.id, "awaiting_bank_confirmation")}>Reset</Button>}</div>
          </div>) }] : [])]} />
    </div>
  );
}

function Receiving({ w, accounts }: { w: W; accounts: D["accounts"] }) {
  const qc = useQueryClient();
  const setMode = useServerFn(setReceivingMode);
  const mode = (w as W & { receiving_mode: string }).receiving_mode as "common" | "by_side";
  const sides = mode === "common" ? (["common"] as const) : (["bride", "groom"] as const);
  return (
    <div className="space-y-6">
      <div className="card-premium p-5">
        <h2 className="text-2xl text-primary">Where should shagun go?</h2>
        <p className="text-sm text-muted-foreground">Only the wedding owner and finance can view or change these details.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {([["common", "One common account", "All guests pay the same account"], ["by_side", "Separate bride & groom accounts", "Guests pay their side's family"]] as const).map(([k, l, h]) => (
            <button key={k} onClick={async () => { try { await setMode({ data: { weddingId: w.id, mode: k } }); qc.invalidateQueries(); } catch (e) { toast.error((e as Error).message); } }}
              className={`min-h-16 rounded-xl border-2 p-4 text-left ${mode === k ? "border-primary bg-secondary" : "border-border"}`}><p className="font-semibold">{l}</p><p className="text-xs text-muted-foreground">{h}</p></button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">{sides.map((s) => <AccountForm key={s} wid={w.id} side={s} a={accounts.find((x) => x.side === s)} />)}</div>
    </div>
  );
}

function AccountForm({ wid, side, a }: { wid: string; side: "common" | "bride" | "groom"; a: D["accounts"][number] | undefined }) {
  const qc = useQueryClient();
  const save = useServerFn(savePaymentAccount);
  const [f, setF] = useState({ enabled: a?.enabled ?? false, beneficiaryName: a?.beneficiary_name ?? "", upiVpa: a?.upi_vpa ?? "", bankHolder: a?.bank_holder ?? "", accountNumber: "", accountNumberConfirm: "", ifsc: a?.ifsc ?? "", bankName: a?.bank_name ?? "", notes: a?.notes ?? "", showBankToGuests: a?.show_bank_to_guests ?? false, clearAccount: false });
  const [busy, setBusy] = useState(false);
  const vpaBad = f.upiVpa !== "" && !isVpa(f.upiVpa);
  const mismatch = f.accountNumber !== "" && f.accountNumber !== f.accountNumberConfirm;
  async function submit() {
    setBusy(true);
    try { await save({ data: { weddingId: wid, side, ...f } }); toast.success("Saved"); setF({ ...f, accountNumber: "", accountNumberConfirm: "", clearAccount: false }); qc.invalidateQueries(); }
    catch (e) { const m = (e as Error).message; toast.error(m.startsWith("[") ? "Please check the highlighted fields" : m.slice(0, 220)); }
    finally { setBusy(false); }
  }
  const field = (k: keyof typeof f, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div><Label htmlFor={`${side}-${k}`}>{label}</Label><Input id={`${side}-${k}`} className="h-11" value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} /></div>
  );
  return (
    <div className="card-premium p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-2xl capitalize text-primary">{side === "common" ? "Common account" : `${side} side`}</h3>
        <label className="flex items-center gap-2 text-sm"><Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} /> Enabled</label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {field("beneficiaryName", "Beneficiary name")}
        <div>{field("upiVpa", "UPI ID (VPA)", { placeholder: "name@bank", autoCapitalize: "none" })}{vpaBad && <p className="text-xs text-destructive">Looks invalid — format name@bank</p>}</div>
      </div>
      <div className="gold-rule my-5" />
      <p className="text-sm font-semibold">Bank transfer (optional)</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {field("bankHolder", "Account holder")}
        <div><Label>Saved account</Label><p className="flex h-11 items-center font-mono text-sm">{maskAccount(a?.bank_account_last4)}</p></div>
        {field("accountNumber", a?.bank_account_last4 ? "New account number" : "Account number", { inputMode: "numeric", autoComplete: "off", type: "password" })}
        <div>{field("accountNumberConfirm", "Confirm account number", { inputMode: "numeric", autoComplete: "off" })}{mismatch && <p className="text-xs text-destructive">Does not match</p>}</div>
        {field("ifsc", "IFSC", { placeholder: "ABCD0123456", autoCapitalize: "characters" })}
        {field("bankName", "Bank name")}
      </div>
      <div className="mt-3"><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={300} /></div>
      <label className="mt-3 flex items-start gap-2 text-sm"><Switch checked={f.showBankToGuests} onCheckedChange={(v) => setF({ ...f, showBankToGuests: v })} /> <span>Show bank name, IFSC and masked account to guests (full number is never shown)</span></label>
      {a?.bank_account_last4 && <label className="mt-2 flex items-center gap-2 text-sm"><Switch checked={f.clearAccount} onCheckedChange={(v) => setF({ ...f, clearAccount: v })} /> Remove saved account number</label>}
      <p className="mt-3 text-xs text-muted-foreground">Account numbers are encrypted on the server; only the last 4 digits are readable here.</p>
      <Button className="mt-4 w-full sm:w-auto" size="lg" disabled={busy || vpaBad || mismatch} onClick={submit}>Save {side} details</Button>
    </div>
  );
}

function Reports({ data, gb, canMoney }: { data: D; gb: Map<string, D["guests"][number]>; canMoney: boolean }) {
  function csv() {
    const rows = [["guest", "ref", "side", "kind", "item", "amount", "status", "handed_to"], ...data.gifts.map((g) => { const gu = gb.get(g.guest_id); return [gu?.name, gu?.ref_code, g.side, g.kind, g.description, g.amount ?? "", g.status, g.handed_to ?? ""]; }),
      ...(canMoney ? data.upi.map((u) => [gb.get(u.guest_id)?.name, gb.get(u.guest_id)?.ref_code, u.side, "upi_direct", u.payee_vpa, u.amount, u.status, ""]) : [])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "shagunsetu-report.csv"; a.click();
  }
  const n = (k: string) => data.gifts.filter((g) => g.status === k).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3"><Kpi label="Declared (at counter)" value={n("declared")} /><Kpi label="Received" value={n("received")} /><Kpi label="Handed to family" value={n("handed_over")} /></div>
      {canMoney && <div className="grid gap-4 sm:grid-cols-2">
        {(["bride", "groom"] as const).map((s) => <Kpi key={s} label={`${s === "bride" ? "Bride" : "Groom"} side · UPI verified`} tone="gold" value={inr(data.upi.filter((u) => u.side === s && u.status === "verified").reduce((a, u) => a + Number(u.amount), 0))} hint={`${inr(data.upi.filter((u) => u.side === s && u.status === "awaiting_bank_confirmation").reduce((a, u) => a + Number(u.amount), 0))} awaiting`} />)}
      </div>}
      <Button onClick={csv} variant="outline" size="lg">Download CSV</Button>
    </div>
  );
}

function Counters({ wid, counters }: { wid: string; counters: D["counters"] }) {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [side, setSide] = useState<"bride" | "groom" | "both">("both");
  async function add() { if (!name.trim()) return; const { error } = await supabase.from("counters").insert({ wedding_id: wid, name: name.trim(), side }); if (error) { toast.error(error.message); return; } setName(""); qc.invalidateQueries(); }
  async function del(id: string) { await supabase.from("counters").delete().eq("id", id); qc.invalidateQueries(); }
  return <div className="space-y-4">
    <div className="card-premium grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><Input className="h-11" placeholder="Counter name" value={name} onChange={(e) => setName(e.target.value)} /><select className="h-11 rounded-md border border-input bg-background px-2" value={side} onChange={(e) => setSide(e.target.value as never)}><option value="both">Both sides</option><option value="bride">Bride</option><option value="groom">Groom</option></select><Button size="lg" onClick={add}>Add counter</Button></div>
    <DataList rows={counters} primary={(c) => c.name} cols={[{ label: "Name", cell: (c) => c.name }, { label: "Side", cell: (c) => c.side }, { label: "", cell: (c) => <Button size="sm" variant="ghost" onClick={() => del(c.id)}>Remove</Button> }]} />
  </div>;
}

function Team({ wid, members, demo }: { wid: string; members: D["members"]; demo: boolean }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(""); const [role, setRole] = useState<Role>("counter_staff");
  async function add() { const { error } = await supabase.rpc("add_member_by_email", { _w: wid, _email: email, _role: role }); if (error) { toast.error(error.message); return; } toast.success("Added"); setEmail(""); qc.invalidateQueries(); }
  async function del(id: string) { await supabase.from("wedding_members").delete().eq("id", id); qc.invalidateQueries(); }
  return <div className="space-y-4">
    {demo && <Notice>Demo wedding: anyone signed in can join with a role from the dashboard.</Notice>}
    <div className="card-premium grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><Input className="h-11" type="email" placeholder="Team member email" value={email} onChange={(e) => setEmail(e.target.value)} /><select className="h-11 rounded-md border border-input bg-background px-2" value={role} onChange={(e) => setRole(e.target.value as Role)}>{(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select><Button size="lg" onClick={add}>Add</Button></div>
    <DataList rows={members} primary={(m) => m.email ?? "Member"} cols={[{ label: "Email", cell: (m) => m.email ?? m.user_id.slice(0, 8) }, { label: "Role", cell: (m) => <Badge variant="secondary">{roleLabel[m.role as Role]}</Badge> }, { label: "", cell: (m) => <Button size="sm" variant="ghost" onClick={() => del(m.id)}>Remove</Button> }]} />
  </div>;
}

function Settings({ w }: { w: W }) {
  const qc = useQueryClient();
  const [s, setS] = useState({ bride_name: w.bride_name, groom_name: w.groom_name, venue: w.venue ?? "", event_date: w.event_date ?? "", welcome_message: w.welcome_message ?? "", allow_digital: w.allow_digital });
  async function save() { const { error } = await supabase.from("weddings").update({ ...s, event_date: s.event_date || null }).eq("id", w.id); if (error) { toast.error(error.message); return; } toast.success("Saved"); qc.invalidateQueries(); }
  const f = (k: "bride_name" | "groom_name" | "venue", label: string) => <div><Label>{label}</Label><Input className="h-11" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>;
  return <div className="card-premium grid max-w-3xl gap-4 p-5">
    <div className="grid gap-4 sm:grid-cols-2">{f("bride_name", "Bride name")}{f("groom_name", "Groom name")}{f("venue", "Venue")}<div><Label>Date</Label><Input className="h-11" type="date" value={s.event_date} onChange={(e) => setS({ ...s, event_date: e.target.value })} /></div></div>
    <div><Label>Welcome message</Label><Textarea value={s.welcome_message} onChange={(e) => setS({ ...s, welcome_message: e.target.value })} /></div>
    {w.is_demo && <label className="flex items-center gap-2 text-sm"><Switch checked={s.allow_digital} onCheckedChange={(v) => setS({ ...s, allow_digital: v })} /> Show SANDBOX simulated payment test (demo weddings only)</label>}
    <p className="text-sm text-muted-foreground">UPI and bank receiving details live under <b>Payment receiving</b>.</p>
    <Button onClick={save} size="lg" className="sm:w-fit">Save settings</Button>
  </div>;
}

function QR({ slug, names }: { slug: string; names: string }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/w/${slug}` : `/w/${slug}`;
  return <div className="mx-auto max-w-sm overflow-hidden card-premium text-center">
    <div className="bg-royal p-5 text-primary-foreground"><p className="text-xs uppercase tracking-widest text-gold">Scan to bless</p><h3 className="text-3xl">{names}</h3></div>
    <div className="p-6"><div className="inline-block rounded-xl bg-card p-3 ring-1 ring-border"><QRCodeSVG value={url} size={220} className="text-primary" fgColor="currentColor" /></div>
      <p className="mt-3 break-all text-xs text-muted-foreground">{url}</p>
      <div className="mt-4 flex justify-center gap-2"><Button variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}>Copy link</Button><Button onClick={() => window.print()}>Print</Button></div></div>
  </div>;
}