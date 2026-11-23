import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { IFSC_RE, VPA_RE } from "./upi";

async function encrypt(plain: string): Promise<string> {
  const secret = process.env["PAYMENT_DETAILS_ENC_KEY"];
  if (!secret || secret.length < 32) throw new Error("ENCRYPTION_UNAVAILABLE");
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return `v1:${b64(iv)}:${b64(ct)}`;
}

const opt = (s: z.ZodString) => s.optional().or(z.literal("").transform(() => undefined));
const accountSchema = z
  .object({
    weddingId: z.string().uuid(),
    side: z.enum(["common", "bride", "groom"]),
    enabled: z.boolean(),
    beneficiaryName: opt(z.string().trim().min(2).max(80)),
    upiVpa: opt(z.string().trim().regex(VPA_RE, "Invalid UPI ID")),
    bankHolder: opt(z.string().trim().min(2).max(80)),
    accountNumber: opt(z.string().regex(/^\d{9,18}$/, "Account number must be 9–18 digits")),
    accountNumberConfirm: z.string().optional(),
    clearAccount: z.boolean().optional(),
    ifsc: opt(z.string().trim().toUpperCase().regex(IFSC_RE, "Invalid IFSC")),
    bankName: opt(z.string().trim().max(80)),
    notes: opt(z.string().trim().max(300)),
    showBankToGuests: z.boolean(),
  })
  .refine((d) => !d.accountNumber || d.accountNumber === d.accountNumberConfirm, { message: "Account numbers do not match" })
  .refine((d) => !d.enabled || (d.upiVpa && d.beneficiaryName), { message: "Enabled accounts need a beneficiary name and UPI ID" });

async function assertFinance(ctx: { supabase: any }, weddingId: string) {
  const { data } = await ctx.supabase.rpc("has_wedding_role", { _w: weddingId, _roles: ["wedding_owner", "finance"] });
  if (!data) throw new Error("Only the wedding owner or finance can change payment receiving details");
}

export const savePaymentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => accountSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertFinance(context, data.weddingId);
    const row: Record<string, unknown> = {
      wedding_id: data.weddingId, side: data.side, enabled: data.enabled,
      beneficiary_name: data.beneficiaryName ?? null, upi_vpa: data.upiVpa ?? null,
      bank_holder: data.bankHolder ?? null, ifsc: data.ifsc ?? null, bank_name: data.bankName ?? null,
      notes: data.notes ?? null, show_bank_to_guests: data.showBankToGuests,
      updated_by: context.userId, updated_at: new Date().toISOString(),
    };
    if (data.accountNumber) {
      try {
        row["bank_account_enc"] = await encrypt(data.accountNumber);
        row["bank_account_last4"] = data.accountNumber.slice(-4);
      } catch {
        throw new Error("Bank account numbers can't be saved: secure encryption is not configured. UPI details were not saved either — remove the account number and try again.");
      }
    } else if (data.clearAccount) {
      row["bank_account_enc"] = null;
      row["bank_account_last4"] = null;
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payment_accounts").upsert(row as never, { onConflict: "wedding_id,side" });
    if (error) throw new Error("Could not save receiving details");
    await supabaseAdmin.from("activity_log").insert({
      wedding_id: data.weddingId, actor: context.userId, action: "receiving_updated",
      detail: `${data.side} receiving account ${data.enabled ? "enabled" : "disabled"}${data.accountNumber ? " (bank account updated)" : ""}`,
    });
    return { ok: true };
  });

export const setReceivingMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ weddingId: z.string().uuid(), mode: z.enum(["common", "by_side"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertFinance(context, data.weddingId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("weddings").update({ receiving_mode: data.mode }).eq("id", data.weddingId);
    await supabaseAdmin.from("activity_log").insert({ wedding_id: data.weddingId, actor: context.userId, action: "receiving_mode", detail: `Receiving mode set to ${data.mode}` });
    return { ok: true };
  });