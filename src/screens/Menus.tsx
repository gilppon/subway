import { useState } from "react";
import { CROWD_LABEL, STAGE_TEMPLATES, validateTemplates } from "../game/data/content";
import { useStore } from "../game/store";
import { JUDGE_WINDOW, computeRank } from "../game/core";
import { audio } from "../game/audio";

/* ------------------------------------------------------------------ */
/* 공통                                                                */
/* ------------------------------------------------------------------ */
function Btn({
  children,
  onClick,
  variant = "solid",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "solid" | "ghost" | "line";
  disabled?: boolean;
}) {
  const cls =
    variant === "solid"
      ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
      : variant === "line"
        ? "border border-amber-300/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
        : "border border-white/10 bg-slate-800/80 text-slate-200 hover:bg-slate-700";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        audio.unlock();
        audio.play("click");
        onClick();
      }}
      className={`w-full rounded-2xl px-5 py-3 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

function Shell({ children, title, sub }: { children: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-black tracking-tight text-slate-100 sm:text-2xl">{title}</h1>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 타이틀                                                              */
/* ------------------------------------------------------------------ */
export function TitleScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const save = useStore((s) => s.save);
  const validation = validateTemplates();
  const best = Object.values(save.bestScores).reduce((a, b) => Math.max(a, b), 0);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 py-10">
      <TitleArt />
      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="mb-1 text-[11px] font-semibold tracking-[0.3em] text-cyan-300/80">SUBWAY SEAT TACTICIAN</div>
        <h1 className="mb-1 text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">지하철 눈치 세이버</h1>
        <p className="mb-6 text-xs leading-relaxed text-slate-400">
          뛰지 않는다. 밀지 않는다. 눈치로 선점한다.
          <br />
          퇴근길 부엉이의 조용한 좌석 확보 관찰 게임
        </p>
        <div className="space-y-2.5">
          {!save.clearedTutorial && (
            <Btn variant="line" onClick={() => setScreen("tutorial")}>
              👀 눈치 튜토리얼 (첫 실행 권장)
            </Btn>
          )}
          <Btn onClick={() => setScreen("select")}>{save.clearedTutorial ? "노선 선택" : "시작하기"}</Btn>
          <div className="flex gap-2.5">
            <Btn variant="ghost" onClick={() => setScreen("howto")}>
              조작 방법
            </Btn>
            <Btn variant="ghost" onClick={() => setScreen("options")}>
              옵션
            </Btn>
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-4 text-[11px] text-slate-500">
          <span>최고 점수 {best.toLocaleString()}</span>
          <span>해금 노선 {save.unlockedStages.length - 1}/{STAGE_TEMPLATES.length - 2}</span>
        </div>
        {!validation.ok && (
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-200">
            스테이지 데이터 오류: {validation.errors[0]}
          </p>
        )}
      </div>
    </div>
  );
}

function TitleArt() {
  return (
    <svg viewBox="0 0 400 240" className="absolute inset-x-0 top-6 mx-auto h-48 w-full max-w-md opacity-40" aria-hidden>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b2530" />
          <stop offset="100%" stopColor="#0b1117" />
        </linearGradient>
      </defs>
      <rect x="10" y="20" width="380" height="200" rx="16" fill="url(#tg)" />
      <rect x="10" y="20" width="380" height="26" rx="10" fill="#2c353f" />
      {[70, 140, 210, 280, 340].map((x, i) => (
        <g key={x} className="sway" style={{ animationDelay: `${i * 0.22}s`, transformOrigin: `${x}px 46px` }}>
          <rect x={x - 1.5} y={46} width={3} height={34} fill="#7d8894" />
          <circle cx={x} cy={88} r={7} fill="none" stroke="#8e99a4" strokeWidth={3} />
        </g>
      ))}
      <rect x="30" y="120" width="340" height="14" rx="6" fill="#37404a" />
      <g opacity="0.9">
        <ellipse cx="200" cy="176" rx="26" ry="26" fill="#5f4130" />
        <circle cx="200" cy="152" r="24" fill="#5f4130" />
        <circle cx="200" cy="154" r="19" fill="#e9d6b4" />
        <circle cx="192" cy="152" r="7" fill="#f4c542" />
        <circle cx="208" cy="152" r="7" fill="#f4c542" />
        <circle cx="192" cy="152" r="3" fill="#161a22" />
        <circle cx="208" cy="152" r="3" fill="#161a22" />
        <rect x="176" y="186" width="48" height="30" rx="6" fill="#25324f" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 조작 방법                                                           */
/* ------------------------------------------------------------------ */
export function HowToScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const rows: [string, string][] = [
    ["A / ←", "왼쪽 슬롯 이동"],
    ["D / →", "오른쪽 슬롯 이동"],
    ["Space", "가까운 승객 스캔"],
    ["Enter", "의심 승객 고정 관찰"],
    ["Esc", "일시정지"],
    ["승객 클릭 / 탭", "해당 승객 스캔"],
    ["좌석 아래 클릭 / 탭", "해당 좌석 앞으로 이동"],
    ["좌우 스와이프", "인접 슬롯 이동"],
    ["길게 누르기", "고정 관찰"],
    ["두 손가락 탭", "일시정지"],
  ];
  return (
    <Shell title="조작 방법" sub="키보드 · 마우스 · 터치 모두 지원">
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 rounded-2xl bg-slate-950/60 px-3 py-2">
              <span className="min-w-[104px] rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-center text-[11px] font-bold text-amber-200">
                {k}
              </span>
              <span className="text-xs text-slate-300">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-slate-400">
          <p>· 판정: 승객이 일어나기 {(JUDGE_WINDOW.perfectMax / 1000).toFixed(1)}초 전 ~ {(JUDGE_WINDOW.perfectMin / 1000).toFixed(1)}초 전 도착 = PERFECT, {(JUDGE_WINDOW.perfectMin / 1000).toFixed(1)}초 전 ~ {(JUDGE_WINDOW.goodMin / 1000).toFixed(1)}초 전 = GOOD, 그 이후 = LATE.</p>
          <p>· 눈총이 90 이상이면 앉을 수 없습니다. 100이면 게임 오버.</p>
          <p>· 피로도는 계속 떨어집니다. 착석 성공으로만 회복됩니다.</p>
        </div>
      </div>
      <div className="mt-4">
        <Btn onClick={() => setScreen("title")}>타이틀로</Btn>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* 노선 선택                                                           */
/* ------------------------------------------------------------------ */
export function StageSelectScreen() {
  const save = useStore((s) => s.save);
  const setScreen = useStore((s) => s.setScreen);
  const selectStage = useStore((s) => s.selectStage);
  const cleared = save.clearedTutorial;
  const stages = STAGE_TEMPLATES.filter((t) => t.id !== "tutorial");

  return (
    <Shell title="노선 선택" sub={`해금 ${save.unlockedStages.length - 1} / ${stages.length}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {stages.map((t) => {
          const unlocked = save.unlockedStages.includes(t.id) || (t.id === "stage01" && cleared);
          const best = save.bestScores[t.id] ?? 0;
          const est = Math.round((t.stations.length * t.intervalMs + t.stations.length * t.doorOpenMs) / 1000);
          const diffLabel = ["", "쉬움", "보통", "어려움", "매우 어려움", "지옥철"][t.difficulty];
          return (
            <button
              key={t.id}
              type="button"
              disabled={!unlocked}
              onClick={() => {
                audio.unlock();
                audio.play("click");
                selectStage(t.id);
                setScreen("play");
              }}
              className={`relative overflow-hidden rounded-3xl border p-4 text-left transition active:scale-[0.99] ${
                unlocked
                  ? "border-white/10 bg-slate-900/70 hover:border-amber-300/40 hover:bg-slate-800/70"
                  : "border-white/5 bg-slate-950/60 opacity-60"
              }`}
            >
              <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.lineColor }} />
              <div className="flex items-start justify-between gap-2 pl-2">
                <div>
                  <div className="text-[10px] font-semibold tracking-wide" style={{ color: t.lineColor }}>
                    {t.lineName}
                  </div>
                  <div className="text-base font-bold text-slate-100">{t.title}</div>
                  <div className="text-[11px] text-slate-400">{t.subtitle}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">난이도</div>
                  <div className="text-xs font-bold text-amber-300">{diffLabel}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 pl-2 text-center text-[10px] text-slate-400">
                <div className="rounded-lg bg-slate-950/60 py-1">
                  <div className="text-slate-500">혼잡도</div>
                  <div className="font-semibold text-slate-200">{CROWD_LABEL[t.crowdLevel]}</div>
                </div>
                <div className="rounded-lg bg-slate-950/60 py-1">
                  <div className="text-slate-500">역 수</div>
                  <div className="font-semibold text-slate-200">{t.stations.length}</div>
                </div>
                <div className="rounded-lg bg-slate-950/60 py-1">
                  <div className="text-slate-500">예상 시간</div>
                  <div className="font-semibold text-slate-200">{est}초</div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between pl-2 text-[11px]">
                <span className="text-slate-500">{t.tagline}</span>
                <span className="font-semibold text-cyan-300">
                  {best > 0 ? `${best.toLocaleString()}점 · ${computeRank(best, 0, 1, true)}` : "미주행"}
                </span>
              </div>
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-xs font-semibold text-slate-300">
                  🔒 이전 노선 클리어 필요
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <Btn variant="ghost" onClick={() => setScreen("tutorial")}>
          튜토리얼 다시 보기
        </Btn>
        <Btn variant="ghost" onClick={() => setScreen("title")}>
          타이틀
        </Btn>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* 결과                                                                */
/* ------------------------------------------------------------------ */
const RANK_STYLE: Record<string, string> = {
  S: "from-amber-300 to-amber-500 text-slate-900",
  A: "from-cyan-300 to-cyan-500 text-slate-900",
  B: "from-emerald-300 to-emerald-500 text-slate-900",
  C: "from-slate-300 to-slate-400 text-slate-900",
  D: "from-slate-400 to-slate-500 text-slate-900",
  F: "from-rose-400 to-rose-600 text-white",
};

export function ResultScreen() {
  const result = useStore((s) => s.result);
  const setScreen = useStore((s) => s.setScreen);
  const selectStage = useStore((s) => s.selectStage);
  const [shared, setShared] = useState(false);
  if (!result) {
    return (
      <Shell title="결과">
        <Btn onClick={() => setScreen("select")}>노선 선택으로</Btn>
      </Shell>
    );
  }
  const shareText =
    `[눈치세이버] ${result.rank}랭크 · ${result.score.toLocaleString()}점 · ` +
    `정확도 ${(result.accuracy * 100).toFixed(0)}% · ${result.stageTitle} #눈치세이버`;
  const share = () => {
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
    if (typeof nav.share === "function") {
      nav.share({ title: "눈치세이버", text: shareText }).catch(() => { /* dismissed */ });
      return;
    }
    navigator.clipboard?.writeText(shareText).then(() => {
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    }).catch(() => { /* noop */ });
  };
  const rows: [string, string][] = [
    ["예측 정확도", `${(result.accuracy * 100).toFixed(0)}%`],
    ["착석 성공", `${result.seatSuccess}회`],
    ["PERFECT", `${result.perfects}회`],
    ["틀린 예측", `${result.wrongPredictions}회`],
    ["눈총 최고치", `${result.maxGlare}`],
    ["피로도 잔량", `${result.fatigue}`],
  ];
  return (
    <Shell
      title={result.cleared ? "무사히 도착했습니다" : "여기서 하차합니다"}
      sub={`${result.stageTitle} · ${result.score.toLocaleString()}점`}
    >
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
        <div className="mb-5 flex items-center justify-center gap-5">
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br text-5xl font-black shadow-xl ${
              RANK_STYLE[result.rank] ?? RANK_STYLE.C
            }`}
          >
            {result.rank}
          </div>
          <div>
            <div className="text-[11px] text-slate-400">최종 점수</div>
            <div className="text-3xl font-black text-slate-100">{result.score.toLocaleString()}</div>
            {!result.cleared && result.reason && (
              <div className="mt-1 max-w-[180px] text-[11px] text-rose-300">{result.reason}</div>
            )}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-2xl bg-slate-950/60 px-4 py-2.5">
              <span className="text-xs text-slate-400">{k}</span>
              <span className="text-sm font-bold text-slate-100">{v}</span>
            </div>
          ))}
        </div>
        {result.newUnlock && (
          <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3 text-center text-xs font-semibold text-amber-200">
            🔓 새 노선 해금! 다음 구간을 이용할 수 있습니다.
          </div>
        )}
        <div className="mt-5 space-y-2">
          <Btn
            onClick={() => {
              selectStage(result.stageId);
              setScreen("play");
            }}
          >
            한 번 더 타기
          </Btn>
          <Btn variant="ghost" onClick={share}>
            {shared ? "복사됨!" : "기록 공유하기"}
          </Btn>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setScreen("select")}>
              노선 선택
            </Btn>
            <Btn variant="ghost" onClick={() => setScreen("title")}>
              타이틀
            </Btn>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* 옵션                                                                */
/* ------------------------------------------------------------------ */
export function OptionsScreen() {
  const setScreen = useStore((s) => s.setScreen);
  return (
    <Shell title="옵션" sub="접근성 · 사운드 · 저장">
      <OptionsPanel onBack={() => setScreen("title")} />
    </Shell>
  );
}

export function OptionsPanel({ onBack }: { onBack: () => void }) {
  const save = useStore((s) => s.save);
  const setOption = useStore((s) => s.setOption);
  const resetSave = useStore((s) => s.resetSave);
  const o = save.options;

  const Toggle = ({
    label,
    desc,
    value,
    onToggle,
  }: {
    label: string;
    desc: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        audio.play("click");
        onToggle();
      }}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-950/60 px-4 py-3 text-left transition hover:bg-slate-900"
    >
      <span>
        <span className="block text-xs font-bold text-slate-100">{label}</span>
        <span className="block text-[10px] text-slate-500">{desc}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-amber-400" : "bg-slate-700"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${value ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );

  const Slider = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <div className="rounded-2xl bg-slate-950/60 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-100">
        <span>{label}</span>
        <span className="text-slate-400">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-400"
      />
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        <Toggle
          label="모션 감소"
          desc="눈동자 회전 · 줌 · 흔들림 · 파티클을 줄입니다"
          value={o.reducedMotion}
          onToggle={() => setOption("reducedMotion", !o.reducedMotion)}
        />
        <Toggle
          label="고대비 모드"
          desc="승객과 객차를 높은 대비 색으로 표시합니다"
          value={o.highContrast}
          onToggle={() => setOption("highContrast", !o.highContrast)}
        />
        <Toggle
          label="화면 흔들림"
          desc="판정 순간의 카메라 흔들림을 끕니다"
          value={o.screenShake}
          onToggle={() => setOption("screenShake", !o.screenShake)}
        />
        <Toggle
          label="자막 표시"
          desc="역 안내와 효과음 상황을 글자로 보여줍니다"
          value={o.subtitles}
          onToggle={() => setOption("subtitles", !o.subtitles)}
        />
        <Toggle
          label="터치 타깃 확대"
          desc="모바일 버튼과 이동 영역을 크게 만듭니다"
          value={o.largeTouchTarget}
          onToggle={() => setOption("largeTouchTarget", !o.largeTouchTarget)}
        />
        <Toggle
          label="한 손 조작 모드"
          desc="하단 컨트롤을 한쪽으로 모읍니다"
          value={o.oneHanded}
          onToggle={() => setOption("oneHanded", !o.oneHanded)}
        />
        <Slider label="전체 음량" value={o.masterVolume} onChange={(v) => setOption("masterVolume", v)} />
        <Slider label="효과음" value={o.sfxVolume} onChange={(v) => setOption("sfxVolume", v)} />
        <Slider label="배경 주행음" value={o.bgmVolume} onChange={(v) => setOption("bgmVolume", v)} />
        <div className="rounded-2xl bg-slate-950/60 px-4 py-3">
          <div className="mb-2 text-xs font-bold text-slate-100">입력 방식</div>
          <div className="flex gap-2">
            {(["auto", "keyboard", "mouse", "touch"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  audio.play("click");
                  setOption("inputMode", m);
                }}
                className={`flex-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${
                  o.inputMode === m
                    ? "border-amber-300/60 bg-amber-400/20 text-amber-200"
                    : "border-white/10 bg-slate-900 text-slate-300"
                }`}
              >
                {m === "auto" ? "자동" : m === "keyboard" ? "키보드" : m === "mouse" ? "마우스" : "터치"}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("최고 점수와 옵션을 모두 초기화합니다. 계속할까요?")) resetSave();
          }}
          className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-200 transition hover:bg-rose-500/20"
        >
          저장 데이터 초기화
        </button>
      </div>
      <div className="mt-4">
        <Btn onClick={onBack}>돌아가기</Btn>
      </div>
    </>
  );
}
