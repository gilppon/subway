import { create } from "zustand";
import type { SaveData, StageData } from "./types";
import { STAGE_TEMPLATES } from "./data/content";

const SAVE_KEY = "subway-owl-seatsaver-v1";

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  unlockedStages: ["stage01"],
  bestScores: {},
  clearedTutorial: false,
  options: {
    reducedMotion: false,
    highContrast: false,
    screenShake: true,
    subtitles: true,
    largeTouchTarget: false,
    oneHanded: false,
    masterVolume: 0.7,
    sfxVolume: 0.8,
    bgmVolume: 0.45,
    inputMode: "auto",
  },
};

function load(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...parsed,
      options: { ...DEFAULT_SAVE.options, ...(parsed.options ?? {}) },
      bestScores: { ...(parsed.bestScores ?? {}) },
      unlockedStages: Array.from(new Set(["stage01", ...(parsed.unlockedStages ?? [])])),
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

function persist(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* 저장 실패는 조용히 무시 (오프라인/사파리 프라이빗 모드) */
  }
}

export type Screen = "title" | "tutorial" | "select" | "play" | "result" | "options" | "howto";

export type ResultSummary = {
  stageId: string;
  stageTitle: string;
  score: number;
  rank: string;
  accuracy: number;
  seatSuccess: number;
  perfects: number;
  wrongPredictions: number;
  maxGlare: number;
  fatigue: number;
  cleared: boolean;
  reason: string | null;
  newUnlock: string | null;
};

type Store = {
  save: SaveData;
  screen: Screen;
  selectedStageId: string;
  result: ResultSummary | null;
  lastStageData: StageData | null;
  setScreen: (s: Screen) => void;
  selectStage: (id: string) => void;
  setOption: <K extends keyof SaveData["options"]>(key: K, value: SaveData["options"][K]) => void;
  finishTutorial: () => void;
  submitResult: (r: Omit<ResultSummary, "newUnlock">) => void;
  clearResult: () => void;
  resetSave: () => void;
};

const initial = load();

export const useStore = create<Store>((set, get) => ({
  save: initial,
  screen: "title",
  selectedStageId: "stage01",
  result: null,
  lastStageData: null,
  setScreen: (screen) => set({ screen }),
  selectStage: (id) => set({ selectedStageId: id }),
  setOption: (key, value) => {
    const save = { ...get().save, options: { ...get().save.options, [key]: value } };
    persist(save);
    set({ save });
  },
  finishTutorial: () => {
    if (get().save.clearedTutorial) {
      set({ screen: "select" });
      return;
    }
    const save: SaveData = {
      ...get().save,
      clearedTutorial: true,
      unlockedStages: Array.from(new Set([...get().save.unlockedStages, "stage01", "stage02"])),
    };
    persist(save);
    set({ save });
  },
  submitResult: (r) => {
    const prev = get().save;
    const best = prev.bestScores[r.stageId] ?? 0;
    const nextBest = { ...prev.bestScores, [r.stageId]: Math.max(best, r.score) };
    const idx = STAGE_TEMPLATES.findIndex((t) => t.id === r.stageId);
    const nextId = idx >= 0 && idx + 1 < STAGE_TEMPLATES.length ? STAGE_TEMPLATES[idx + 1].id : null;
    const newUnlock = r.cleared && nextId && !prev.unlockedStages.includes(nextId) ? nextId : null;
    const unlocked = newUnlock ? Array.from(new Set([...prev.unlockedStages, newUnlock])) : prev.unlockedStages;
    const save: SaveData = { ...prev, bestScores: nextBest, unlockedStages: unlocked };
    persist(save);
    set({ save, result: { ...r, newUnlock }, screen: "result" });
  },
  clearResult: () => set({ result: null }),
  resetSave: () => {
    const fresh = structuredClone(DEFAULT_SAVE);
    persist(fresh);
    set({ save: fresh, result: null });
  },
}));

export function stageTemplateById(id: string) {
  return STAGE_TEMPLATES.find((t) => t.id === id) ?? STAGE_TEMPLATES[1];
}
