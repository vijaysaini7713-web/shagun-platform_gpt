import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Mail, QrCode, ShieldCheck, Smartphone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner, SiteHeader } from "@/components/app/SiteHeader";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShagunSetu — Indian Wedding Gift & Shagun Manager" },
      { name: "description", content: "Guests declare gifts and shagun by QR, staff log them at the counter, families see every blessing in one dashboard." },
      { property: "og:title", content: "ShagunSetu — Indian Wedding Gift & Shagun Manager" },
      { property: "og:description", content: "QR guest journey, gift counter and admin dashboard for Indian weddings. Demo mode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: QrCode, en: "Guest QR journey", hi: "मेहमान क्यूआर यात्रा", d: "Side, relation, gift photo, envelope and sandbox shagun — on any phone." },
  { icon: Smartphone, en: "Staff gift counter", hi: "स्टाफ़ गिफ्ट काउंटर", d: "Search or scan a reference, mark received, record envelopes and handovers." },
  { icon: Users, en: "Roles for every family", hi: "हर परिवार के लिए भूमिकाएँ", d: "Owner, bride/groom admins, finance and counter staff — each sees only what they should." },
  { icon: ShieldCheck, en: "Private by design", hi: "पूरी तरह निजी", d: "Each wedding is isolated. Guest phone numbers never leave your team." },
];

function Index() {
  const { t, lang } = useI18n();
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <SiteHeader />
      <section className="mandala-bg">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gold-foreground">
              {lang === "hi" ? "शादी के हर आशीर्वाद का हिसाब" : "Every blessing, accounted for"}
            </p>
            <h1 className="text-5xl font-bold leading-tight text-primary md:text-6xl">{t("tagline")}</h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              {lang === "hi"
                ? "मेहमान क्यूआर से उपहार दर्ज करें, स्टाफ़ काउंटर पर पुष्टि करे, परिवार सब एक जगह देखे।"
                : "Guests declare gifts by QR, staff confirm them at the counter, and the family sees everything in one place."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="xl" variant="royal"><Link to="/w/$slug" params={{ slug: "demo-wedding" }}><Gift />{t("tryGuest")}</Link></Button>
              <Button asChild size="xl" variant="gold"><Link to="/dashboard">{t("tryAdmin")}</Link></Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Payments are simulated in sandbox only. No real UPI or card payments until merchant verification.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
              <div className="rounded-2xl bg-royal p-6 text-center text-primary-foreground">
                <p className="text-xs uppercase tracking-widest text-gold">{t("welcome")}</p>
                <p className="mt-2 font-display text-4xl">Aarav & Ananya</p>
                <div className="gold-rule my-4" />
                <p className="text-sm opacity-80">12 · 12 · 2026 · Jaipur</p>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                {[
                  [Gift, "Silver puja thali", "status-received"],
                  [Mail, "Shagun envelope ₹5,100", "status-handed"],
                ].map(([I, l], i) => {
                  const Icon = I as typeof Gift;
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-muted p-3">
                      <Icon className="h-5 w-5 text-primary" /> <span>{l as string}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.en} className="rounded-2xl border border-border bg-card p-6">
              <f.icon className="h-7 w-7 text-gold" />
              <h3 className="mt-4 text-xl font-semibold text-primary">{lang === "hi" ? f.hi : f.en}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-border bg-secondary p-6">
          <h2 className="text-2xl font-semibold text-primary">How to test the demo</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-secondary-foreground">
            <li>Open the guest journey on your phone and submit a gift — you get a receipt code and QR.</li>
            <li>Sign in, open the Dashboard and pick a demo role (owner, finance, counter staff…).</li>
            <li>As counter staff, search the code and mark the gift received or handed over.</li>
            <li>As owner, see it in the overview, reports and activity log.</li>
          </ol>
        </div>
      </section>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        ShagunSetu · Demo build · All couples, guests and amounts are fictional.
      </footer>
    </div>
  );
}