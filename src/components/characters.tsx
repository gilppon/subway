import { memo } from "react";
import type { CueStrength, PassengerPhase, PlayerFSM, ScanVerdict } from "../game/types";

/* ------------------------------------------------------------------ */
/* 단서 아이콘: 색 + 형태로 구분 (색약 대응)                              */
/* ------------------------------------------------------------------ */
export const CUE_COLOR: Record<CueStrength, string> = {
  weak: "#9aa6ad",
  medium: "#f2c14e",
  strong: "#4fd1e0",
  trap: "#b06ad4",
};

export const CueGlyph = memo(function CueGlyph({
  strength,
  size = 22,
  age = 0,
}: {
  strength: CueStrength;
  size?: number;
  age?: number;
}) {
  const pop = age < 0.18 ? 0.4 + (age / 0.18) * 0.6 : 1;
  const fade = age > 0.82 ? Math.max(0, 1 - (age - 0.82) / 0.18) : 1;
  const c = CUE_COLOR[strength];
  const s = size * pop;
  return (
    <g opacity={fade}>
      <circle r={s * 0.62} fill="#10161d" opacity={0.55} />
      {strength === "weak" && <circle r={s * 0.17} fill={c} />}
      {strength === "medium" && (
        <>
          <rect x={-s * 0.09} y={-s * 0.3} width={s * 0.18} height={s * 0.38} rx={s * 0.09} fill={c} />
          <circle cy={s * 0.24} r={s * 0.1} fill={c} />
        </>
      )}
      {strength === "strong" && (
        <>
          <path
            d={`M ${-s * 0.34} 0 Q 0 ${-s * 0.3} ${s * 0.34} 0 Q 0 ${s * 0.3} ${-s * 0.34} 0 Z`}
            fill={c}
            opacity={0.95}
          />
          <circle r={s * 0.12} fill="#10161d" />
        </>
      )}
      {strength === "trap" && (
        <path
          d={`M ${-s * 0.28} 0 q ${s * 0.14} ${-s * 0.24} ${s * 0.28} 0 q ${s * 0.14} ${s * 0.24} ${s * 0.28} 0`}
          fill="none"
          stroke={c}
          strokeWidth={s * 0.13}
          strokeLinecap="round"
        />
      )}
    </g>
  );
});

/* ------------------------------------------------------------------ */
/* 퇴근 부엉이                                                          */
/* ------------------------------------------------------------------ */
type OwlProps = {
  fsm: PlayerFSM;
  facing: 1 | -1;
  x: number;
  sway: number;
  seated?: boolean;
  scanProgress?: number;
  reducedMotion?: boolean;
  highContrast?: boolean;
};

const FEATHER = "#5f4130";
const FEATHER_DARK = "#4a3123";
const DISK = "#e9d6b4";
const TIE = "#7c2f3f";

