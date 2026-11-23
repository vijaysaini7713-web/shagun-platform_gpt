import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { DemoBanner, LangSwitch, Logo, StatusBadge } from "@/components/app/SiteHeader";
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
  notFoundComponent: () => <div className="p-10 text-center">Receipt not found.</div>,
  component: Receipt,
});

function Receipt() {
  const { guest, wedding, gifts, payments } = Route.useLoaderData();
  const { t } = useI18n();
  const w = wedding as { bride_name: string; groom_name: string; slug: string } | null;
  return (
    <div className="min-h-screen mandala-bg">
      <DemoBanner />
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4"><Logo /><LangSwitch /></div>
      <div className="mx-auto max-w-md px-4 pb-16">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
          <div className="bg-royal p-6 text-center text-primary-foreground">
            <p className="text-xs uppercase tracking-widest text-gold">{t("receipt")}</p>
            <h1 className="mt-1 text-3xl">{w?.groom_name} & {w?.bride_name}</h1>
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
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>💠 {t("digital")} {inr(p.amount)} <Badge variant="demo" className="ml-1">Sandbox</Badge></span>
                <StatusBadge s={p.status} />
              </div>
            ))}
            {payments.length > 0 && <p className="pt-2 text-xs text-muted-foreground">{t("sandboxOnly")}. Ref {payments[0]?.sandbox_ref}</p>}
          </div>
        </div>
        {w && <Link to="/w/$slug" params={{ slug: w.slug }} className="mt-6 block text-center text-sm text-primary underline">Back to wedding page</Link>}
      </div>
    </div>
  );
}