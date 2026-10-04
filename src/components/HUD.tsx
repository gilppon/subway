import { memo } from "react";
import type { Frame } from "../game/types";
import { VERDICT_LABEL } from "../game/core";
import { CUE_BY_TYPE } from "../game/data/cues";
import { CueGlyph, CUE_COLOR } from "./characters";

type Props = {
  frame: Frame;
  caption: string | null;
  subtitles: boolean;
  onScan: () => void;
  onObserve: () => void;
  onMove: (dir: -1 | 1) => void;
  onPause: () => void;
  largeTouch: boolean;
};

const glareColor = (v: number) => (v >= 80 ? "#d64545" : v >= 60 ? "#c25a9b" : v >= 30 ? "#8b5cd6" : "#6f7a85");

function Bar({
  value,
  max,
  color,
  height = "h-2.5",
}: {
  value: number;
  max: number;
  color: string;
  height?: string;
}) {
  return (
    <div className={`w-full ${height} overflow-hidden rounded-full bg-black/40`}>
      <div
        className="h-full rounded-full transition-[width] duration-200 ease-linear"
        style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }}
      />
    </div>
  );
}

export const HUD = memo(function HUD({
  frame,
  caption,
  subtitles,
  onScan,
  onObserve,
  onMove,
  onPause,
  largeTouch,
}: Props) {
  const seconds = Math.ceil(frame.msToNextArrival / 1000);
  const observeTarget = frame.passengers.find((p) => p.id === frame.player.observeTargetId);
  const btn = `flex items-center justify-center rounded-2xl border border-white/15 bg-slate-900/80 text-slate-100 active:scale-95 transition ${
    largeTouch ? "h-16 px-6 text-lg" : "h-12 px-4 text-sm"
  }`;

  return (
    <>
      {/* 상단 바 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3">
        <div className="w-[30%] max-w-[190px] rounded-2xl border border-white/10 bg-slate-950/70 p-2 backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold tracking-wide text-amber-300/90">
            <span>피로도</span>
            <span>{frame.fatigue}</span>
          </div>
          <Bar value={frame.fatigue} max={100} color="#e8913f" />
          {frame.fatigue <= 20 && <div className="mt-1 text-[10px] text-amber-300">눈꺼풀이 내려온다…</div>}
        </div>

        <div className="min-w-[130px] rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-center backdrop-blur-sm">
          <div className="text-[10px] font-semibold tracking-wide text-slate-400">
            {frame.isDoorOpen ? "승하차 중" : "다음 역"}
          </div>
          <div className="text-lg font-bold leading-tight text-slate-100">
            {frame.isDoorOpen ? `${(frame.msToDoorClose / 1000).toFixed(1)}s` : `${seconds}s`}
          </div>
          <div className="text-[11px] text-cyan-300/90">
            {frame.isDoorOpen ? frame.stationName : `${frame.nextStationName} 방면`}
          </div>
          <div className="mt-1 w-full">
            <Bar
              value={frame.isDoorOpen ? frame.msToDoorClose : 1 - frame.msToNextArrival / 20000}
              max={frame.isDoorOpen ? frame.stage.stationEvents[0].doorOpenDurationMs : 1}
              color={frame.isArriving ? "#f2c14e" : "#4fd1e0"}
              height="h-1"
            />
          </div>
        </div>

        <div className="w-[30%] max-w-[190px] rounded-2xl border border-white/10 bg-slate-950/70 p-2 text-right backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold tracking-wide text-cyan-300/90">
            <span>점수</span>
            <span>{frame.score.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-[11px] text-slate-400">연속</span>
            <span className="text-base font-bold text-amber-300">x{frame.combo}</span>
          </div>
          <div className="text-[10px] text-slate-500">
            착석 {frame.stats.seatSuccess} · 예측 {frame.stats.hits}/{Math.max(frame.stats.attempts, frame.stats.hits)}
          </div>
        </div>
      </div>

      {/* 좌측 눈총 게이지 */}
      <div className="pointer-events-none absolute left-1 top-1/2 z-20 -translate-y-1/2 sm:left-2">
        <div className="flex h-40 w-8 flex-col items-center justify-end rounded-full border border-white/10 bg-slate-950/70 p-1 sm:h-56 sm:w-10">
          <div
            className="w-full rounded-full transition-[height] duration-200"
            style={{ height: `${frame.glare}%`, background: glareColor(frame.glare) }}
          />
        </div>
        <div className="mt-1 text-center text-[9px] font-semibold text-violet-300">눈총</div>
        <div className="text-center text-[10px] text-slate-400">{frame.glare}</div>
      </div>

      {/* 토스트 */}
      <div className="pointer-events-none absolute inset-x-0 top-[74px] z-20 flex flex-col items-center gap-1 px-4 sm:top-[92px]">
        {frame.toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium shadow-lg backdrop-blur-sm sm:text-xs ${
              t.tone === "good"
                ? "border-amber-300/40 bg-amber-400/20 text-amber-100"
                : t.tone === "bad"
                  ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                  : t.tone === "warn"
                    ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
                    : "border-white/15 bg-slate-900/70 text-slate-200"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* 고정 관찰 패널 */}
      {observeTarget && (
        <div className="pointer-events-none absolute right-2 top-1/2 z-20 w-[168px] -translate-y-1/2 rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-2 backdrop-blur-sm sm:w-[200px]">
          <div className="mb-1 text-[10px] font-bold tracking-wide text-cyan-300">고정 관찰 중</div>
          <div className="space-y-1">
            {observeTarget.recentCues.length === 0 && (
              <div className="text-[10px] text-slate-500">아직 뚜렷한 단서가 없다</div>
            )}
            {observeTarget.recentCues.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <svg width={14} height={14} viewBox="-12 -12 24 24">
                  <CueGlyph strength={c.strength} size={18} />
                </svg>
                <span className="text-[10px] text-slate-200">{CUE_BY_TYPE[c.type].label}</span>
                <span className="ml-auto text-[9px]" style={{ color: CUE_COLOR[c.strength] }}>
                  {c.strength === "strong" ? "강" : c.strength === "medium" ? "중" : c.strength === "trap" ? "함정" : "약"}
                </span>
              </div>
            ))}
          </div>
          {observeTarget.scanVerdict !== "none" && (
            <div className="mt-1 border-t border-white/10 pt-1 text-[10px] text-cyan-200">
              직감: {VERDICT_LABEL[observeTarget.scanVerdict]}
            </div>
          )}
        </div>
      )}

      {/* 튜토리얼 힌트 */}
      {frame.tutorialHint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center px-3 sm:bottom-3">
          <div className="max-w-md rounded-2xl border border-amber-300/40 bg-amber-950/80 px-3 py-2 text-center text-[11px] font-medium text-amber-100 shadow-xl sm:text-sm">
            <span className="mr-1">🦉</span>
            {frame.tutorialHint}
          </div>
        </div>
      )}

      {/* 자막 */}
      {subtitles && caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[86px] z-30 flex justify-center px-4 sm:bottom-[104px]">
          <div className="rounded-lg bg-black/75 px-3 py-1 text-center text-[11px] text-slate-100 sm:text-sm">{caption}</div>
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 p-2 sm:p-3">
        <button type="button" onClick={onPause} className={`${btn} pointer-events-auto aspect-square !px-0`} aria-label="일시정지">
          ⏸
        </button>

        <div className="pointer-events-none flex flex-col items-center gap-1">
          <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] text-slate-300 backdrop-blur-sm">
            현재 위치 <span className="font-bold text-amber-300">{frame.player.slot}</span>
            {frame.player.isMoving && <span className="ml-1 text-cyan-300">이동 중…</span>}
            {frame.player.seatedSeatId && <span className="ml-1 text-emerald-300">착석 · 휴식</span>}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <button type="button" onClick={() => onMove(-1)} className={`${btn} aspect-square !px-0`} aria-label="왼쪽으로 이동">
              ◀
            </button>
            <button
              type="button"
              onClick={onObserve}
              className={`${btn} ${frame.player.observeTargetId ? "!border-cyan-400/60 !bg-cyan-900/60" : ""}`}
            >
              👁 관찰
            </button>
            <button
              type="button"
              onClick={onScan}
              className={`${btn} min-w-[72px] !border-cyan-400/40 !bg-cyan-900/50 !text-cyan-100 ${
                largeTouch ? "min-w-[88px]" : ""
              }`}
            >
              🔍 스캔
            </button>
            <button type="button" onClick={() => onMove(1)} className={`${btn} aspect-square !px-0`} aria-label="오른쪽으로 이동">
              ▶
            </button>
          </div>
        </div>

        <div className="hidden w-[72px] sm:block" />
      </div>
    </>
  );
});
