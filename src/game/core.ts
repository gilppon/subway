import type {
  CrowdLevel,
  Judgement,
  PassengerCue,
  PassengerCueType,
  PassengerData,
  StageData,
  StationEvent,
} from "./types";
import { ARCHETYPES, CROWD_MOVE_PENALTY, RIVAL_BY_ID, type StageTemplate } from "./data/content";
import { CUES, CUE_BY_TYPE } from "./data/cues";

/* ------------------------------------------------------------------ */
/* 시스템 상수                                                           */
/* ------------------------------------------------------------------ */
export const FIXED_DELTA_MS = 1000 / 60;
export const WORLD = { w: 1040, h: 560 };
export const FLOOR_Y = 468;
export const SEAT_CUSHION_Y = 272;
export const SEAT_BACK_Y = 196;
export const CUE_ICON_Y = 128;
export const STANDUP_LEAD_MS = 600;

export const SCAN = {
  durationMs: 800,
  cooldownMs: 1200,
  rangePx: 220,
  rapidCount: 3,
  rapidGlare: 5,
};

export const MOVE = {
  baseMs: 350,
  collisionMs: 100,
  windowMs: 3000,
  naturalSlots: 3,
  rushSlots: 6,
};

export const GLARE_RULES = {
  wrongStandMs: 4000,
  wrongStand: 8,
  rush4: 8,
  rush6: 18,
  doorBlock: 10,
  blockPath: 15,
  bodyCollision: 20,
  reliefWaitMs: 5000,
  reliefIdle: 3,
  reliefCorrectWait: 5,
  reliefYield: 7,
  danger: 90,
};

export const SCORE_TABLE = {
  base: 1000,
  perfectBonus: 500,
  comboBonus: 150,
  noGlareBonus: 300,
  longDistanceBonus: 200,
  wrongPrediction: -300,
  glareHigh: -500,
  doorBlock: -200,
  rivalLoss: -250,
};

