import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, Gift, Mail, Sparkles } from "lucide-react";
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
  const [pick, setPick] = useState({ physical: false, envelope: false, digital: false });
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
    if (!pick.physical && !pick.envelope && !pick.digital) { toast.error("Choose at least one"); return; }
    const digitalAmount = Number(dAmt);
    if (pick.digital && (!Number.isInteger(digitalAmount) || digitalAmount < 1)) { toast.error("Enter a valid amount"); return; }
    setBusy(true);
    try {
      const envAmount = eAmt ? Number(eAmt) : undefined;
      const r = await submitGuest({
        data: {
          slug, side: side!, relation, name, phone,
          ...(pick.physical ? { physical: { description: pDesc || undefined, photo: pPhoto } } : {}),
          ...(pick.envelope ? { envelope: { amount: envAmount, photo: ePhoto } } : {}),
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

  const card = "rounded-3xl border border-border bg-card p-6 shadow-elegant";
  return (
    <div className="min-h-screen mandala-bg">
      {w.is_demo && <DemoBanner />}
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4"><Logo /><LangSwitch /></div>
      <div className="mx-auto max-w-md px-4 pb-16">
        <div className="mb-4 flex gap-1">{[0, 1, 2].map((i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />)}</div>

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
                  className={`rounded-2xl border-2 p-4 text-center font-semibold ${side === s ? "border-primary bg-secondary text-primary" : "border-border"}`}>
                  {s === "bride" ? `👰 ${t("brideSide")}` : `🤵 ${t("groomSide")}`}
                </button>
              ))}
            </div>
            {errors.side && <p className="mt-1 text-xs text-destructive">{errors.side}</p>}
            <Label className="mt-5 block">{t("relation")}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {relations.map((r) => (
                <button key={r} onClick={() => setRelation(r)} className={`rounded-full border px-3 py-1 text-sm ${relation === r ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{r}</button>
              ))}
            </div>
            {errors.relation && <p className="mt-1 text-xs text-destructive">{errors.relation}</p>}
            <div className="mt-5 space-y-3">
              <div><Label htmlFor="n">{t("yourName")} *</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />{errors.name && <p className="text-xs text-destructive">{errors.name}</p>}</div>
              <div><Label htmlFor="p">{t("phone")} *</Label><Input id="p" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98XXXXXXXX" />{errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}</div>
            </div>
            <div className="mt-6 flex gap-3"><Button variant="outline" onClick={() => setStep(0)}>{t("back")}</Button><Button className="flex-1" size="lg" onClick={() => validateDetails() && setStep(2)}>{t("next")}</Button></div>
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
              {w.allow_digital && (
                <Option on={pick.digital} toggle={() => setPick({ ...pick, digital: !pick.digital })} icon={<Sparkles />} label={t("digital")} badge>
                  <div className="rounded-lg bg-warning p-2 text-xs font-semibold text-warning-foreground">{t("sandboxOnly")}. No UPI, no card.</div>
                  <div className="flex flex-wrap gap-2">{["501", "1100", "2100", "5100"].map((a) => <button key={a} onClick={() => setDAmt(a)} className={`rounded-full border px-3 py-1 text-sm ${dAmt === a ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>₹{a}</button>)}</div>
                  <Input placeholder={t("amount")} inputMode="numeric" value={dAmt} onChange={(e) => setDAmt(e.target.value.replace(/\D/g, ""))} />
                  <Label className="text-xs">{t("simulate")}</Label>
                  <div className="grid grid-cols-3 gap-2">{outcomes.map((o) => <button key={o} onClick={() => setDOut(o)} className={`rounded-lg border p-2 text-xs capitalize ${dOut === o ? "border-primary bg-secondary font-semibold" : "border-border"}`}>{t(`status_${o}`)}</button>)}</div>
                </Option>
              )}
            </div>
            <div className="mt-6 flex gap-3"><Button variant="outline" onClick={() => setStep(1)}>{t("back")}</Button><Button className="flex-1" size="lg" variant="royal" disabled={busy} onClick={submit}>{busy ? "…" : t("submit")}</Button></div>
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