import { describe, expect, it } from "vitest";
import { JUDGE_WINDOW, judgeSeatClaim } from "./core";

describe("judgeSeatClaim 경계값", () => {
  const stand = 10000;
  it("null/MISS", () => {
    expect(judgeSeatClaim(null, stand)).toBe("MISS");
    expect(judgeSeatClaim(Number.NaN, stand)).toBe("MISS");
  });
  it("PERFECT 구간", () => {
    expect(judgeSeatClaim(stand - JUDGE_WINDOW.perfectMin, stand)).toBe("PERFECT");
    expect(judgeSeatClaim(stand - JUDGE_WINDOW.perfectMax, stand)).toBe("PERFECT");
  });
  it("GOOD 구간", () => {
    expect(judgeSeatClaim(stand - JUDGE_WINDOW.goodMin, stand)).toBe("GOOD");
  });
  it("LATE 구간", () => {
    expect(judgeSeatClaim(stand - JUDGE_WINDOW.lateMin - 1, stand)).toBe("LATE");
  });
  it("캠핑(너무 일찍 도착)은 GOOD으로 강등", () => {
    expect(judgeSeatClaim(stand - JUDGE_WINDOW.perfectMax - 5000, stand)).toBe("GOOD");
  });
});
