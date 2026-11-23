import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Gift, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DemoBanner, SiteHeader, StatusBadge } from "@/components/app/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useI18n } from "@/lib/i18n";
import { useMyRoles } from "@/lib/useWedding";
import { guestName, indianPhone, inr } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/staff/$weddingId")({
  head: () => ({ meta: [{ title: "Gift counter — ShagunSetu" }, { name: "description", content: "Search, mark received, record envelopes and handovers." }, { property: "og:title", content: "Gift counter — ShagunSetu" }, { property: "og:description", content: "Staff gift counter." }] }),
  component: Staff,
});

function Scanner({ onCode }: { onCode: (c: string) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;
  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null; let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!ref.current) return;
        ref.current.srcObject = stream; await ref.current.play();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const det = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        while (!stop) {
          const r = await det.detect(ref.current).catch(() => []);
          if (r[0]?.rawValue) { onCode(String(r[0].rawValue)); setOn(false); break; }
          await new Promise((x) => setTimeout(x, 300));
        }
      } catch { toast.error("Camera unavailable — type the code instead"); setOn(false); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [on, onCode]);
  if (!supported) return null;
  return on ? (
    <div className="space-y-2"><video ref={ref} className="w-full rounded-xl" muted playsInline /><Button variant="outline" onClick={() => setOn(false)}>Stop</Button></div>
  ) : <Button variant="outline" size="lg" onClick={() => setOn(true)}><Camera />Scan QR</Button>;
}

function Staff() {
  const { weddingId } = Route.useParams();
  const { t } = useI18n();
  const qc = useQueryClient();
  const r = useMyRoles(weddingId);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [counter, setCounter] = useState<string>("");
  const canAct = r.data?.roles.some((x) => x === "wedding_owner" || x === "counter_staff" || x === "bride_admin" || x === "groom_admin");

  const counters = useQuery({ queryKey: ["counters", weddingId], queryFn: async () => (await supabase.from("counters").select("*").eq("wedding_id", weddingId)).data ?? [] });
  const results = useQuery({
    queryKey: ["staff-search", weddingId, q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const s = q.trim().replace(/[%,()]/g, "");
      const { data } = await supabase.from("guests").select("id, name, side, relation, ref_code, phone").eq("wedding_id", weddingId)
        .or(`ref_code.ilike.%${s}%,name.ilike.%${s}%,phone.ilike.%${s}%`).limit(20);
      return data ?? [];
    },
  });
  const gifts = useQuery({
    queryKey: ["staff-gifts", sel],
    enabled: !!sel,
    queryFn: async () => (await supabase.from("gifts").select("*").eq("guest_id", sel!).order("created_at")).data ?? [],
  });
  const guest = results.data?.find((g) => g.id === sel);

  async function log(action: string, detail: string) {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("activity_log").insert({ wedding_id: weddingId, actor: u.user!.id, action, detail });
  }
  async function update(id: string, patch: TablesUpdate<"gifts">, action: string, detail: string) {
    const { data, error } = await supabase.from("gifts").update(patch).eq("id", id).select("id");
    if (error || !data?.length) { toast.error("Not allowed for your role"); return; }
    await log(action, detail);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["staff-gifts", sel] });
  }

  async function onScan(code: string) {
    const ref = code.includes("/r/") ? code.split("/r/")[1]! : code;
    setQ(ref);
    const { data } = await supabase.from("guests").select("id").eq("wedding_id", weddingId).eq("ref_code", ref).maybeSingle();
    if (data) setSel(data.id); else toast.error("No guest with that code at this wedding");
  }

  return (
    <div className="min-h-screen">
      {r.data?.wedding?.is_demo && <DemoBanner />}
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/dashboard" className="text-sm text-muted-foreground">← Dashboard</Link>
        <h1 className="text-4xl text-primary">{t("staffCounter")}</h1>
        {r.data?.wedding && <p className="text-muted-foreground">{r.data.wedding.groom_name} & {r.data.wedding.bride_name}</p>}
        {r.data && !canAct && <p className="mt-2 rounded-lg bg-warning p-3 text-sm text-warning-foreground">Your role can view but not update gifts here.</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Label>Counter</Label>
          <select className="h-10 rounded-md border border-input bg-background px-2" value={counter} onChange={(e) => setCounter(e.target.value)}>
            <option value="">—</option>{counters.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="relative"><Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input className="h-12 pl-10 text-base" placeholder={t("search")} value={q} onChange={(e) => { setQ(e.target.value.toUpperCase().startsWith("SS-") || e.target.value.toUpperCase().startsWith("DEMO-") ? e.target.value.toUpperCase() : e.target.value); setSel(null); }} /></div>
          <Scanner onCode={onScan} />
          {results.data && !sel && (
            <div className="divide-y divide-border">
              {results.data.length === 0 && <p className="py-3 text-sm text-muted-foreground">No match.</p>}
              {results.data.map((g) => (
                <button key={g.id} onClick={() => setSel(g.id)} className="flex w-full items-center justify-between py-3 text-left">
                  <div><p className="font-semibold">{g.name}</p><p className="text-xs text-muted-foreground">{g.ref_code} · {g.side} · {g.relation} · ••••{g.phone.slice(-4)}</p></div>
                  <span className="text-primary">›</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {sel && guest && (
          <div className="mt-4 rounded-2xl border-2 border-primary bg-card p-4">
            <div className="flex items-start justify-between"><div><p className="text-xl font-semibold">{guest.name}</p><p className="font-mono text-sm text-muted-foreground">{guest.ref_code}</p></div><Button size="sm" variant="ghost" onClick={() => setSel(null)}>Close</Button></div>
            <div className="mt-3 space-y-3">
              {gifts.data?.map((g) => <GiftCard key={g.id} g={g} canAct={!!canAct} onReceive={(amount) => update(g.id, { status: "received", received_at: new Date().toISOString(), counter_id: counter || g.counter_id, ...(amount != null ? { amount } : {}) }, "received", `${g.kind} for ${guest.ref_code} marked received${amount ? ` (${inr(amount)})` : ""}`)} onHandover={(to) => update(g.id, { status: "handed_over", handed_to: to, handed_over_at: new Date().toISOString() }, "handover", `${g.kind} for ${guest.ref_code} handed to ${to}`)} />)}
              {gifts.data?.length === 0 && <p className="text-sm text-muted-foreground">No gifts declared.</p>}
            </div>
          </div>
        )}

        {canAct && <WalkIn wid={weddingId} counter={counter} onDone={(ref) => setQ(ref)} log={log} />}
      </main>
    </div>
  );
}

type G = { id: string; kind: string; description: string | null; amount: number | null; status: string; handed_to: string | null };
function GiftCard({ g, canAct, onReceive, onHandover }: { g: G; canAct: boolean; onReceive: (a?: number) => void; onHandover: (to: string) => void }) {
  const { t } = useI18n();
  const [amt, setAmt] = useState(g.amount ? String(g.amount) : "");
  const [to, setTo] = useState("");
  return (
    <div className="rounded-xl bg-muted p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium">{g.kind === "physical" ? <Gift className="h-4 w-4" /> : <Mail className="h-4 w-4" />}{g.description} {g.amount ? `· ${inr(g.amount)}` : ""}</span>
        <StatusBadge s={g.status} />
      </div>
      {canAct && g.status === "declared" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {g.kind === "envelope" && <Input className="h-11 max-w-[10rem]" inputMode="numeric" placeholder="Counted ₹" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} />}
          <Button size="lg" onClick={() => onReceive(amt ? Number(amt) : undefined)}>{t("markReceived")}</Button>
        </div>
      )}
      {canAct && g.status === "received" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Input className="h-11 max-w-[14rem]" placeholder="Handed to (family member)" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button size="lg" variant="gold" disabled={to.trim().length < 2} onClick={() => onHandover(to.trim())}>{t("handover")}</Button>
        </div>
      )}
      {g.handed_to && <p className="mt-2 text-xs text-muted-foreground">→ {g.handed_to}</p>}
    </div>
  );
}

function WalkIn({ wid, counter, onDone, log }: { wid: string; counter: string; onDone: (ref: string) => void; log: (a: string, d: string) => Promise<void> }) {
  const [f, setF] = useState({ name: "", phone: "", side: "bride" as "bride" | "groom", relation: "Guest", kind: "envelope" as "envelope" | "physical", desc: "", amount: "" });
  const [open, setOpen] = useState(false);
  async function save() {
    const n = guestName.safeParse(f.name), p = indianPhone.safeParse(f.phone);
    if (!n.success || !p.success) { toast.error(!n.success ? n.error.issues[0]!.message : p.error!.issues[0]!.message); return; }
    const ref = "SS-W" + Math.random().toString(36).slice(2, 9).toUpperCase();
    const { data: g, error } = await supabase.from("guests").insert({ wedding_id: wid, side: f.side, relation: f.relation, name: f.name, phone: f.phone, ref_code: ref }).select("id").single();
    if (error || !g) { toast.error("Not allowed for your role"); return; }
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("gifts").insert({ wedding_id: wid, guest_id: g.id, side: f.side, kind: f.kind, description: f.desc || (f.kind === "envelope" ? "Envelope" : "Gift"), amount: f.amount ? Number(f.amount) : null, status: "received", received_at: new Date().toISOString(), received_by: u.user!.id, counter_id: counter || null });
    await log("walk_in", `Walk-in ${f.kind} recorded for ${ref}`);
    toast.success(`Recorded · ${ref}`); setOpen(false); onDone(ref);
  }
  return (
    <div className="mt-6 rounded-2xl border border-border bg-secondary p-4">
      {!open ? <Button variant="outline" onClick={() => setOpen(true)}>+ Record walk-in envelope / gift</Button> : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Guest name *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input placeholder="Mobile *" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
          <select className="h-9 rounded-md border border-input bg-background px-2" value={f.side} onChange={(e) => setF({ ...f, side: e.target.value as never })}><option value="bride">Bride side</option><option value="groom">Groom side</option></select>
          <select className="h-9 rounded-md border border-input bg-background px-2" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as never })}><option value="envelope">Envelope</option><option value="physical">Physical gift</option></select>
          <Input placeholder="Description" value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} />
          <Input placeholder="Amount ₹ (optional)" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, "") })} />
          <div className="flex gap-2 sm:col-span-2"><Button onClick={save}>Save as received</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Badge variant="demo" className="ml-auto self-center">Demo</Badge></div>
        </div>
      )}
    </div>
  );
}