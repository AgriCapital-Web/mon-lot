import { describe, expect, it } from "bun:test";
import { allPlans, computePlan } from "./pricing";

describe("Mon Lot payment calculations", () => {
  it("keeps the cash formula at 100% with no balance", () => {
    const plan = computePlan(1_000_000, 0);
    expect(plan.total).toBe(1_000_000);
    expect(plan.reservation).toBe(1_000_000);
    expect(plan.balance).toBe(0);
    expect(plan.monthly).toBe(0);
  });

  it("applies the five approved rates", () => {
    const plans = allPlans(1_000_000);
    expect(plans.map((plan) => plan.total)).toEqual([
      1_000_000,
      1_100_000,
      1_200_000,
      1_350_000,
      1_500_000,
    ]);
  });

  it("requires a 30% first payment on instalment plans", () => {
    for (const duration of [3, 6, 9, 12] as const) {
      const plan = computePlan(1_000_000, duration);
      expect(plan.reservation).toBe(Math.round(plan.total * 0.3));
      expect(plan.balance).toBe(plan.total - plan.reservation);
    }
  });

  it("makes the instalments add up exactly to the remaining balance", () => {
    for (const duration of [3, 6, 9, 12] as const) {
      const plan = computePlan(1_000_001, duration);
      expect(plan.monthly * (duration - 1) + plan.lastInstallment).toBe(plan.balance);
    }
  });

  it("returns zero values for an invalid cash price", () => {
    const plan = computePlan(Number.NaN, 6);
    expect(plan.total).toBe(0);
    expect(plan.reservation).toBe(0);
    expect(plan.balance).toBe(0);
  });
});
