import { useEffect, useRef, useState } from "react";
import { FIXED_DELTA_MS } from "./core";
import { GameEngine } from "./engine";
import { audio, type SoundKey } from "./audio";
import type { Frame, StageData } from "./types";
import { useStore } from "./store";

/** 고정 로직 틱(60Hz) + 렌더링 분리 드라이버 */
export function useGameLoop(stage: StageData) {
  const options = useStore((s) => s.save.options);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const captionRef = useRef<(t: string) => void>(() => {});
  captionRef.current = (t: string) => setCaption(t);

  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new GameEngine(
      stage,
      {
        play: (k) => audio.play(k as SoundKey),
        caption: (t) => captionRef.current(t),
      },
      stage.id.length * 104729 + stage.stationEvents.length * 7,
    );
  }
  const engine = engineRef.current;
  engine.reducedMotion = options.reducedMotion;
  engine.screenShakeEnabled = options.screenShake;

  useEffect(() => {
    audio.setVolumes(options.masterVolume, options.sfxVolume, options.bgmVolume);
  }, [options.masterVolume, options.sfxVolume, options.bgmVolume]);

  useEffect(() => {
    audio.unlock();
    audio.startBgm();
    return () => audio.stopBgm();
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastRender = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(180, t - last);
      last = t;
      if (engine.status === "running") {
        acc += dt;
        let steps = 0;
        while (acc >= FIXED_DELTA_MS && steps < 10) {
          engine.tick(FIXED_DELTA_MS);
          acc -= FIXED_DELTA_MS;
          steps += 1;
        }
        if (acc > FIXED_DELTA_MS * 10) acc = 0;
      } else {
        acc = 0;
      }
      // 60Hz 틱 유지 + 30fps 렌더 스로틀 — SVG 60fps 재조정 제거
      if (t - lastRender >= 33 || engine.status !== "running") {
        lastRender = t;
        setFrame(engine.snapshot());
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  useEffect(() => {
    if (!caption) return;
    const id = window.setTimeout(() => setCaption(null), 2400);
    return () => window.clearTimeout(id);
  }, [caption]);

  return { frame, engine, caption, options };
}
