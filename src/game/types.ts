/**
 * 지하철 눈치 세이버 / Subway Seat Tactician
 * 공통 타입 정의 (게임 로직 · 렌더링 분리를 위해 로직은 이 타입만 사용한다)
 */

export type CueStrength = "weak" | "medium" | "strong" | "trap";

export type PassengerCueType =
  | "earphone_wrap"
  | "earbuds_case"
  | "bag_hug"
  | "foot_turn"
  | "phone_lock"
  | "route_check"
  | "sign_watch"
  | "card_ready"
  | "lap_briefcase"
  | "lean_forward"
  | "shuffle_ask"
  | "bookmark"
  | "glasses_fix"
  | "yawn"
  | "foot_tap"
  | "window_gaze"
  | "uncross_arms"
  | "coat_button"
  | "umbrella_grab"
  | "lunchbag_check"
  | "call_end"
  | "neck_stretch"
  | "pick_floor"
  | "fake_sleep";

export type PassengerCue = {
  id: string;
  type: PassengerCueType;
  strength: CueStrength;
  /** 절대 게임 시간(ms) */
  startTimeMs: number;
  durationMs: number;
  animationKey: string;
  soundKey?: string;
};

export type PassengerIntent = {
  willExitAtNextStation: boolean;
  exitStationId?: string;
  confidenceSeed: number;
};

export type PassengerPhase =
  | "sitting"
  | "preparing"
  | "standing"
  | "exiting"
  | "boarding"
  | "gone";

export type PassengerData = {
  id: string;
  seatId: string;
  archetype: string;
  willExitAtNextStation: boolean;
  standUpTimeMs?: number;
  exitDoor: "left" | "right";
  cues: PassengerCue[];
  patienceModifier: number;
};

export type PlayerSlot =
  | "DoorL"
  | "P1"
  | "P2"
  | "P3"
  | "P4"
  | "C1"
  | "P5"
  | "P6"
  | "P7"
  | "P8"
  | "DoorR";

export type CrowdLevel = "low" | "normal" | "high" | "packed";

export type StationEvent = {
  stationId: string;
  stationName: string;
  arrivalTimeMs: number;
  doorOpenDurationMs: number;
  exitingPassengerIds: string[];
  enteringPassengerCount: number;
};

export type StageData = {
  id: string;
  title: string;
  subtitle: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  lineName: string;
  lineColor: string;
  totalDurationMs: number;
  crowdLevel: CrowdLevel;
  seats: number;
  passengers: PassengerData[];
  stationEvents: StationEvent[];
  rivalNpcIds: string[];
  fatigueDrainMultiplier: number;
  glareMultiplier: number;
  /** 추가 스테이지 규칙 */
  rules: {
    cueDurationMs: number;
    trapCueRatio: number;
    decoyStrongCues: boolean;
    tutorial: boolean;
    tagline: string;
  };
};

export type Judgement = "PERFECT" | "GOOD" | "LATE" | "MISS";

export type PlayerFSM =
  | "Idle"
  | "Move"
  | "Scan"
  | "ObserveLock"
  | "SeatClaim"
  | "SitSuccess"
  | "Embarrassed"
  | "Exhausted";

export type ScanVerdict = "none" | "low" | "mid" | "high" | "certain";

export type Toast = {
  id: number;
  text: string;
  tone: "info" | "good" | "bad" | "warn";
  bornAtMs: number;
};

export type JudgementPopup = {
  id: number;
  seatId: string;
  judgement: Judgement;
  text: string;
  bornAtMs: number;
};

export type CueIconView = {
  id: string;
  type: PassengerCueType;
  strength: CueStrength;
  x: number;
  y: number;
  age: number;
  life: number;
  passengerId: string;
};

export type PassengerView = {
  id: string;
  seatId: string;
  seatX: number;
  x: number;
  archetype: string;
  palette: { body: string; head: string; hair: string; accent: string };
  phase: PassengerPhase;
  willExit: boolean;
  standUpTimeMs?: number;
  exitDoor: "left" | "right";
  exitX: number;
  activeCues: PassengerCue[];
  recentCues: PassengerCue[];
  isScanTarget: boolean;
  isObserveTarget: boolean;
  scanVerdict: ScanVerdict;
  scanProgress: number;
  glow: number;
  pose: number;
};

export type RivalNpcRuntime = {
  id: string;
  name: string;
  archetypeId: string;
  color: string;
  x: number;
  targetSeatId: string | null;
  arriveOffsetMs: number;
  accuracy: number;
  emoji: string;
};

export type PlayerRuntime = {
  fsm: PlayerFSM;
  slot: PlayerSlot;
  x: number;
  fromX: number;
  toX: number;
  moveProgress: number;
  moveDurationMs: number;
  facing: -1 | 1;
  isMoving: boolean;
  isScanning: boolean;
  scanProgress: number;
  observeTargetId: string | null;
  seatedSeatId: string | null;
  slotEntryTimeMs: number;
  glare: number;
  fatigue: number;
  score: number;
  combo: number;
  slotsMovedInWindow: number;
};

export type Frame = {
  status: "running" | "paused" | "gameover" | "cleared";
  gameOverReason: string | null;
  gameTimeMs: number;
  stage: StageData;
  passengers: PassengerView[];
  player: PlayerRuntime;
  rivals: RivalNpcRuntime[];
  seatSlots: { seatId: string; x: number; frontSlot: PlayerSlot; occupied: boolean }[];
  slotXs: Record<string, number>;
  stationIndex: number;
  stationName: string;
  nextStationName: string;
  msToNextArrival: number;
  msToDoorClose: number;
  isDoorOpen: boolean;
  isArriving: boolean;
  announcement: string | null;
  toasts: Toast[];
  popups: JudgementPopup[];
  cueIcons: CueIconView[];
  ambient: { x: number; pose: number; palette: { body: string; head: string; hair: string; accent: string } }[];
  scanTargetId: string | null;
  scanRing: { x: number; y: number; progress: number } | null;
  cameraShake: number;
  zoomSeatX: number | null;
  glare: number;
  fatigue: number;
  score: number;
  combo: number;
  tutorialStep: number;
  tutorialHint: string | null;
  tutorialHighlightSeatId: string | null;
  stats: {
    attempts: number;
    hits: number;
    perfects: number;
    wrongPredictions: number;
    seatSuccess: number;
    maxGlare: number;
  };
};

export type SaveData = {
  version: number;
  unlockedStages: string[];
  bestScores: Record<string, number>;
  clearedTutorial: boolean;
  options: {
    reducedMotion: boolean;
    highContrast: boolean;
    screenShake: boolean;
    subtitles: boolean;
    largeTouchTarget: boolean;
    oneHanded: boolean;
    masterVolume: number;
    sfxVolume: number;
    bgmVolume: number;
    inputMode: "keyboard" | "mouse" | "touch" | "auto";
  };
};
