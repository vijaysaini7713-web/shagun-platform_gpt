export const VPA_RE = /^[a-zA-Z0-9._-]{2,255}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const isVpa = (v: string) => VPA_RE.test(v.trim());

export type ReceivingMode = "common" | "by_side";
/** Which receiving account serves a guest from this side. */
export const accountSideFor = (mode: ReceivingMode, side: "bride" | "groom") => (mode === "common" ? "common" : side);

/** Build a standard UPI payment URI (NPCI deep link spec). Amount in rupees, 2 decimals. */
export function buildUpiUri(p: { vpa: string; name: string; amount?: number; note?: string }) {
  if (!isVpa(p.vpa)) throw new Error("Invalid UPI ID");
  const q: [string, string][] = [["pa", p.vpa.trim()], ["pn", p.name.trim().slice(0, 50)]];
  if (p.amount && p.amount > 0) q.push(["am", p.amount.toFixed(2)]);
  q.push(["cu", "INR"]);
  if (p.note) q.push(["tn", p.note.slice(0, 50)]);
  return "upi://pay?" + q.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

export const maskAccount = (last4: string | null | undefined) => (last4 ? `•••• •••• ${last4}` : "—");