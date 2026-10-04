import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CarScene } from "../components/CarScene";
import { HUD } from "../components/HUD";
import { computeRank, generateStage } from "../game/core";
import { useGameLoop } from "../game/useGameLoop";
import { useStore } from "../game/store";
import type { StageData } from "../game/types";
import type { StageTemplate } from "../game/data/content";
import { audio } from "../game/audio";

export function PlayScreen({
  template,
  isTutorial,
  onExit,
}: {
  template: StageTemplate;
  isTutorial?: boolean;
  onExit: () => void;
}) {
  const [runKey, setRunKey] = useState(0);
  const stage = useMemo<StageData>(
    () => generateStage(template, (Date.now() % 100000) + runKey * 7919 + template.id.length * 31),
    [template, runKey],
  );

  return (
    <GameRun
      key={runKey}
      stage={stage}
      isTutorial={!!isTutorial}
      onRestart={() => setRunKey((k) => k + 1)}
      onExit={onExit}
    />
  );
}

function GameRun({
  stage,
  isTutorial,
  onRestart,
  onExit,
}: {
  stage: StageData;
  isTutorial: boolean;
  onRestart: () => void;
  onExit: () => void;
}) {
  const { frame, engine, caption, options } = useGameLoop(stage);
  const submitResult = useStore((s) => s.submitResult);
  const finishTutorial = useStore((s) => s.finishTutorial);
  const setScreen = useStore((s) => s.setScreen);
  const [paused, setPaused] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const submitted = useRef(false);
  const lastMoveAt = useRef(0);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      if (next) engine.pause();
      else engine.resume();
      audio.play("click");
      return next;
    });
  }, [engine]);

  const doMove = useCallback(
    (dir: -1 | 1) => {
      const now = performance.now();
      if (now - lastMoveAt.current < 150) return;
      lastMoveAt.current = now;
      engine.moveBy(dir);
    },
    [engine],
  );

  const doScan = useCallback(() => engine.scan(), [engine]);
  const doObserve = useCallback(() => engine.toggleObserve(), [engine]);

  /* 키보드 입력 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", " ", "spacebar", "arrowup", "arrowdown"].includes(k)) e.preventDefault();
      if (k === "arrowleft" || k === "a") doMove(-1);
      else if (k === "arrowright" || k === "d") doMove(1);
      else if (k === " " || k === "spacebar") doScan();
      else if (k === "enter") doObserve();
      else if (k === "escape") {
        if (paused) setPaused(false), engine.resume();
        else togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove, doScan, doObserve, togglePause, paused, engine]);

  /* 터치 입력 */
  const touch = useRef<{ x: number; y: number; timer: number | null; moved: boolean } | null>(null);
  const clearTouchTimer = () => {
    if (touch.current?.timer) {
      window.clearTimeout(touch.current.timer);
      touch.current.timer = null;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      clearTouchTimer();
      touch.current = null;
      togglePause();
      return;
    }
    const t = e.touches[0];
    const target = t.target as SVGElement | HTMLElement;
    const isSvg = (target as SVGElement).ownerSVGElement !== undefined || (target as HTMLElement).tagName === "svg";
    if (!isSvg) return;
    touch.current = {
      x: t.clientX,
      y: t.clientY,
      moved: false,
      timer: window.setTimeout(() => {
        doObserve();
        if (touch.current) touch.current.moved = true;
      }, 550),
    };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const st = touch.current;
    if (!st) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - st.x) > 12 || Math.abs(t.clientY - st.y) > 12) {
      st.moved = true;
      clearTouchTimer();
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const st = touch.current;
    clearTouchTimer();
    touch.current = null;
    if (!st || st.moved) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - st.x;
    if (Math.abs(dx) > 40) doMove(dx < 0 ? -1 : 1);
  };

  /* 결과 제출 */
  useEffect(() => {
    if (!frame || submitted.current) return;
    if (frame.status !== "gameover" && frame.status !== "cleared") return;
    submitted.current = true;
    const attempts = Math.max(frame.stats.attempts, frame.stats.hits);
    const accuracy = attempts === 0 ? 0 : frame.stats.hits / attempts;
    const timer = window.setTimeout(() => {
      if (isTutorial) {
        finishTutorial();
        setScreen("select");
        return;
      }
      submitResult({
        stageId: stage.id,
        stageTitle: stage.title,
        score: frame.score,
        rank: computeRank(frame.score, frame.stats.maxGlare, accuracy, frame.status === "cleared"),
        accuracy,
        seatSuccess: frame.stats.seatSuccess,
        perfects: frame.stats.perfects,
        wrongPredictions: frame.stats.wrongPredictions,
        maxGlare: frame.stats.maxGlare,
        fatigue: frame.fatigue,
        cleared: frame.status === "cleared",
        reason: frame.gameOverReason,
      });
    }, isTutorial ? 1200 : 1500);
    return () => window.clearTimeout(timer);
  }, [frame, isTutorial, finishTutorial, submitResult, stage]);

  if (!frame) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-950 text-slate-300">
        객차에 탑승 중…
      </div>
    );
  }

  const accuracy = Math.max(frame.stats.attempts, frame.stats.hits) === 0
    ? 0
    : frame.stats.hits / Math.max(frame.stats.attempts, frame.stats.hits);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 overflow-x-auto overflow-y-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="h-full min-w-[680px]">
          <CarScene
            frame={frame}
            reducedMotion={options.reducedMotion}
            highContrast={options.highContrast}
            largeTouchTarget={options.largeTouchTarget}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onMoveToSlot={(slot) => engine.requestMove(slot)}
            onScanPassenger={(id) => engine.scan(id)}
          />
        </div>
      </div>

      <HUD
        frame={frame}
        caption={caption}
        subtitles={options.subtitles}
        onScan={doScan}
        onObserve={doObserve}
        onMove={doMove}
        onPause={togglePause}
        largeTouch={options.largeTouchTarget}
      />

      {/* 종료 오버레이 */}
      {(frame.status === "cleared" || frame.status === "gameover") && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-slate-950/80 p-6 text-center backdrop-blur-sm">
          <div className="text-2xl font-bold text-amber-300">
            {frame.status === "cleared" ? "목적지 도착!" : "여기서 하차…"}
          </div>
          <div className="text-sm text-slate-300">
            {isTutorial ? "튜토리얼 종료 · 수고했어요" : frame.gameOverReason ?? `${stage.title} 완주`}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
            <span>점수 {frame.score.toLocaleString()}</span>
            <span>착석 {frame.stats.seatSuccess}</span>
            <span>정확도 {(accuracy * 100).toFixed(0)}%</span>
            <span>최고 눈총 {frame.stats.maxGlare}</span>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="mt-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-900 active:scale-95"
          >
            {isTutorial ? "타이틀로" : "노선 선택으로"}
          </button>
        </div>
      )}

      {/* 일시정지 */}
      {paused && frame.status === "running" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur">
          <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl">
            <h2 className="mb-4 text-center text-lg font-bold text-slate-100">일시정지</h2>
            <div className="mb-4 space-y-1 rounded-2xl bg-slate-950/60 p-3 text-[11px] text-slate-400">
              <div>A / ← · D / → : 슬롯 이동</div>
              <div>Space : 스캔 · Enter : 고정 관찰</div>
              <div>좌석 앞 탭 : 이동 · 승객 탭 : 스캔</div>
              <div>두 손가락 탭 : 일시정지</div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={togglePause}
                className="w-full rounded-2xl bg-amber-400 py-3 text-sm font-bold text-slate-900 active:scale-95"
              >
                계속하기
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  onRestart();
                }}
                className="w-full rounded-2xl border border-white/15 bg-slate-800 py-3 text-sm font-semibold text-slate-100 active:scale-95"
              >
                다시 시작
              </button>
              <button
                type="button"
                onClick={() => setScreen("options")}
                className="w-full rounded-2xl border border-white/15 bg-slate-800 py-3 text-sm font-semibold text-slate-100 active:scale-95"
              >
                옵션
              </button>
              <button
                type="button"
                onClick={() => {
                  engine.pause();
                  onExit();
                }}
                className="w-full rounded-2xl border border-white/15 bg-slate-800 py-3 text-sm font-semibold text-slate-100 active:scale-95"
              >
                {isTutorial ? "타이틀로" : "노선 선택으로"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
