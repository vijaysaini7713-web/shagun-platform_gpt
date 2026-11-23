import { describe, it, expect } from "vitest";
import { indianPhone, routeShagun } from "./validation";

const labels = { bride: "B", groom: "G" };
describe("rules", () => {
  it("accepts a 10-digit Indian mobile", () => expect(indianPhone.safeParse("9876543210").success).toBe(true));
  it("rejects short or non-mobile numbers", () => {
    expect(indianPhone.safeParse("12345").success).toBe(false);
    expect(indianPhone.safeParse("1876543210").success).toBe(false);
  });
  it("routes by guest side", () => expect(routeShagun("by_side", "groom", labels).label).toBe("G"));
  it("routes all to bride when configured", () => expect(routeShagun("bride_only", "groom", labels).side).toBe("bride"));
});