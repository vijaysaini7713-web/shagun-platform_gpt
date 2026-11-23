import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, Copy, Gift, IndianRupee, Mail, Sparkles, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { buildUpiUri } from "@/lib/upi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DemoBanner, LangSwitch, Logo } from "@/components/app/SiteHeader";
import { getPublicWedding, submitGuest } from "@/lib/guest.functions";
import { compressImage } from "@/lib/image";
import { useI18n } from "@/lib/i18n";
import { guestName, indianPhone } from "@/lib/validation";

export const Route = createFileRoute("/w/$slug")({
  loader: async ({ params }) => {
    const w = await getPublicWedding({ data: { slug: params.slug } });
    if (!w) throw notFound();
    return w;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.groom_name} & ${loaderData.bride_name} — Bless the couple` : "Wedding — ShagunSetu";
    return {
      meta: [
        { title },
        { name: "description", content: "Declare your gift or shagun for the couple in a few taps." },
        { property: "og:title", content: title },
        { property: "og:description", content: "Declare your gift or shagun for the couple in a few taps." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => <div className="p-10 text-center">Wedding not found.</div>,
  component: GuestFlow,
});

const relations = ["Family", "Mama / Uncle", "Chacha / Uncle", "Bua / Mausi", "Cousin", "Friend", "Colleague", "Neighbour", "Other"];
const outcomes = ["success", "pending", "failed"] as const;

function PhotoPick({ value, onChange, label }: { value: string | undefined; onChange: (v?: string) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-muted p-3 text-sm">
      {value ? <img src={value} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <Camera className="h-6 w-6 text-primary" />}
      <span>{value ? "Change photo" : label}</span>
      <input
        type="file" accept="image/*" capture="environment" className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onChange(await compressImage(f));
        }}
      />
    </label>
  );
}

function GuestFlow() {
  const w = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [side, setSide] = useState<"bride" | "groom" | null>(null);
  const [relation, setRelation] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"side" | "relation" | "name" | "phone", string>>>({});
  const [pick, setPick] = useState({ physical: false, envelope: false, digital: false, upi: false });
  const [uAmt, setUAmt] = useState("1100");
  const [utr, setUtr] = useState("");
  const [uProof, setUProof] = useState<string>();
  const [pDesc, setPDesc] = useState("");
  const [pPhoto, setPPhoto] = useState<string>();
  const [ePhoto, setEPhoto] = useState<string>();
  const [eAmt, setEAmt] = useState("");
  const [dAmt, setDAmt] = useState("1100");
  const [dOut, setDOut] = useState<(typeof outcomes)[number]>("success");
  const [busy, setBusy] = useState(false);

  function validateDetails() {
    const e: Partial<Record<"side" | "relation" | "name" | "phone", string>> = {};
    if (!side) e.side = "Choose a side";
    if (!relation) e.relation = "Choose a relation";
    const n = guestName.safeParse(name); if (!n.success) e.name = n.error.issues[0]!.message;
    const p = indianPhone.safeParse(phone); if (!p.success) e.phone = p.error.issues[0]!.message;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!pick.physical && !pick.envelope && !pick.digital && !pick.upi) { toast.error("Choose at least one"); return; }
    const digitalAmount = Number(dAmt);
    const upiAmount = Number(uAmt);
    if (pick.upi && (!Number.isInteger(upiAmount) || upiAmount < 1)) { toast.error("Enter a valid UPI amount"); return; }
    if (utr && !/^[A-Za-z0-9]{6,30}$/.test(utr)) { toast.error("UTR should be 6–30 letters/digits"); return; }
    if (pick.digital && (!Number.isInteger(digitalAmount) || digitalAmount < 1)) { toast.error("Enter a valid amount"); return; }
    setBusy(true);
    try {
      const envAmount = eAmt ? Number(eAmt) : undefined;
      const r = await submitGuest({
        data: {
          slug, side: side!, relation, name, phone,
          ...(pick.physical ? { physical: { description: pDesc || undefined, photo: pPhoto } } : {}),
          ...(pick.envelope ? { envelope: { amount: envAmount, photo: ePhoto } } : {}),
          ...(pick.upi && recipient ? { upi: { amount: upiAmount, ...(utr ? { utr } : {}), proof: uProof } } : {}),
          ...(pick.digital ? { digital: { amount: digitalAmount, outcome: dOut } } : {}),
        },
      });
      navigate({ to: "/r/$ref", params: { ref: r.ref } });
    } catch (e) {
      toast.error((e as Error).message.slice(0, 200));
    } finally {
      setBusy(false);
    }
  }

  const recipient = side ? w.recipients[side] : null;
  const upiUri = recipient && Number(uAmt) > 0 ? buildUpiUri({ vpa: recipient.vpa, name: recipient.name, amount: Number(uAmt), note: `Shagun ${w.groom_name} & ${w.bride_name}` }) : null;
  const card = "rounded-3xl border border-border bg-card p-6 shadow-elegant";
  return (
    <div className="min-h-screen mandala-bg">
      {w.is_demo && <DemoBanner />}
      <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-4"><Logo /><LangSwitch /></div>
      <div className="mx-auto max-w-md px-4 pb-16">
        <ol className="mb-5 grid grid-cols-3 gap-2 text-center text-[11px]" aria-label="Progress">{["Welcome", "Details", "Blessing"].map((l, i) => <li key={l} aria-current={i === step ? "step" : undefined}><div className={`h-1.5 rounded-full ${i <= step ? "bg-gold-gradient" : "bg-border"}`} /><span className={`mt-1 block ${i === step ? "font-semibold text-primary" : "text-muted-foreground"}`}>{t("step")} {i + 1} · {l}</span></li>)}</ol>

        {step === 0 && (
          <div className="overflow-hidden rounded-3xl shadow-elegant">
            <div className="bg-royal p-8 text-center text-primary-foreground">
              <p className="text-xs uppercase tracking-[0.25em] text-gold">{t("welcome")}</p>
              <h1 className="mt-3 text-5xl">{w.groom_name} <span className="text-gold">&</span> {w.bride_name}</h1>
              <div className="gold-rule my-5" />
              <p className="text-sm opacity-90">{w.event_date} · {w.venue}</p>
              {w.welcome_message && <p className="mt-4 text-sm italic opacity-90">{w.welcome_message}</p>}
            </div>
            <div className="bg-card p-6"><Button size="xl" variant="gold" className="w-full" onClick={() => setStep(1)}>{t("start")}</Button></div>
          </div>
        )}

        {step === 1 && (
          <div className={card}>
            <h2 className="text-2xl font-semibold text-primary">{t("whichSide")}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["bride", "groom"] as const).map((s) => (
                <button key={s} onClick={() => setSide(s)}
                  aria-pressed={side === s} className={`min-h-20 rounded-2xl border-2 p-4 text-center font-semibold ${side === s ? "border-primary bg-secondary text-primary" : "border-border"}`}>
                  {s === "bride" ? `👰 ${t("brideSide")}` : `🤵 ${t("groomSide")}`}
                </button>
              ))}
            </div>
            {errors.side && <p className="mt-1 text-xs text-destructive">{errors.side}</p>}
            <Label className="mt-5 block">{t("relation")}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {relations.map((r) => (
                <button key={r} onClick={() => setRelation(r)} className={`min-h-10 rounded-full border px-4 text-sm ${relation === r ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{r}</button>
              ))}
            </div>
            {errors.relation && <p className="mt-1 text-xs text-destructive">{errors.relation}</p>}
            <div className="mt-5 space-y-3">
              <div><Label htmlFor="n">{t("yourName")} *</Label><Input id="n" className="h-12 text-base" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />{errors.name && <p className="text-xs text-destructive">{errors.name}</p>}</div>
              <div><Label htmlFor="p">{t("phone")} *</Label><Input id="p" className="h-12 text-base" type="tel" autoComplete="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98XXXXXXXX" />{errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}</div>
            </div>
            <div className="sticky bottom-0 -mx-6 mt-6 flex gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur"><Button variant="outline" size="lg" onClick={() => setStep(0)}>{t("back")}</Button><Button className="flex-1" size="lg" onClick={() => validateDetails() && setStep(2)}>{t("next")}</Button></div>
          </div>
        )}

        {step === 2 && (
          <div className={card}>
            <h2 className="text-2xl font-semibold text-primary">{t("whatGift")}</h2>
            <div className="mt-4 space-y-3">
              <Option on={pick.physical} toggle={() => setPick({ ...pick, physical: !pick.physical })} icon={<Gift />} label={t("physicalGift")}>
                <Input placeholder={t("description")} value={pDesc} onChange={(e) => setPDesc(e.target.value)} maxLength={200} />
                <PhotoPick value={pPhoto} onChange={setPPhoto} label={`${t("photo")} (gift)`} />
              </Option>
              <Option on={pick.envelope} toggle={() => setPick({ ...pick, envelope: !pick.envelope })} icon={<Mail />} label={t("envelope")}>
                <PhotoPick value={ePhoto} onChange={setEPhoto} label={`${t("photo")} (envelope)`} />
                <Input placeholder={t("amountOptional")} inputMode="numeric" value={eAmt} onChange={(e) => setEAmt(e.target.value.replace(/\D/g, ""))} />
              </Option>
              <div className="rounded-2xl border-2 border-gold bg-secondary/40">
                {recipient ? (
                  <Option on={pick.upi} toggle={() => setPick({ ...pick, upi: !pick.upi })} icon={<IndianRupee />} label={t("payViaUpi")}>
                    <p className="text-xs text-muted-foreground">{t("upiExternal")}</p>
                    <div className="flex flex-wrap gap-2">{["501", "1100", "2100", "5100", "11000"].map((a) => <button key={a} onClick={() => setUAmt(a)} className={`min-h-11 rounded-full border px-4 text-sm ${uAmt === a ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>₹{Number(a).toLocaleString("en-IN")}</button>)}</div>
                    <Input className="h-12 text-lg" placeholder={t("amount")} inputMode="numeric" value={uAmt} onChange={(e) => setUAmt(e.target.value.replace(/\D/g, "").slice(0, 7))} />
                    <div className="rounded-xl bg-card p-4 text-center ring-1 ring-border">
                      <p className="text-sm text-muted-foreground">To</p>
                      <p className="font-semibold">{recipient.name}</p>
                      <div className="mt-1 flex items-center justify-center gap-2"><span className="break-all font-mono text-sm">{recipient.vpa}</span><Button size="sm" variant="ghost" aria-label={t("copy")} onClick={() => { navigator.clipboard.writeText(recipient.vpa); toast.success("Copied"); }}><Copy /></Button></div>
                      {upiUri && <div className="mt-3 inline-block rounded-lg bg-card p-2 ring-1 ring-border"><QRCodeSVG value={upiUri} size={176} /></div>}
                      {upiUri && <Button asChild size="xl" variant="royal" className="mt-3 w-full"><a href={upiUri}><Smartphone />{t("openUpiApp")} · ₹{Number(uAmt).toLocaleString("en-IN")}</a></Button>}
                      {recipient.bank && <p className="mt-3 text-xs text-muted-foreground">Bank: {recipient.bank.holder} · {recipient.bank.bank} · IFSC {recipient.bank.ifsc} · A/c ••••{recipient.bank.last4}</p>}
                    </div>
                    <Input className="h-11" placeholder={t("utrOptional")} value={utr} onChange={(e) => setUtr(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 30))} />
                    <PhotoPick value={uProof} onChange={setUProof} label={t("proofOptional")} />
                    <p className="text-xs font-semibold text-primary">Status after submit: {t("status_awaiting_bank_confirmation")}</p>
                  </Option>
                ) : (
                  <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground"><IndianRupee className="h-5 w-5 shrink-0" /><span><b className="text-foreground">{t("payViaUpi")}</b><br />{t("upiNotConfigured")}</span></div>
                )}
              </div>
              {w.is_demo && w.allow_digital && (
                <Option on={pick.digital} toggle={() => setPick({ ...pick, digital: !pick.digital })} icon={<Sparkles />} label={`${t("digital")} — SANDBOX TEST`} badge>
                  <div className="rounded-lg bg-warning p-2 text-xs font-semibold text-warning-foreground">{t("sandboxOnly")}. Simulation for testing only — not a real payment, no gateway is connected.</div>
                  <Input placeholder={t("amount")} inputMode="numeric" value={dAmt} onChange={(e) => setDAmt(e.target.value.replace(/\D/g, ""))} />
                  <Label className="text-xs">{t("simulate")}</Label>
                  <div className="grid grid-cols-3 gap-2">{outcomes.map((o) => <button key={o} onClick={() => setDOut(o)} className={`min-h-11 rounded-lg border p-2 text-xs ${dOut === o ? "border-primary bg-secondary font-semibold" : "border-border"}`}>{t(`status_${o}`)}</button>)}</div>
                </Option>
              )}
            </div>
            <div className="sticky bottom-0 -mx-6 mt-6 flex gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur"><Button variant="outline" size="lg" onClick={() => setStep(1)}>{t("back")}</Button><Button className="flex-1" size="lg" variant="royal" disabled={busy} onClick={submit}>{busy ? "…" : t("submit")}</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}

function Option({ on, toggle, icon, label, children, badge }: { on: boolean; toggle: () => void; icon: React.ReactNode; label: string; children: React.ReactNode; badge?: boolean }) {
  return (
    <div className={`rounded-2xl border-2 ${on ? "border-primary" : "border-border"}`}>
      <button onClick={toggle} className="flex w-full items-center gap-3 p-4 text-left font-semibold [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-primary">
        {icon} <span className="flex-1">{label}</span>
        {badge && <Badge variant="demo">Sandbox</Badge>}
        <span className={`h-5 w-5 rounded-full border-2 ${on ? "border-primary bg-primary" : "border-border"}`} />
      </button>
      {on && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}