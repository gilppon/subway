import { useState } from "react";
import { useStore } from "../game/store";
import { CueGlyph } from "../components/characters";
import { CUES } from "../game/data/cues";
import { JUDGE_WINDOW } from "../game/core";

const PAGES = [
  {
    owl: "😱",
    title: "우리는 자리를 뺏는 게 아니야",
    body: "이미 앉아 있는 승객의 미세한 행동을 읽는 거야. 이어폰을 정리하거나, 가방을 끌어안거나, 문 쪽을 힐끔 보는 사람은 곧 일어날 확률이 높지.",
    cues: ["earphone_wrap", "bag_hug", "sign_watch" as const],
  },
  {
    owl: "👀",
    title: "단서는 등급이 있다",
    body: "작은 점은 그냥 습관일 수 있어. 느낌표는 조금 의심되고, 눈 모양은 강한 단서야. 물결 표시는 함정이니 조심하고.",
    cues: ["foot_tap", "phone_lock", "card_ready", "fake_sleep"],
  },
  {
    owl: "🤫",
    title: "너무 서두르면 눈총을 받아",
    body: `3초에 4칸 이상 움직이면 주변 시선이 따가워. 반대로 내리지 않을 사람 앞에 오래 서 있어도 민망해지지. 완벽한 타이밍은 승객이 일어나기 ${(JUDGE_WINDOW.perfectMax / 1000).toFixed(1)}초 전부터 ${(JUDGE_WINDOW.perfectMin / 1000).toFixed(1)}초 전까지야.`,
    cues: ["sign_watch"],
  },
];

export function TutorialScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const selectStage = useStore((s) => s.selectStage);
  const [page, setPage] = useState(0);
  const p = PAGES[page];
  const last = page === PAGES.length - 1;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-5">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-3xl">
            🦉
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-wide text-amber-300">부엉이 선배</div>
            <div className="text-xs text-slate-400">눈치 튜토리얼 {page + 1} / {PAGES.length}</div>
          </div>
          <div className="ml-auto flex gap-1">
            {PAGES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full ${i <= page ? "bg-amber-400" : "bg-slate-700"}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <h2 className="mb-2 text-base font-bold text-slate-100">
            {p.owl} {p.title}
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">{p.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {p.cues.map((type) => {
              const cue = CUES.find((c) => c.type === type) ?? CUES[0];
              return (
                <div key={type} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 px-2 py-1.5">
                  <svg width={22} height={22} viewBox="-14 -14 28 28">
                    <CueGlyph strength={cue.strength} size={24} />
                  </svg>
                  <div className="leading-tight">
                    <div className="text-[11px] font-semibold text-slate-200">{cue.label}</div>
                    <div className="text-[10px] text-slate-500">{cue.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setScreen("title")}
            className="rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 active:scale-95"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={() => {
              if (last) {
                selectStage("tutorial");
                setScreen("play");
              } else setPage((v) => v + 1);
            }}
            className="flex-1 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-900 active:scale-95"
          >
            {last ? "실습하러 가기 (1개 좌석 예측)" : "다음"}
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-500">
          실습에서는 게임 오버가 없습니다. 실패해도 괜찮아요.
        </p>
      </div>
    </div>
  );
}
