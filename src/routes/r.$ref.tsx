import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { DemoBanner, LangSwitch, Logo, SiteFooter, StatusBadge } from "@/components/app/SiteHeader";
import { getReceipt } from "@/lib/guest.functions";
import { useI18n } from "@/lib/i18n";
import { inr } from "@/lib/validation";

export const Route = createFileRoute("/r/$ref")({
  loader: async ({ params }) => {
    const r = await getReceipt({ data: { ref: params.ref } });
    if (!r) throw notFound();
    return r;
  },
  head: () => ({
    meta: [
      { title: "Gift receipt — ShagunSetu" },
      { name: "description", content: "Your wedding gift receipt and counter QR code." },
      { property: "og:title", content: "Gift receipt — ShagunSetu" },
      { property: "og:description", content: "Your wedding gift receipt and counter QR code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: NotFound,
  component: Receipt,
});

function NotFound() {
  const { t } = useI18n();
  return <div className="min-h-screen mandala-bg p-6"><div className="card-premium mx-auto mt-16 max-w-sm p-8 text-center"><p className="text-3xl">🪔</p><p className="mt-2">{t("receiptNotFound")}</p><Link to="/" className="mt-4 inline-block text-primary underline">{t("home")}</Link></div></div>;
}

function Receipt() {
  const { guest, wedding, gifts, payments, upi } = Route.useLoaderData();
  const { t } = useI18n();
  const w = wedding as { bride_name: string; groom_name: string; slug: string } | null;
  return (
    <div className="min-h-screen mandala-bg">
      <DemoBanner />
      <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-4"><Logo /><LangSwitch /></div>
      <div className="mx-auto max-w-md px-4 pb-16">
        <div className="overflow-hidden card-premium">
          <div className="bg-royal p-6 text-center text-primary-foreground">
            <p className="text-xs uppercase tracking-widest text-gold">{t("receipt")}</p>
            <h1 className="mt-1 break-words text-3xl">{w?.groom_name} & {w?.bride_name}</h1>
          </div>
          <div className="p-6 text-center">
            <div className="mx-auto inline-block rounded-xl bg-card p-3 ring-1 ring-border">
              <QRCodeSVG value={guest.ref} size={168} fgColor="currentColor" className="text-primary" />
            </div>
            <p className="mt-3 font-mono text-xl font-bold tracking-widest text-primary">{guest.ref}</p>
            <p className="text-sm text-muted-foreground">{t("showAtCounter")}</p>
            <p className="mt-4 font-semibold">{guest.name}</p>
            <p className="text-sm text-muted-foreground">{guest.side === "bride" ? t("brideSide") : t("groomSide")} · {guest.relation}</p>
          </div>
          <div className="space-y-2 border-t border-border p-6">
            {gifts.map((g, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>{g.kind === "physical" ? "🎁" : "✉️"} {g.description} {g.amount ? `· ${inr(g.amount)}` : ""}</span>
                <StatusBadge s={g.status} />
              </div>
            ))}
            {upi.map((u, i) => (
              <div key={`u${i}`} className="rounded-lg bg-muted px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2"><span>📲 UPI {inr(u.amount)} → {u.payee_name}</span><StatusBadge s={u.status} /></div>
                {u.status === "awaiting_bank_confirmation" && <p className="mt-1 text-xs text-muted-foreground">Direct bank transfer — the family will confirm it against their bank records.</p>}
              </div>
            ))}
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>🧪 Sandbox test {inr(p.amount)} <Badge variant="demo" className="ml-1">Simulated</Badge></span>
                <StatusBadge s={p.status} />
              </div>
            ))}
            {payments.length > 0 && <p className="pt-2 text-xs text-muted-foreground">{t("sandboxOnly")}. Ref {payments[0]?.sandbox_ref}</p>}
          </div>
        </div>
        {w && <Link to="/w/$slug" params={{ slug: w.slug }} className="mt-6 flex min-h-11 items-center justify-center text-sm text-primary underline">{t("backToWedding")}</Link>}
      </div>
      <SiteFooter />
    </div>
  );
}