export const Owl = memo(function Owl({
  fsm,
  facing,
  x,
  sway,
  seated = false,
  scanProgress = 0,
  reducedMotion = false,
  highContrast = false,
}: OwlProps) {
  const scanning = fsm === "Scan";
  const embarrassed = fsm === "Embarrassed";
  const exhausted = fsm === "Exhausted";
  const claiming = fsm === "SeatClaim";
  const moving = fsm === "Move";
  const resting = fsm === "SitSuccess";
  const lid = exhausted ? 0.95 : embarrassed ? 0.8 : scanning || fsm === "ObserveLock" ? 0.02 : resting ? 0.7 : 0.42;
  const squash = exhausted ? 0.5 : resting ? 0.9 : 1;
  const lean = claiming ? 7 : embarrassed ? -4 : 0;
  const bagY = embarrassed ? -34 : moving ? -6 : 0;
  const pupilAngle = scanning ? (reducedMotion ? 0 : scanProgress * 360) : 0;
  const stepPhase = moving ? Math.sin(scanProgress * 6) : 0;
  void stepPhase;

  return (
    <g
      transform={`translate(${x} ${seated ? 300 : 468}) scale(${facing} 1) rotate(${lean}) scale(1 ${squash})`}
      style={{ transition: "transform 90ms linear" }}
    >
      <ellipse cy={4} rx={34} ry={7} fill="#0b1015" opacity={0.35} />
      {/* 다리 */}
      <g fill={FEATHER_DARK}>
        <rect x={-17} y={-26} width={13} height={26} rx={5} transform={moving ? `rotate(${sway * 6} -11 -26)` : undefined} />
        <rect x={4} y={-26} width={13} height={26} rx={5} transform={moving ? `rotate(${-sway * 6} 11 -26)` : undefined} />
        <ellipse cx={-11} cy={-2} rx={11} ry={5} fill="#2b2f3a" />
        <ellipse cx={11} cy={-2} rx={11} ry={5} fill="#2b2f3a" />
      </g>
      {/* 몸통 */}
      <g transform={`translate(0 ${seated ? 0 : 0})`}>
        <ellipse cx={0} cy={-70} rx={40} ry={40} fill={FEATHER} />
        {/* 회색 조끼 */}
        <path d="M -26 -104 Q 0 -96 26 -104 L 30 -56 Q 0 -46 -30 -56 Z" fill="#77808d" />
        {/* 셔츠 + 넥타이 */}
        <path d="M -12 -102 L 0 -88 L 12 -102 L 6 -96 L 0 -74 L -6 -96 Z" fill="#e8e4dc" />
        <path d="M 0 -92 L 6 -86 L 2 -60 L -2 -60 L -6 -86 Z" fill={TIE} />
        <path d="M -40 -78 Q -46 -62 -38 -54" stroke={FEATHER_DARK} strokeWidth={7} fill="none" strokeLinecap="round" />
        <path d="M 40 -78 Q 46 -62 38 -54" stroke={FEATHER_DARK} strokeWidth={7} fill="none" strokeLinecap="round" />
        {/* 서류 가방 */}
        <g transform={`translate(0 ${bagY})`}>
          <rect x={-32} y={-92} width={64} height={44} rx={8} fill={highContrast ? "#1b2740" : "#25324f"} />
          <path d="M -12 -92 q 12 -10 24 0" stroke="#131c2e" strokeWidth={4} fill="none" />
          <rect x={-6} y={-76} width={12} height={7} rx={2} fill="#8b95a6" />
        </g>
      </g>
      {/* 머리 */}
      <g transform={`translate(0 ${embarrassed ? 8 : 0})`}>
        <path d="M -30 -150 L -40 -178 L -14 -160 Z" fill={FEATHER} />
        <path d="M 30 -150 L 40 -178 L 14 -160 Z" fill={FEATHER} />
        <circle cx={0} cy={-134} r={37} fill={FEATHER} />
        <circle cx={0} cy={-131} r={29} fill={DISK} />
        <g>
          <circle cx={-13} cy={-136} r={11.5} fill="#fdfaf4" />
          <circle cx={13} cy={-136} r={11.5} fill="#fdfaf4" />
          <g transform={`rotate(${pupilAngle})`}>
            <circle cx={-13} cy={-136} r={embarrassed ? 4 : 7} fill="#f4c542" />
            <circle cx={13} cy={-136} r={embarrassed ? 4 : 7} fill="#f4c542" />
            <circle cx={-13} cy={-136} r={embarrassed ? 1.8 : 3.2} fill="#161a22" />
            <circle cx={13} cy={-136} r={embarrassed ? 1.8 : 3.2} fill="#161a22" />
          </g>
          {/* 눈꺼풀 */}
          <path
            d={`M -25 ${-147} h 24 v ${11 * lid} h -24 Z`}
            fill={DISK}
            opacity={0.96}
          />
          <path d={`M 1 ${-147} h 24 v ${11 * lid} h -24 Z`} fill={DISK} opacity={0.96} />
          <path
            d={`M -25 ${-147} h 24`}
            stroke="#c9b393"
            strokeWidth={1.6}
            opacity={lid > 0.1 ? 0.9 : 0}
          />
          <path d={`M 1 ${-147} h 24`} stroke="#c9b393" strokeWidth={1.6} opacity={lid > 0.1 ? 0.9 : 0} />
        </g>
        <path d="M 0 -124 L 6 -116 L -6 -116 Z" fill="#e0a53f" />
        {scanning && (
          <g>
            <circle
              cx={0}
              cy={-136}
              r={26}
              fill="none"
              stroke="#4fd1e0"
              strokeWidth={2}
              strokeDasharray="10 8"
              opacity={0.9}
              transform={reducedMotion ? undefined : `rotate(${scanProgress * 540})`}
            />
            {reducedMotion && <circle cx={0} cy={-136} r={26} fill="#4fd1e0" opacity={0.18} />}
          </g>
        )}
      </g>
    </g>
  );
});

