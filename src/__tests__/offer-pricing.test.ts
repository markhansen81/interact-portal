/**
 * Tests for applyRatesToLines in src/components/admin/offer-form.tsx
 *
 * Covers: tariff-based price lookup, rate updates, lines without days,
 * unmatched program types, and manually overridden prices.
 */
import { describe, it, expect } from "vitest";
import { applyRatesToLines, ProgramLine } from "@/components/admin/offer-form";

// ── Test data ────────────────────────────────────────────────────────────────

const RATES = [
  { id: "r1", program_type: "Native Speaker Week", num_days: 5, tariff: 1, price_pp: 45 },
  { id: "r2", program_type: "Native Speaker Week", num_days: 5, tariff: 2, price_pp: 55 },
  { id: "r3", program_type: "Native Speaker Week", num_days: 3, tariff: 1, price_pp: 30 },
  { id: "r4", program_type: "Theatre Week", num_days: 5, tariff: 1, price_pp: 50 },
  { id: "r5", program_type: "Theatre Week", num_days: 5, tariff: 2, price_pp: 60 },
];

function makeLine(overrides: Partial<ProgramLine> = {}): ProgramLine {
  return {
    program_type: "Native Speaker Week",
    grade_level: "",
    num_students: 25,
    num_groups: 1,
    num_tas: 1,
    num_days: 5,
    start_date: "",
    end_date: "",
    price_pp: "",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("applyRatesToLines — offer pricing", () => {
  it("fills price_pp from matching rate for tariff 1", () => {
    const lines = [makeLine()];
    const result = applyRatesToLines(lines, RATES, 1);
    expect(result[0].price_pp).toBe(45);
  });

  it("updates price_pp when tariff changes from 1 to 2", () => {
    const lines = [makeLine({ price_pp: 45 })];
    const result = applyRatesToLines(lines, RATES, 2);
    expect(result[0].price_pp).toBe(55);
  });

  it("picks up new rates (e.g. rate correction)", () => {
    const lines = [makeLine({ price_pp: 45 })];
    const updatedRates = RATES.map((r) =>
      r.id === "r1" ? { ...r, price_pp: 48 } : r
    );
    const result = applyRatesToLines(lines, updatedRates, 1);
    expect(result[0].price_pp).toBe(48);
  });

  it("overwrites a manually entered price when a rate matches", () => {
    const lines = [makeLine({ price_pp: 999 })];
    const result = applyRatesToLines(lines, RATES, 1);
    expect(result[0].price_pp).toBe(45);
  });

  it("preserves price_pp when no rate matches (unknown program type)", () => {
    const lines = [makeLine({ program_type: "Film Week", price_pp: 99 })];
    const result = applyRatesToLines(lines, RATES, 1);
    expect(result[0].price_pp).toBe(99);
  });

  it("skips lines without num_days", () => {
    const lines = [makeLine({ num_days: "", price_pp: "" })];
    const result = applyRatesToLines(lines, RATES, 1);
    expect(result[0].price_pp).toBe("");
    expect(result[0].num_days).toBe("");
  });

  it("handles multiple lines with different program types", () => {
    const lines = [
      makeLine({ program_type: "Native Speaker Week", num_days: 5 }),
      makeLine({ program_type: "Theatre Week", num_days: 5 }),
    ];
    const result = applyRatesToLines(lines, RATES, 1);
    expect(result[0].price_pp).toBe(45);
    expect(result[1].price_pp).toBe(50);
  });

  it("matches on num_days as well as program type", () => {
    const lines = [makeLine({ num_days: 3 })];
    const result = applyRatesToLines(lines, RATES, 1);
    expect(result[0].price_pp).toBe(30);
  });

  it("returns lines unchanged when rates array is empty", () => {
    const lines = [makeLine({ price_pp: 42 })];
    const result = applyRatesToLines(lines, [], 1);
    expect(result[0].price_pp).toBe(42);
  });
});
