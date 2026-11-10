import assert from "node:assert/strict";
import test from "node:test";
import { allPlans, computePlan } from "../src/lib/pricing.ts";

test("cash formula is 100% with no remaining balance", () => {
  const plan = computePlan(1_000_000, 0);
  assert.equal(plan.total, 1_000_000);
  assert.equal(plan.reservation, 1_000_000);
  assert.equal(plan.balance, 0);
  assert.equal(plan.monthly, 0);
});

test("approved rates are applied to every duration", () => {
  assert.deepEqual(allPlans(1_000_000).map((plan) => plan.total), [
    1_000_000, 1_100_000, 1_200_000, 1_350_000, 1_500_000,
  ]);
});

test("instalment plans require a 30% first payment", () => {
  for (const duration of [3, 6, 9, 12]) {
    const plan = computePlan(1_000_000, duration);
    assert.equal(plan.reservation, Math.round(plan.total * 0.3));
    assert.equal(plan.balance, plan.total - plan.reservation);
  }
});

test("all instalments add up exactly to the remaining balance", () => {
  for (const duration of [3, 6, 9, 12]) {
    const plan = computePlan(1_000_001, duration);
    assert.equal(plan.monthly * (duration - 1) + plan.lastInstallment, plan.balance);
  }
});

test("invalid cash prices do not create payable amounts", () => {
  const plan = computePlan(Number.NaN, 6);
  assert.equal(plan.total, 0);
  assert.equal(plan.reservation, 0);
  assert.equal(plan.balance, 0);
});
