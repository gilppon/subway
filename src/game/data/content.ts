import { z } from "zod";
import type { CrowdLevel } from "../types";

/* ------------------------------------------------------------------ */
/* 승객 아키타입 12종                                                    */
/* ------------------------------------------------------------------ */
export type PassengerArchetype = {
  id: string;
  label: string;
  emoji: string;
  palette: { body: string; head: string; hair: string; accent: string };
  /** 선호 단서 (이 승객이 자주 보이는 행동) */
  preferredCues: string[];
  patienceModifier: number;
};

export const ARCHETYPES: PassengerArchetype[] = [
  { id: "office", label: "회사원", emoji: "🧑‍💼", palette: { body: "#5b6780", head: "#e8c9a8", hair: "#2c2a33", accent: "#8f2f4a" }, preferredCues: ["phone_lock", "card_ready", "bag_hug", "uncross_arms", "earphone_wrap"], patienceModifier: 1 },
  { id: "student", label: "대학생", emoji: "🧑‍🎓", palette: { body: "#6d6a58", head: "#eecfae", hair: "#3a2a22", accent: "#4a6b52" }, preferredCues: ["earbuds_case", "phone_lock", "foot_tap", "neck_stretch", "yawn"], patienceModifier: 0.95 },
  { id: "reader", label: "독서가", emoji: "🧑‍📖", palette: { body: "#7a6a7a", head: "#f0d6bb", hair: "#4a3a2e", accent: "#a8763f" }, preferredCues: ["bookmark", "glasses_fix", "window_gaze", "neck_stretch", "route_check"], patienceModifier: 1.1 },
  { id: "traveler", label: "여행객", emoji: "🧳", palette: { body: "#8a6a4a", head: "#f0d8bc", hair: "#2f2620", accent: "#b5762f" }, preferredCues: ["lap_briefcase", "sign_watch", "route_check", "foot_turn", "phone_lock"], patienceModifier: 1.05 },
  { id: "athlete", label: "운동부 학생", emoji: "🎽", palette: { body: "#3f6b62", head: "#eec3a0", hair: "#20242c", accent: "#d9d2b6" }, preferredCues: ["foot_tap", "neck_stretch", "phone_lock", "earbuds_case", "yawn"], patienceModifier: 0.9 },
  { id: "sleeper", label: "졸린 승객", emoji: "😴", palette: { body: "#6a6f7a", head: "#e5c8a5", hair: "#37302c", accent: "#7d8794" }, preferredCues: ["fake_sleep", "yawn", "neck_stretch", "foot_tap", "glasses_fix"], patienceModifier: 1.15 },
  { id: "shopper", label: "장바구니 승객", emoji: "🛍️", palette: { body: "#7c5a5a", head: "#f0cfae", hair: "#3c2f28", accent: "#c0892f" }, preferredCues: ["lunchbag_check", "bag_hug", "foot_turn", "route_check", "yawn"], patienceModifier: 1.05 },
  { id: "umbrella", label: "우산 승객", emoji: "☂️", palette: { body: "#4a5a6b", head: "#ead2b4", hair: "#2b2b30", accent: "#3f7d8c" }, preferredCues: ["umbrella_grab", "coat_button", "bag_hug", "sign_watch", "phone_lock"], patienceModifier: 1 },
  { id: "laptop", label: "노트북 승객", emoji: "💻", palette: { body: "#4f5b6b", head: "#e8c8a6", hair: "#332c28", accent: "#6b8ea8" }, preferredCues: ["phone_lock", "bookmark", "glasses_fix", "call_end", "yawn"], patienceModifier: 1.05 },
  { id: "caller", label: "통화 중 승객", emoji: "📞", palette: { body: "#6b5f6b", head: "#f2d4b6", hair: "#403029", accent: "#a35b5b" }, preferredCues: ["call_end", "phone_lock", "sign_watch", "route_check", "foot_tap"], patienceModifier: 0.95 },
  { id: "elder", label: "노인 승객", emoji: "👵", palette: { body: "#8c8375", head: "#f0d8c0", hair: "#d8d4cc", accent: "#6b7a6b" }, preferredCues: ["glasses_fix", "bag_hug", "foot_turn", "lunchbag_check", "window_gaze"], patienceModifier: 1.2 },
  { id: "musician", label: "이어폰 승객", emoji: "🎵", palette: { body: "#5f5a70", head: "#e8c9ab", hair: "#2a2630", accent: "#8a6fa8" }, preferredCues: ["earphone_wrap", "earbuds_case", "window_gaze", "foot_tap", "phone_lock"], patienceModifier: 1 },
];