/* ------------------------------------------------------------------ */
/* 승객                                                                */
/* ------------------------------------------------------------------ */
type Palette = { body: string; head: string; hair: string; accent: string };

export const PassengerFigure = memo(function PassengerFigure({
  x,
  palette,
  phase,
  pose,
  glow,
  highContrast,
}: {
  x: number;
  palette: Palette;
  phase: PassengerPhase;
  pose: number;
  glow: number;
  highContrast?: boolean;
}) {
  const sway = Math.sin(pose * Math.PI * 2) * 2;
  const walking = phase === "standing" || phase === "exiting" || phase === "boarding";
  const preparing = phase === "preparing";
  const body = highContrast ? "#3a4450" : palette.body;
  const head = highContrast ? "#dfe4e8" : palette.head;
  const hair = highContrast ? "#20262e" : palette.hair;

  if (walking) {
    return (
      <g transform={`translate(${x} 468)`}>
        <ellipse cy={3} rx={26} ry={6} fill="#0b1015" opacity={0.3} />
        <g transform={`rotate(${phase === "exiting" ? 6 : 0})`}>
          <rect x={-13} y={-30} width={11} height={30} rx={5} fill={hair} transform={`rotate(${sway * 3} -8 -30)`} />
          <rect x={2} y={-30} width={11} height={30} rx={5} fill={hair} transform={`rotate(${-sway * 3} 8 -30)`} />
          <ellipse cx={-8} cy={-2} rx={9} ry={4} fill="#22262e" />
          <ellipse cx={8} cy={-2} rx={9} ry={4} fill="#22262e" />
          <rect x={-22} y={-96} width={44} height={70} rx={18} fill={body} />
          <rect x={-30} y={-78} width={12} height={34} rx={6} fill={body} />
          <rect x={18} y={-78} width={12} height={34} rx={6} fill={body} />
          <rect x={-16} y={-72} width={32} height={26} rx={7} fill={palette.accent} />
          <circle cx={0} cy={-118} r={24} fill={head} />
          <path d="M -24 -122 a 24 24 0 0 1 48 0 Z" fill={hair} />
          <circle cx={-8} cy={-118} r={2.6} fill="#2a2f36" />
          <circle cx={8} cy={-118} r={2.6} fill="#2a2f36" />
        </g>
      </g>
    );
  }

  return (
    <g transform={`translate(${x} 0)`}>
      <g transform={`translate(0 ${sway * 0.6}) ${preparing ? "rotate(-3)" : ""}`}>
        {/* 다리 */}
        <rect x={-24} y={268} width={17} height={74} rx={8} fill={hair} />
        <rect x={7} y={268} width={17} height={74} rx={8} fill={hair} />
        <ellipse cx={-15} cy={344} rx={13} ry={6} fill="#22262e" />
        <ellipse cx={16} cy={344} rx={13} ry={6} fill="#22262e" />
        {/* 몸통 */}
        <rect x={-31} y={preparing ? 196 : 202} width={62} height={74} rx={16} fill={body} />
        <rect x={-38} y={214} width={12} height={40} rx={6} fill={body} />
        <rect x={26} y={214} width={12} height={40} rx={6} fill={body} />
        {/* 무릎 위 소지품 */}
        <rect x={-19} y={252} width={38} height={22} rx={7} fill={palette.accent} opacity={0.95} />
        {/* 머리 */}
        <circle cx={0} cy={preparing ? 168 : 174} r={27} fill={head} />
        <path d="M -27 -178 a 27 27 0 0 1 54 0 Z" transform="translate(0 352)" fill={hair} />
        <circle cx={-9} cy={preparing ? 170 : 176} r={2.8} fill="#2a2f36" />
        <circle cx={9} cy={preparing ? 170 : 176} r={2.8} fill="#2a2f36" />
      </g>
      {glow > 0.02 && <circle cx={0} cy={230} r={62} fill="#4fd1e0" opacity={glow * 0.16} />}
    </g>
  );
});

