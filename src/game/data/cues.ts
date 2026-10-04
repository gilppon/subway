import type { CueStrength, PassengerCueType } from "../types";

export type CueDefinition = {
  type: PassengerCueType;
  label: string;
  strength: CueStrength;
  weight: number;
  /** 관찰 시 보이는 아이콘 형태 (색 이외 판별용) */
  glyph: "dot" | "bang" | "eye" | "wave";
  emoji: string;
  animationKey: string;
  desc: string;
};

/** 승객 행동 단서 24종 — JSON 데이터 기반 (추가만으로 확장 가능) */
export const CUES: CueDefinition[] = [
  { type: "earphone_wrap", label: "이어폰 줄 정리", strength: "medium", weight: 0.22, glyph: "bang", emoji: "🎧", animationKey: "hand_to_ear", desc: "곧 내릴 준비일 수 있음" },
  { type: "earbuds_case", label: "무선 이어폰 케이스 닫기", strength: "medium", weight: 0.2, glyph: "bang", emoji: "🫙", animationKey: "hand_to_ear", desc: "이동 준비 신호" },
  { type: "bag_hug", label: "가방을 가슴에 안기", strength: "strong", weight: 0.38, glyph: "eye", emoji: "💼", animationKey: "bag_up", desc: "자리에서 일어날 준비" },
  { type: "foot_turn", label: "발을 통로 쪽으로 돌리기", strength: "strong", weight: 0.34, glyph: "eye", emoji: "🦶", animationKey: "foot_turn", desc: "하차 방향 정렬" },
  { type: "phone_lock", label: "휴대폰 화면 잠금", strength: "medium", weight: 0.24, glyph: "bang", emoji: "📱", animationKey: "phone_down", desc: "이동 전 정리" },
  { type: "route_check", label: "노선도 확인", strength: "medium", weight: 0.18, glyph: "bang", emoji: "🗺️", animationKey: "look_up", desc: "역 확인 행동" },
  { type: "sign_watch", label: "문 위 전광판 보기", strength: "strong", weight: 0.36, glyph: "eye", emoji: "🖥️", animationKey: "look_up", desc: "다음 역 확인" },
  { type: "card_ready", label: "교통카드 꺼내기", strength: "strong", weight: 0.4, glyph: "eye", emoji: "💳", animationKey: "pocket_reach", desc: "하차 가능성 높음" },
  { type: "lap_briefcase", label: "무릎 위 짐 들기", strength: "strong", weight: 0.36, glyph: "eye", emoji: "🧳", animationKey: "bag_up", desc: "일어나기 직전" },
  { type: "lean_forward", label: "몸을 앞으로 기울이기", strength: "strong", weight: 0.35, glyph: "eye", emoji: "⤴️", animationKey: "lean", desc: "기립 준비" },
  { type: "shuffle_ask", label: "옆 사람에게 비켜달라는 눈짓", strength: "strong", weight: 0.42, glyph: "eye", emoji: "👀", animationKey: "glance_side", desc: "거의 확정" },
  { type: "bookmark", label: "책갈피 꽂기", strength: "medium", weight: 0.22, glyph: "bang", emoji: "🔖", animationKey: "book_close", desc: "독서 종료" },
  { type: "glasses_fix", label: "안경 고쳐 쓰기", strength: "weak", weight: 0.07, glyph: "dot", emoji: "👓", animationKey: "hand_to_face", desc: "단순 습관 가능" },
  { type: "yawn", label: "하품", strength: "weak", weight: 0.06, glyph: "dot", emoji: "🥱", animationKey: "yawn", desc: "피곤함" },
  { type: "foot_tap", label: "발만 바꾸기", strength: "weak", weight: 0.05, glyph: "dot", emoji: "🐾", animationKey: "foot_turn", desc: "가짜 단서 가능" },
  { type: "window_gaze", label: "창밖 보기", strength: "weak", weight: 0.08, glyph: "dot", emoji: "🪟", animationKey: "look_side", desc: "역 확인일 수도 있음" },
  { type: "uncross_arms", label: "팔짱 풀기", strength: "medium", weight: 0.2, glyph: "bang", emoji: "🙌", animationKey: "arms_open", desc: "움직일 준비 가능" },
  { type: "coat_button", label: "코트 단추 잠그기", strength: "strong", weight: 0.34, glyph: "eye", emoji: "🧥", animationKey: "hand_to_chest", desc: "추운 계절 강한 단서" },
  { type: "umbrella_grab", label: "우산 챙기기", strength: "strong", weight: 0.36, glyph: "eye", emoji: "☂️", animationKey: "bag_up", desc: "비 오는 날 강한 단서" },
  { type: "lunchbag_check", label: "도시락 가방 확인", strength: "medium", weight: 0.16, glyph: "bang", emoji: "🍱", animationKey: "bag_up", desc: "상황에 따라 다름" },
  { type: "call_end", label: "통화 종료", strength: "medium", weight: 0.24, glyph: "bang", emoji: "📴", animationKey: "phone_down", desc: "하차 준비 가능" },
  { type: "neck_stretch", label: "목 스트레칭", strength: "weak", weight: 0.06, glyph: "dot", emoji: "🙆", animationKey: "yawn", desc: "가짜 단서" },
  { type: "pick_floor", label: "자리 아래 물건 줍기", strength: "strong", weight: 0.37, glyph: "eye", emoji: "🧹", animationKey: "lean", desc: "일어날 가능성 높음" },
  { type: "fake_sleep", label: "갑자기 다시 잠들기", strength: "trap", weight: 0.04, glyph: "wave", emoji: "💤", animationKey: "sleep", desc: "내릴 것 같지만 안 내림" },
];

export const CUE_BY_TYPE: Record<PassengerCueType, CueDefinition> = CUES.reduce(
  (acc, c) => {
    acc[c.type] = c;
    return acc;
  },
  {} as Record<PassengerCueType, CueDefinition>,
);

export const CUE_WEIGHT: Record<CueStrength, number> = {
  strong: 0.38,
  medium: 0.22,
  weak: 0.07,
  trap: 0.03,
};

/** 단서 조합 규칙: 진짜 하차 승객은 반드시 복합 단서를 보인다 */
export const TRUE_EXIT_CUE_RULE = {
  strong: [1, 2],
  medium: [1, 2],
  weak: [0, 2],
} as const;

export const FALSE_EXIT_CUE_RULE = {
  strong: [0, 1],
  medium: [0, 1],
  weak: [1, 3],
  trap: [0, 1],
} as const;
