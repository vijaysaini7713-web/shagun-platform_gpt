import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { guestName, indianPhone, outcome, routeShagun, side } from "./validation";

const photo = z
  .string()
  .regex(/^data:image\/(jpeg|png|webp);base64,/)
  .max(3_000_000)
  .optional();

const submitSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
  side,
  relation: z.string().trim().min(1).max(60),
  name: guestName,
  phone: indianPhone,
  physical: z.object({ description: z.string().trim().max(200).optional(), photo }).optional(),
  envelope: z.object({ amount: z.number().int().min(1).max(10_000_000).optional(), photo }).optional(),
  digital: z.object({ amount: z.number().int().min(1).max(500_000), outcome }).optional(),
});

function refCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "SS-" + Array.from(bytes, (b) => a[b % a.length]).join("");
}

/** Public: safe wedding info only. */
export const getPublicWedding = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin
      .from("weddings")
      .select("bride_name, groom_name, event_date, venue, is_demo, allow_digital, welcome_message, slug")
      .eq("slug", data.slug)
      .maybeSingle();
    return w;
  });

/** Public: guest submits declaration. Validated server-side; payments are sandbox simulations only. */
export const submitGuest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    if (!data.physical && !data.envelope && !data.digital) throw new Error("Choose at least one gift type");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin
      .from("weddings")
      .select("id, payment_routing, bride_receiver_label, groom_receiver_label, allow_digital")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!w) throw new Error("Wedding not found");
    const ref = refCode();
    const { data: g, error } = await supabaseAdmin
      .from("guests")
      .insert({ wedding_id: w.id, side: data.side, relation: data.relation, name: data.name, phone: data.phone, ref_code: ref })
      .select("id")
      .single();
    if (error || !g) throw new Error("Could not save. Please try again.");

    async function upload(dataUrl: string | undefined, kind: string) {
      if (!dataUrl) return null;
      const [meta, b64] = dataUrl.split(",");
      const type = meta?.match(/image\/(\w+)/)?.[1] ?? "jpeg";
      const bin = Uint8Array.from(atob(b64 ?? ""), (c) => c.charCodeAt(0));
      const path = `${w!.id}/${g!.id}/${kind}.${type === "jpeg" ? "jpg" : type}`;
      const { error: e } = await supabaseAdmin.storage
        .from("gift-photos")
        .upload(path, bin, { contentType: `image/${type}`, upsert: true });
      return e ? null : path;
    }
    if (data.physical) {
      await supabaseAdmin.from("gifts").insert({
        wedding_id: w.id, guest_id: g.id, side: data.side, kind: "physical",
        description: data.physical.description || "Gift", photo_path: await upload(data.physical.photo, "physical"),
      });
    }
    if (data.envelope) {
      await supabaseAdmin.from("gifts").insert({
        wedding_id: w.id, guest_id: g.id, side: data.side, kind: "envelope", description: "Envelope",
        amount: data.envelope.amount ?? null, photo_path: await upload(data.envelope.photo, "envelope"),
      });
    }
    if (data.digital && w.allow_digital) {
      const r = routeShagun(w.payment_routing as never, data.side, { bride: w.bride_receiver_label, groom: w.groom_receiver_label });
      await supabaseAdmin.from("payments").insert({
        wedding_id: w.id, guest_id: g.id, side: r.side, routed_to: r.label, amount: data.digital.amount,
        status: data.digital.outcome, is_sandbox: true, sandbox_ref: "SBX-" + ref.slice(3),
      });
    }
    await supabaseAdmin.from("activity_log").insert({ wedding_id: w.id, action: "guest_submission", detail: `Guest ${ref} submitted` });
    return { ref };
  });

/** Public: receipt by unguessable reference. Never returns phone. */
export const getReceipt = createServerFn({ method: "GET" })
  .inputValidator((d: { ref: string }) => z.object({ ref: z.string().regex(/^[A-Z0-9-]{6,20}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: g } = await supabaseAdmin
      .from("guests")
      .select("id, name, side, relation, ref_code, created_at, weddings(bride_name, groom_name, is_demo, slug)")
      .eq("ref_code", data.ref)
      .maybeSingle();
    if (!g) return null;
    const [{ data: gifts }, { data: pays }] = await Promise.all([
      supabaseAdmin.from("gifts").select("kind, description, amount, status").eq("guest_id", g.id),
      supabaseAdmin.from("payments").select("amount, status, sandbox_ref, routed_to").eq("guest_id", g.id),
    ]);
    return { guest: { name: g.name, side: g.side, relation: g.relation, ref: g.ref_code, at: g.created_at }, wedding: g.weddings, gifts: gifts ?? [], payments: pays ?? [] };
  });