/* ------------------------------------------------------------------ */
/* RNG                                                                 */
/* ------------------------------------------------------------------ */
export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  chance: (p: number) => boolean;
  shuffle: <T>(arr: readonly T[]) => T[];
};

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number) => min + next() * (max - min);
  const int = (min: number, max: number) => Math.floor(range(min, max + 1));
  return {
    next,
    range,
    int,
    pick: <T,>(arr: readonly T[]) => arr[Math.min(arr.length - 1, Math.floor(next() * arr.length))],
    chance: (p: number) => next() < p,
    shuffle: <T,>(arr: readonly T[]) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

/* ------------------------------------------------------------------ */
/* 레이아웃                                                             */
/* ------------------------------------------------------------------ */
export type Layout = {
  seatCount: number;
  seatIds: string[];
  seatXs: Record<string, number>;
  frontSlotBySeat: Record<string, string>;
  seatByFrontSlot: Record<string, string>;
  slots: string[];
  slotXs: Record<string, number>;
};

export function buildLayout(seatCount: number): Layout {
  const half = Math.floor(seatCount / 2);
  const rightCount = seatCount - half;
  const centers = (from: number, to: number, n: number) =>
    n <= 1 ? [from] : Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
  const left = centers(168, 486, half);
  const right = centers(554, 872, rightCount);
  const seatXs: Record<string, number> = {};
  const frontSlotBySeat: Record<string, string> = {};
  const seatByFrontSlot: Record<string, string> = {};
  const slotXs: Record<string, number> = { DoorL: 78, C1: 520, DoorR: 962 };
  const slots: string[] = ["DoorL"];
  left.forEach((x, i) => {
    const seatId = `S${i + 1}`;
    const slot = `P${i + 1}`;
    seatXs[seatId] = x;
    frontSlotBySeat[seatId] = slot;
    seatByFrontSlot[slot] = seatId;
    slotXs[slot] = x;
    slots.push(slot);
  });
  slots.push("C1");
  right.forEach((x, i) => {
    const idx = half + i + 1;
    const seatId = `S${idx}`;
    const slot = `P${idx}`;
    seatXs[seatId] = x;
    frontSlotBySeat[seatId] = slot;
    seatByFrontSlot[slot] = seatId;
    slotXs[slot] = x;
    slots.push(slot);
  });
  slots.push("DoorR");
  return { seatCount, seatIds: Object.keys(seatXs), seatXs, frontSlotBySeat, seatByFrontSlot, slots, slotXs };
}

export function slotDistance(a: string, b: string, layout: Layout): number {
  return Math.abs(layout.slots.indexOf(a) - layout.slots.indexOf(b));
}

export function crowdMoveMs(crowd: CrowdLevel, rivalCount: number): number {
  return MOVE.baseMs + CROWD_MOVE_PENALTY[crowd] * 1000 + rivalCount * MOVE.collisionMs;
}

/* ------------------------------------------------------------------ */
/* 좌석 선점 판정 (경계값 테스트 대상)                                       */
/* ------------------------------------------------------------------ */
export const JUDGE_WINDOW = {
  perfectMin: 1500,
  perfectMax: 3000,
  goodMin: 300,
  lateMin: -500,
};

/** @param arrivalMs 플레이어가 해당 좌석 앞에 선(유효) 시점, 없으면 null */
export function judgeSeatClaim(arrivalMs: number | null, standUpMs: number): Judgement {
  if (arrivalMs === null || !Number.isFinite(arrivalMs)) return "MISS";
  const delta = standUpMs - arrivalMs;
  if (delta >= JUDGE_WINDOW.perfectMin && delta <= JUDGE_WINDOW.perfectMax) return "PERFECT";
  if (delta >= JUDGE_WINDOW.goodMin && delta < JUDGE_WINDOW.perfectMin) return "GOOD";
  if (delta >= JUDGE_WINDOW.lateMin && delta < JUDGE_WINDOW.goodMin) return "LATE";
  // 너무 일찍 와서 캠핑: PERFECT가 아니라 GOOD (자리낚시 방지)
  if (delta > JUDGE_WINDOW.perfectMax) return "GOOD";
  return "MISS";
}

export function clampGlare(value: number): number {
  return Math.max(0, Math.min(100, value));
}
export function clampFatigue(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export type ScoreBreakdown = { total: number; parts: { label: string; value: number }[] };

export function seatClaimScore(judgement: Judgement, combo: number, glare: number, movedSlots: number): ScoreBreakdown {
  const parts: { label: string; value: number }[] = [];
  if (judgement === "PERFECT") {
    parts.push({ label: "좌석 확보", value: SCORE_TABLE.base });
    parts.push({ label: "PERFECT 보너스", value: SCORE_TABLE.perfectBonus });
  } else if (judgement === "GOOD") {
    parts.push({ label: "좌석 확보", value: SCORE_TABLE.base });
  } else {
    parts.push({ label: "아슬아슬 선점", value: Math.round(SCORE_TABLE.base * 0.7) });
  }
  if (combo >= 2) parts.push({ label: `연속 성공 x${combo}`, value: SCORE_TABLE.comboBonus * combo });
  if (glare < 20) parts.push({ label: "무눈총 보너스", value: SCORE_TABLE.noGlareBonus });
  if (movedSlots >= 3) parts.push({ label: "긴 거리 예측", value: SCORE_TABLE.longDistanceBonus });
  return { total: parts.reduce((s, p) => s + p.value, 0), parts };
}

export function computeRank(score: number, maxGlare: number, accuracy: number, survived: boolean) {
  if (!survived) return "F";
  if (score >= 5000 && maxGlare <= 40 && accuracy >= 0.8) return "S";
  if (score >= 4000) return "A";
  if (score >= 2500) return "B";
  if (score >= 1000) return "C";
  return "D";
}

/* ------------------------------------------------------------------ */
/* 단서 평가                                                            */
/* ------------------------------------------------------------------ */
export function cueWeight(strength: PassengerCue["strength"], truthful: boolean): number {
  switch (strength) {
    case "strong":
      return truthful ? 0.38 : 0.19;
    case "medium":
      return truthful ? 0.22 : 0.13;
    case "weak":
      return 0.07;
    default:
      return 0.03;
  }
}

/** 스캔으로 샘플링된 단서만으로 직감 확률 계산 */
export function estimateExitChance(willExit: boolean, sampled: PassengerCue[], confidenceSeed: number): number {
  let v = 0.05;
  for (const c of sampled) v += cueWeight(c.strength, willExit);
  v += (confidenceSeed - 0.5) * 0.12;
  return Math.max(0, Math.min(1, v));
}

export function verdictFromChance(chance: number): "low" | "mid" | "high" | "certain" {
  if (chance <= 0.25) return "low";
  if (chance <= 0.5) return "mid";
  if (chance <= 0.75) return "high";
  return "certain";
}

export const VERDICT_LABEL: Record<"low" | "mid" | "high" | "certain", string> = {
  low: "그냥 지나가는 습관 같은데",
  mid: "어쩌면 내릴지도?",
  high: "몸이 이미 이동 준비 중",
  certain: "저 사람, 곧 일어난다",
};

/* ------------------------------------------------------------------ */
/* 스테이지 생성 (데이터 기반)                                             */
/* ------------------------------------------------------------------ */
function pickCueType(rng: Rng, strength: PassengerCue["strength"], preferred: string[]): PassengerCueType {
  const pool = CUES.filter((c) => c.strength === strength);
  if (preferred.length > 0 && rng.chance(0.6)) {
    const pref = pool.filter((c) => preferred.includes(c.type));
    if (pref.length > 0) return rng.pick(pref).type;
  }
  return rng.pick(pool).type;
}

export function planCues(
  rng: Rng,
  opts: {
    roundStartMs: number;
    standUpMs: number;
    willExit: boolean;
    difficulty: number;
    trapRatio: number;
    decoyStrong: boolean;
    cueDurationMs: number;
    preferred: string[];
    leadProfile?: "normal" | "tutorial";
  },
): PassengerCue[] {
  const { roundStartMs, standUpMs, willExit, difficulty, trapRatio, decoyStrong, cueDurationMs, preferred } = opts;
  const roundLen = Math.max(3000, standUpMs - roundStartMs);
  const cues: PassengerCue[] = [];
  let seq = 0;
  const add = (type: PassengerCueType, leadFrom: number, leadTo: number) => {
    const def = CUE_BY_TYPE[type];
    const lead = rng.range(leadFrom, leadTo);
    const start = Math.max(roundStartMs + 150, standUpMs - lead * roundLen);
    const duration = Math.max(700, cueDurationMs * rng.range(0.85, 1.25));
    cues.push({
      id: `cue-${seq++}`,
      type,
      strength: def.strength,
      startTimeMs: Math.round(start),
      durationMs: Math.round(duration),
      animationKey: def.animationKey,
      soundKey: def.strength === "strong" ? "cue_strong" : "cue_soft",
    });
  };

  const tutorial = opts.leadProfile === "tutorial";
  if (willExit) {
    const strongCount = difficulty >= 3 ? rng.int(1, 2) : 1;
    const mediumCount = rng.int(1, 2);
    const weakCount = rng.int(0, 2);
    for (let i = 0; i < strongCount; i++) add(pickCueType(rng, "strong", preferred), tutorial ? 0.5 : 0.12, tutorial ? 0.8 : 0.42);
    for (let i = 0; i < mediumCount; i++) add(pickCueType(rng, "medium", preferred), tutorial ? 0.72 : 0.38, tutorial ? 0.95 : 0.85);
    for (let i = 0; i < weakCount; i++) add(pickCueType(rng, "weak", preferred), 0.2, 0.95);
  } else {
    const strongCount = decoyStrong && rng.chance(0.28) ? 1 : 0;
    const mediumCount = rng.int(0, 1);
    const weakCount = rng.int(1, 3);
    for (let i = 0; i < strongCount; i++) add(pickCueType(rng, "strong", preferred), 0.15, 0.6);
    for (let i = 0; i < mediumCount; i++) add(pickCueType(rng, "medium", preferred), 0.4, 0.9);
    for (let i = 0; i < weakCount; i++) add(pickCueType(rng, "weak", preferred), 0.15, 0.95);
    if (rng.chance(trapRatio)) add("fake_sleep", 0.1, 0.4);
  }
  return cues.sort((a, b) => a.startTimeMs - b.startTimeMs);
}

export function buildPassengersForRound(
  rng: Rng,
  opts: {
    layout: Layout;
    roundStartMs: number;
    standUpMs: number;
    occupiedSeatIds: string[];
    exitingSeatIds: string[];
    difficulty: number;
    trapRatio: number;
    decoyStrong: boolean;
    cueDurationMs: number;
    idPrefix: string;
    leadProfile?: "normal" | "tutorial";
  },
): PassengerData[] {
  const { layout, roundStartMs, standUpMs, occupiedSeatIds, exitingSeatIds } = opts;
  return occupiedSeatIds.map((seatId) => {
    const archetype = rng.pick(ARCHETYPES);
    const willExit = exitingSeatIds.includes(seatId);
    const cues = planCues(rng, {
      roundStartMs,
      standUpMs,
      willExit,
      difficulty: opts.difficulty,
      trapRatio: opts.trapRatio,
      decoyStrong: opts.decoyStrong,
      cueDurationMs: opts.cueDurationMs,
      preferred: archetype.preferredCues,
      leadProfile: opts.leadProfile,
    });
    return {
      id: `${opts.idPrefix}-${seatId}`,
      seatId,
      archetype: archetype.id,
      willExitAtNextStation: willExit,
      standUpTimeMs: willExit ? standUpMs : undefined,
      exitDoor: layout.slotXs[layout.frontSlotBySeat[seatId]] < WORLD.w / 2 ? "left" : "right",
      cues,
      patienceModifier: archetype.patienceModifier,
    } satisfies PassengerData;
  });
}

export function generateStage(template: StageTemplate, seed: number): StageData {
  const rng = createRng(seed);
  const layout = buildLayout(template.seats);
  const stationEvents: StationEvent[] = template.stations.map((name, i) => ({
    stationId: `st-${i}`,
    stationName: name,
    arrivalTimeMs: template.intervalMs * (i + 1),
    doorOpenDurationMs: template.doorOpenMs,
    exitingPassengerIds: [],
    enteringPassengerCount: rng.int(1, 3),
  }));

  // 1라운드: 전 좌석 착석, 첫 역에서 내릴 승객 결정
  const firstRoundStandUp = stationEvents[0].arrivalTimeMs - STANDUP_LEAD_MS;
  const exitCount = Math.min(layout.seatIds.length - 1, rng.int(template.exitMin, template.exitMax));
  const firstOccupied = [...layout.seatIds];
  const firstExiting = rng.shuffle(firstOccupied).slice(0, exitCount);
  const passengers = buildPassengersForRound(rng, {
    layout,
    roundStartMs: 600,
    standUpMs: firstRoundStandUp,
    occupiedSeatIds: firstOccupied,
    exitingSeatIds: firstExiting,
    difficulty: template.difficulty,
    trapRatio: template.trapCueRatio,
    decoyStrong: template.decoyStrongCues,
    cueDurationMs: template.cueDurationMs,
    idPrefix: "r0",
    leadProfile: template.id === "tutorial" ? "tutorial" : "normal",
  });
  stationEvents[0].exitingPassengerIds = passengers.filter((p) => p.willExitAtNextStation).map((p) => p.id);

  const totalDurationMs =
    stationEvents[stationEvents.length - 1].arrivalTimeMs +
    template.doorOpenMs +
    1600;

  return {
    id: template.id,
    title: template.title,
    subtitle: template.subtitle,
    difficulty: template.difficulty,
    lineName: template.lineName,
    lineColor: template.lineColor,
    totalDurationMs,
    crowdLevel: template.crowdLevel,
    seats: template.seats,
    passengers,
    stationEvents,
    rivalNpcIds: template.rivalNpcIds.filter((id) => RIVAL_BY_ID[id]),
    fatigueDrainMultiplier: template.fatigueDrainMultiplier,
    glareMultiplier: template.glareMultiplier,
    rules: {
      cueDurationMs: template.cueDurationMs,
      trapCueRatio: template.trapCueRatio,
      decoyStrongCues: template.decoyStrongCues,
      tutorial: template.id === "tutorial",
      tagline: template.tagline,
    },
  };
}

export function ambientCount(crowd: CrowdLevel): number {
  switch (crowd) {
    case "low":
      return 2;
    case "normal":
      return 3;
    case "high":
      return 5;
    default:
      return 7;
  }
}