export const ARCHETYPE_BY_ID: Record<string, PassengerArchetype> = ARCHETYPES.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<string, PassengerArchetype>,
);

/* ------------------------------------------------------------------ */
/* 경쟁 NPC 6종                                                         */
/* ------------------------------------------------------------------ */
export type RivalNpc = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** 반응 지연(ms) 범위 */
  reactionMs: [number, number];
  /** 정확도: 진짜 하차 승객을 골라 선점할 확률 */
  accuracy: number;
  style: string;
  desc: string;
};

export const RIVAL_NPCS: RivalNpc[] = [
  { id: "sharp_worker", name: "눈치 빠른 회사원", emoji: "🧑‍💼", color: "#7d8fa8", reactionMs: [600, 1000], accuracy: 0.8, style: "균형형", desc: "중간 속도로 정확히 움직임" },
  { id: "ajumma", name: "역전의 아주머니", emoji: "👩", color: "#b06a7a", reactionMs: [380, 620], accuracy: 0.72, style: "공격형", desc: "LATE 구간에서 매우 강함" },
  { id: "sleepy_student", name: "졸린 대학생", emoji: "🧑‍🎓", color: "#8a9070", reactionMs: [500, 1400], accuracy: 0.45, style: "랜덤형", desc: "가끔 기막히게 맞힘" },
  { id: "carrier", name: "캐리어 여행객", emoji: "🧳", color: "#a08a5f", reactionMs: [900, 1500], accuracy: 0.55, style: "방해형", desc: "통로를 막아 이동 시간 증가" },
  { id: "runner", name: "운동부 학생", emoji: "🎽", color: "#5f8f7a", reactionMs: [300, 700], accuracy: 0.65, style: "속도형", desc: "거리가 가까우면 선점 확률 높음" },
  { id: "bookworm", name: "독서광", emoji: "📖", color: "#9a8aa8", reactionMs: [1200, 1800], accuracy: 0.2, style: "무관심형", desc: "경쟁은 안 하지만 가짜 단서 많음" },
];

export const RIVAL_BY_ID: Record<string, RivalNpc> = RIVAL_NPCS.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<string, RivalNpc>,
);

/* ------------------------------------------------------------------ */
/* 스테이지 템플릿 (JSON 추가만으로 확장)                                  */
/* ------------------------------------------------------------------ */
export const StageTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  lineName: z.string(),
  lineColor: z.string(),
  stations: z.array(z.string()).min(1),
  intervalMs: z.number().min(4000),
  doorOpenMs: z.number().min(800),
  crowdLevel: z.enum(["low", "normal", "high", "packed"]),
  seats: z.number().min(4).max(8),
  rivalNpcIds: z.array(z.string()),
  fatigueDrainMultiplier: z.number(),
  glareMultiplier: z.number(),
  exitMin: z.number(),
  exitMax: z.number(),
  cueDurationMs: z.number(),
  trapCueRatio: z.number(),
  decoyStrongCues: z.boolean(),
  tagline: z.string(),
});

export type StageTemplate = z.infer<typeof StageTemplateSchema>;

