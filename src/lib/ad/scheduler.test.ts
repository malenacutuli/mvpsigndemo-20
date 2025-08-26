import { computeGaps, allocateAdSlots, validateNoOverlap } from "./scheduler";
import { describe, it, expect } from "vitest";

describe("AD scheduler", () => {
  it("creates gaps before first line and between lines", () => {
    const segs = [
      { start: 5.04, end: 8.4, text: "Hola. Bienvenidos..." },
      { start: 8.8, end: 12.16, text: "Adivinen..." },
    ];
    const gaps = computeGaps(segs, 20, 0.8, 0.1);
    
    // gap from 0 to 4.94, and 8.5 to 8.7 is too small; next valid after 12.26 to 20
    expect(gaps[0].start).toBeCloseTo(0, 2);
    expect(gaps[0].end).toBeCloseTo(4.94, 2);
    expect(gaps.at(-1)!.start).toBeGreaterThan(12.2);
  });

  it("allocates reasonable ad slots", () => {
    const gaps = [{ start: 0, end: 4, dur: 4 }];
    const slots = allocateAdSlots(gaps, 2);
    expect(slots[0].maxDur).toBeLessThanOrEqual(2);
    expect(slots[0].start).toBe(0);
  });

  it("filters too-small gaps", () => {
    const gaps = [{ start: 10, end: 10.5, dur: 0.5 }];
    const slots = allocateAdSlots(gaps, 2);
    expect(slots.length).toBe(0);
  });

  it("validates no overlap between AD slots and dialogue", () => {
    const segments = [
      { start: 5, end: 8, text: "Hello" },
      { start: 10, end: 12, text: "World" }
    ];
    const validSlots = [{ start: 0, end: 4, maxDur: 3 }];
    const overlappingSlots = [{ start: 6, end: 9, maxDur: 2 }];

    expect(validateNoOverlap(segments, validSlots)).toBe(true);
    expect(validateNoOverlap(segments, overlappingSlots)).toBe(false);
  });
});