/* ------------------------------------------------------------------ */
/* 경쟁 NPC                                                            */
/* ------------------------------------------------------------------ */
export const RivalFigure = memo(function RivalFigure({
  x,
  color,
  emoji,
  moving,
  highContrast,
}: {
  x: number;
  color: string;
  emoji: string;
  moving: boolean;
  highContrast?: boolean;
}) {
  const c = highContrast ? "#4a5462" : color;
  return (
    <g transform={`translate(${x} 468)`}>
      <ellipse cy={3} rx={24} ry={6} fill="#0b1015" opacity={0.28} />
      <rect x={-12} y={-28} width={10} height={28} rx={5} fill="#2c313a" transform={moving ? "rotate(6 -7 -28)" : undefined} />
      <rect x={2} y={-28} width={10} height={28} rx={5} fill="#2c313a" transform={moving ? "rotate(-6 7 -28)" : undefined} />
      <rect x={-20} y={-92} width={40} height={66} rx={16} fill={c} />
      <rect x={-27} y={-76} width={11} height={32} rx={5} fill={c} />
      <rect x={16} y={-76} width={11} height={32} rx={5} fill={c} />
      <circle cx={0} cy={-114} r={22} fill="#e6cdae" />
      <path d="M -22 -118 a 22 22 0 0 1 44 0 Z" fill="#2f2a26" />
      <circle cx={-7} cy={-114} r={2.4} fill="#2a2f36" />
      <circle cx={7} cy={-114} r={2.4} fill="#2a2f36" />
      <g transform="translate(0 -150)">
        <rect x={-13} y={-13} width={26} height={26} rx={8} fill="#0f151d" opacity={0.75} />
        <text textAnchor="middle" y={7} fontSize={17}>
          {emoji}
        </text>
      </g>
    </g>
  );
});

/* ------------------------------------------------------------------ */
/* 스캔 직감 아이콘                                                     */
/* ------------------------------------------------------------------ */
export function VerdictIcon({ verdict, x, y }: { verdict: ScanVerdict; x: number; y: number }) {
  if (verdict === "none") return null;
  if (verdict === "low")
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle r={13} fill="#20262e" opacity={0.9} />
        <text textAnchor="middle" y={6} fontSize={16} fill="#a9b3bc">
          ?
        </text>
      </g>
    );
  if (verdict === "mid")
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle r={13} fill="#20262e" opacity={0.9} />
        <text textAnchor="middle" y={7} fontSize={17} fill="#f2c14e">
          !
        </text>
      </g>
    );
  if (verdict === "high")
    return (
      <g transform={`translate(${x} ${y})`} opacity={0.95}>
        <circle r={15} fill="#20262e" opacity={0.9} />
        <text textAnchor="middle" y={7} fontSize={19} fill="#f08a3c">
          !
        </text>
      </g>
    );
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={17} fill="#0f151d" opacity={0.92} />
      <circle r={17} fill="none" stroke="#4fd1e0" strokeWidth={2} />
      <path d="M -9 1 Q 0 -8 9 1 Q 0 10 -9 1 Z" fill="#4fd1e0" />
      <circle r={3} fill="#0f151d" />
    </g>
  );
}