export const STAGE_TEMPLATES: StageTemplate[] = [
  {
    id: "tutorial",
    title: "눈치 입문 강좌",
    subtitle: "부엉이 선배의 특별 지도",
    difficulty: 1,
    lineName: "1호선 · 눈치 연습선",
    lineColor: "#4a6fa5",
    stations: ["시청", "종각"],
    intervalMs: 28000,
    doorOpenMs: 2600,
    crowdLevel: "low",
    seats: 6,
    rivalNpcIds: [],
    fatigueDrainMultiplier: 0,
    glareMultiplier: 0,
    exitMin: 1,
    exitMax: 1,
    cueDurationMs: 2600,
    trapCueRatio: 0,
    decoyStrongCues: false,
    tagline: "강한 단서만 등장",
  },
  {
    id: "stage01",
    title: "한산한 퇴근 전철",
    subtitle: "아직 자리는 널려 있다",
    difficulty: 1,
    lineName: "1호선",
    lineColor: "#4a6fa5",
    stations: ["시청", "종각", "제물포"],
    intervalMs: 23000,
    doorOpenMs: 2200,
    crowdLevel: "low",
    seats: 6,
    rivalNpcIds: [],
    fatigueDrainMultiplier: 0.8,
    glareMultiplier: 0.8,
    exitMin: 1,
    exitMax: 1,
    cueDurationMs: 2600,
    trapCueRatio: 0,
    decoyStrongCues: false,
    tagline: "강한 단서만 등장",
  },
  {
    id: "stage02",
    title: "살짝 붐비는 2호선",
    subtitle: "기본 관찰 훈련",
    difficulty: 2,
    lineName: "2호선",
    lineColor: "#4f9e72",
    stations: ["을지로", "시청", "충정로", "아현"],
    intervalMs: 21000,
    doorOpenMs: 2200,
    crowdLevel: "normal",
    seats: 8,
    rivalNpcIds: [],
    fatigueDrainMultiplier: 1,
    glareMultiplier: 1,
    exitMin: 1,
    exitMax: 2,
    cueDurationMs: 2200,
    trapCueRatio: 0.15,
    decoyStrongCues: false,
    tagline: "가짜 약한 단서 등장",
  },
  {
    id: "stage03",
    title: "비 오는 저녁",
    subtitle: "우산 단서의 계절",
    difficulty: 2,
    lineName: "3호선",
    lineColor: "#c8843c",
    stations: ["충무로", "약수", "금호", "옥수", "남부터마을"],
    intervalMs: 20000,
    doorOpenMs: 2200,
    crowdLevel: "normal",
    seats: 8,
    rivalNpcIds: [],
    fatigueDrainMultiplier: 1.05,
    glareMultiplier: 1,
    exitMin: 1,
    exitMax: 2,
    cueDurationMs: 2100,
    trapCueRatio: 0.2,
    decoyStrongCues: false,
    tagline: "우산 든 승객 증가",
  },
  {
    id: "stage04",
    title: "금요일 강남행",
    subtitle: "경쟁자의 첫 등장",
    difficulty: 3,
    lineName: "2호선",
    lineColor: "#4f9e72",
    stations: ["교대", "강남", "역삼", "선릉", "삼성"],
    intervalMs: 19000,
    doorOpenMs: 2000,
    crowdLevel: "high",
    seats: 8,
    rivalNpcIds: ["sharp_worker"],
    fatigueDrainMultiplier: 1.1,
    glareMultiplier: 1.1,
    exitMin: 1,
    exitMax: 2,
    cueDurationMs: 1900,
    trapCueRatio: 0.25,
    decoyStrongCues: false,
    tagline: "경쟁 NPC 첫 등장 · LATE 판정 위험",
  },
  {
    id: "stage05",
    title: "야근 후 막차",
    subtitle: "눈은 이미 감긴다",
    difficulty: 3,
    lineName: "4호선",
    lineColor: "#5b7fb5",
    stations: ["삼성", "대치", "학동", "압구정", "한남"],
    intervalMs: 18500,
    doorOpenMs: 2000,
    crowdLevel: "normal",
    seats: 8,
    rivalNpcIds: ["sleepy_student"],
    fatigueDrainMultiplier: 1.3,
    glareMultiplier: 1,
    exitMin: 1,
    exitMax: 2,
    cueDurationMs: 1800,
    trapCueRatio: 0.3,
    decoyStrongCues: false,
    tagline: "피로도 감소 1.3배 · 졸음 행동 증가",
  },
  {
    id: "stage06",
    title: "환승역 직전",
    subtitle: "두 명이 동시에 일어난다",
    difficulty: 3,
    lineName: "5호선",
    lineColor: "#8b6fae",
    stations: ["왕십리", "마장", "답십리", "장한평", "군자"],
    intervalMs: 18000,
    doorOpenMs: 2400,
    crowdLevel: "high",
    seats: 8,
    rivalNpcIds: ["sharp_worker"],
    fatigueDrainMultiplier: 1.1,
    glareMultiplier: 1.15,
    exitMin: 2,
    exitMax: 2,
    cueDurationMs: 1800,
    trapCueRatio: 0.3,
    decoyStrongCues: false,
    tagline: "동시 하차 2명 · 문 앞 혼잡",
  },
  {
    id: "stage07",
    title: "축제 끝난 밤",
    subtitle: "가방과 굿즈의 홍수",
    difficulty: 4,
    lineName: "6호선",
    lineColor: "#b5634f",
    stations: ["삼각지", "녹사평", "이태원", "한강진", "버티고개", "약수"],
    intervalMs: 17500,
    doorOpenMs: 2200,
    crowdLevel: "high",
    seats: 8,
    rivalNpcIds: ["runner", "bookworm"],
    fatigueDrainMultiplier: 1.15,
    glareMultiplier: 1.2,
    exitMin: 2,
    exitMax: 3,
    cueDurationMs: 1600,
    trapCueRatio: 0.4,
    decoyStrongCues: false,
    tagline: "가짜 가방 단서 증가",
  },
  {
    id: "stage08",
    title: "시험 기간 대학가",
    subtitle: "책과 태블릿의 전쟁",
    difficulty: 4,
    lineName: "경의중앙선",
    lineColor: "#6fb3c9",
    stations: ["대학로", "혜화", "한성대", "성신여대", "보문"],
    intervalMs: 17000,
    doorOpenMs: 2000,
    crowdLevel: "normal",
    seats: 8,
    rivalNpcIds: ["sleepy_student", "sharp_worker"],
    fatigueDrainMultiplier: 1.2,
    glareMultiplier: 1.15,
    exitMin: 2,
    exitMax: 3,
    cueDurationMs: 1500,
    trapCueRatio: 0.35,
    decoyStrongCues: false,
    tagline: "책갈피 행동 빈도 증가",
  },
  {
    id: "stage09",
    title: "겨울 출근길",
    subtitle: "코트와 목도리 정리",
    difficulty: 4,
    lineName: "7호선",
    lineColor: "#7a8f5f",
    stations: ["숭실대", "남영", "용산", "이촌", "서빙고"],
    intervalMs: 17000,
    doorOpenMs: 2200,
    crowdLevel: "high",
    seats: 8,
    rivalNpcIds: ["ajumma", "sharp_worker"],
    fatigueDrainMultiplier: 1.2,
    glareMultiplier: 1.2,
    exitMin: 2,
    exitMax: 3,
    cueDurationMs: 1500,
    trapCueRatio: 0.35,
    decoyStrongCues: true,
    tagline: "의상 정리 단서 추가",
  },
  {
    id: "stage10",
    title: "공항철도 구간",
    subtitle: "캐리어가 통로를 막는다",
    difficulty: 5,
    lineName: "공항철도",
    lineColor: "#8ab4d6",
    stations: ["서울역", "공덕", "디지털미디어시티", "김포공항", "계양"],
    intervalMs: 16000,
    doorOpenMs: 2400,
    crowdLevel: "high",
    seats: 8,
    rivalNpcIds: ["carrier", "runner"],
    fatigueDrainMultiplier: 1.25,
    glareMultiplier: 1.25,
    exitMin: 2,
    exitMax: 3,
    cueDurationMs: 1400,
    trapCueRatio: 0.4,
    decoyStrongCues: true,
    tagline: "통로 막힘 증가",
  },
  {
    id: "stage11",
    title: "지옥철 퇴근 피크",
    subtitle: "숨 쉴 공간도 눈치다",
    difficulty: 5,
    lineName: "9호선",
    lineColor: "#c9a13f",
    stations: ["여의도", "샛강", "노량진", "노들", "흑석", "동작"],
    intervalMs: 14500,
    doorOpenMs: 2400,
    crowdLevel: "packed",
    seats: 8,
    rivalNpcIds: ["ajumma", "runner", "carrier"],
    fatigueDrainMultiplier: 1.35,
    glareMultiplier: 1.35,
    exitMin: 2,
    exitMax: 4,
    cueDurationMs: 1200,
    trapCueRatio: 0.45,
    decoyStrongCues: true,
    tagline: "극도 혼잡 · 이동 시간 증가",
  },
  {
    id: "stage12",
    title: "마지막 집 앞 역",
    subtitle: "오늘의 최종전",
    difficulty: 5,
    lineName: "8호선",
    lineColor: "#d98f8f",
    stations: ["잠실", "석촌", "송파", "가락시장", "문정", "장지"],
    intervalMs: 14000,
    doorOpenMs: 2600,
    crowdLevel: "packed",
    seats: 8,
    rivalNpcIds: ["ajumma", "runner", "sharp_worker"],
    fatigueDrainMultiplier: 1.4,
    glareMultiplier: 1.4,
    exitMin: 2,
    exitMax: 4,
    cueDurationMs: 1150,
    trapCueRatio: 0.45,
    decoyStrongCues: true,
    tagline: "단서 복합 · 경쟁 NPC 3명",
  },
];

export function validateTemplates(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const t of STAGE_TEMPLATES) {
    const res = StageTemplateSchema.safeParse(t);
    if (!res.success) {
      errors.push(`${t.id}: ${res.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(", ")}`);
    }
    for (const r of t.rivalNpcIds) {
      if (!RIVAL_BY_ID[r]) errors.push(`${t.id}: 알 수 없는 경쟁 NPC ${r}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export const CROWD_MOVE_PENALTY: Record<CrowdLevel, number> = {
  low: 0,
  normal: 0.03,
  high: 0.15,
  packed: 0.24,
};

export const CROWD_LABEL: Record<CrowdLevel, string> = {
  low: "한산함",
  normal: "보통",
  high: "혼잡",
  packed: "지옥철",
};
