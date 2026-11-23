import { z } from "zod";

export const indianPhone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
export const guestName = z.string().trim().min(2, "Name is required").max(80);
export const side = z.enum(["bride", "groom"]);
export const outcome = z.enum(["success", "failed", "pending"]);

export type Routing = "by_side" | "bride_only" | "groom_only";
/** Which demo receiving account a digital shagun is routed to. */
export function routeShagun(
  routing: Routing,
  guestSide: "bride" | "groom",
  labels: { bride: string; groom: string },
) {
  const target = routing === "bride_only" ? "bride" : routing === "groom_only" ? "groom" : guestSide;
  return { side: target, label: labels[target] };
}

export const inr = (n: number | null | undefined) =>
  n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN");