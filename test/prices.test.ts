import { describe, expect, it } from "vitest";
import { copenhagenTime, speak } from "../src/prices.js";

describe("copenhagenTime", () => {
  it("uses CEST in summer", () => {
    expect(copenhagenTime(new Date("2026-07-01T10:30:00Z"))).toEqual({ iso: "2026-07-01T12:30:00", hour: 12 });
  });
  it("uses CET in winter and rolls over midnight", () => {
    expect(copenhagenTime(new Date("2026-12-31T23:10:00Z"))).toEqual({ iso: "2027-01-01T00:10:00", hour: 0 });
  });
});

describe("speak", () => {
  const b = { spot: 0, grid: 0, energinet: 0, tax: 0, markup: 0, hour: 0 };
  it("reads kroner and øre", () => {
    expect(speak({ ...b, total: 2.456 }, false)).toContain("2 kroner 46 øre");
  });
  it("says only øre below one krone", () => {
    expect(speak({ ...b, total: 0.82 }, true)).toContain("about 82 øre per");
  });
  it("omits øre when zero and notes missing margin", () => {
    const s = speak({ ...b, total: 3 }, false);
    expect(s).toContain("3 kroner per");
    expect(s).toContain("excludes your provider's own margin");
  });
});
