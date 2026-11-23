import { describe, it, expect } from "vitest";
import { accountSideFor, buildUpiUri, isVpa } from "./upi";

describe("upi", () => {
  it("validates VPAs", () => {
    expect(isVpa("ananya.family@okaxis")).toBe(true);
    expect(isVpa("no-at-sign")).toBe(false);
    expect(isVpa("a@1bank")).toBe(false);
  });
  it("builds an encoded upi://pay link with pa, pn, am, cu=INR, tn", () => {
    expect(buildUpiUri({ vpa: "ananya@okaxis", name: "Ananya Family", amount: 1100, note: "Shagun SS-AB12" }))
      .toBe("upi://pay?pa=ananya%40okaxis&pn=Ananya%20Family&am=1100.00&cu=INR&tn=Shagun%20SS-AB12");
  });
  it("routes groom guests to groom account when by side", () => expect(accountSideFor("by_side", "groom")).toBe("groom"));
  it("routes everyone to common account in common mode", () => expect(accountSideFor("common", "bride")).toBe("common"));
});