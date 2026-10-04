import { memo } from "react";
import type { Frame } from "../game/types";
import { WORLD } from "../game/core";
import { CueGlyph, Owl, PassengerFigure, RivalFigure, VerdictIcon } from "./characters";

type Props = {
  frame: Frame;
  reducedMotion: boolean;
  highContrast: boolean;
  largeTouchTarget: boolean;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onMoveToSlot: (slot: string) => void;
  onScanPassenger: (id: string) => void;
};

const CarSceneBase = ({
  frame,
  reducedMotion,
  highContrast,
  largeTouchTarget,
  hoveredId,
  onHover,
  onMoveToSlot,
  onScanPassenger,
}: Props) => {
  const { stage } = frame;
  const seatIds = frame.seatSlots.map((s) => s.seatId);
  const seatX = (id: string) => frame.seatSlots.find((s) => s.seatId === id)?.x ?? 520;
  const dim = highContrast ? 1 : 0.92;
  const shake = frame.cameraShake;
  const shakeX = shake > 0 ? Math.sin(frame.gameTimeMs / 11) * 3.4 * shake : 0;
  const shakeY = shake > 0 ? Math.cos(frame.gameTimeMs / 7) * 2.4 * shake : 0;
  const zoom = frame.zoomSeatX !== null ? 1.05 : 1;
  const zoomPivot = frame.zoomSeatX ?? WORLD.w / 2;
  const ambient = frame.stage.crowdLevel;
  void ambient;

  const bgA = highContrast ? "#11171d" : "#141b22";
  const carShell = highContrast ? "#2b333c" : "#2c353f";
  const bench = highContrast ? "#39434d" : "#414c57";
  const benchBack = highContrast ? "#333c45" : "#37404a";
  const floorCol = highContrast ? "#2c343d" : "#313943";

  const sway = reducedMotion ? 0 : Math.sin(frame.gameTimeMs / 620);
  const frontXOfSeat = (seatId: string) => {
    const slot = frame.seatSlots.find((s) => s.seatId === seatId)?.frontSlot ?? "C1";
    return frame.slotXs[slot] ?? 520;
  };

  return (
    <svg
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full select-none"
      style={{ background: bgA, touchAction: "pan-y" }}
    >
      <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d2a35" />
          <stop offset="100%" stopColor="#0f171e" />
        </linearGradient>
        <linearGradient id="platform" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9e0e6" />
          <stop offset="100%" stopColor="#9aa6b0" />
        </linearGradient>
        <radialGradient id="lampGrad" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#f6efdc" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f6efdc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="scanMask" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#04141a" stopOpacity="0" />
          <stop offset="55%" stopColor="#04141a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#04141a" stopOpacity="0.62" />
        </radialGradient>
        <radialGradient id="dangerVignette" cx="50%" cy="50%" r="60%">
          <stop offset="60%" stopColor="#c0392b" stopOpacity="0" />
          <stop offset="100%" stopColor="#c0392b" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      <g
        transform={`translate(${shakeX} ${shakeY}) translate(${zoomPivot} 0) scale(${zoom} 1) translate(${-zoomPivot} 0)`}
        opacity={dim}
      >
        {/* 객차 외곽 */}
        <rect x={18} y={26} width={WORLD.w - 36} height={WORLD.h - 52} rx={18} fill={carShell} />
        {/* 천장 */}
        <rect x={18} y={26} width={WORLD.w - 36} height={44} rx={14} fill="#3a434d" />
        {[110, 260, 410, 520, 630, 780, 930].map((x) => (
          <g key={`lamp-${x}`}>
            <rect x={x - 44} y={38} width={88} height={9} rx={4} fill="#f4ecd6" opacity={0.9} />
            <rect x={x - 90} y={36} width={180} height={110} fill="url(#lampGrad)" />
          </g>
        ))}
        {/* 창문 밖 터널 */}
        <rect x={54} y={84} width={WORLD.w - 108} height={106} rx={6} fill="url(#glass)" />
        <g className={frame.isDoorOpen || reducedMotion ? "" : "tunnel-scroll"} opacity={0.5}>
          {Array.from({ length: 26 }, (_, i) => (
            <rect key={`t-${i}`} x={i * 44} y={92 + ((i * 37) % 60)} width={26} height={3} rx={1.5} fill="#5d6f7d" />
          ))}
        </g>
        <rect x={54} y={84} width={WORLD.w - 108} height={106} rx={6} fill="none" stroke="#4b555f" strokeWidth={3} />
        {[248, 520, 792].map((x) => (
          <rect key={`mull-${x}`} x={x - 3} y={84} width={6} height={106} fill="#4b555f" />
        ))}

        {/* 좌석 */}
        <rect x={128} y={190} width={784} height={16} rx={6} fill={benchBack} />
        {seatIds.map((id) => {
          const x = seatX(id);
          const free = !frame.seatSlots.find((s) => s.seatId === id)?.occupied;
          return (
            <g key={`seat-${id}`}>
              <rect x={x - 48} y={198} width={96} height={74} rx={10} fill={benchBack} />
              <rect x={x - 48} y={266} width={96} height={58} rx={12} fill={bench} />
              <rect x={x - 48} y={322} width={96} height={26} rx={8} fill="#2e3741" />
              <rect x={x - 2} y={204} width={4} height={64} rx={2} fill="#2b333c" />
              {free && frame.isDoorOpen && <rect x={x - 44} y={268} width={88} height={52} rx={10} fill="#f2c14e" opacity={0.14} />}
            </g>
          );
        })}

        {/* 바닥 */}
        <rect x={18} y={436} width={WORLD.w - 36} height={WORLD.h - 62} fill={floorCol} />
        <rect x={18} y={436} width={WORLD.w - 36} height={4} fill="#242b33" />
        <rect x={18} y={452} width={WORLD.w - 36} height={2} fill="#3d4650" opacity={0.7} />

        {/* 손잡이 */}
        {[300, 520, 740].map((x) => (
          <g key={`pole-${x}`}>
            <rect x={x - 3} y={68} width={6} height={372} rx={3} fill="#8e99a4" opacity={0.75} />
            {[-40, 0, 40].map((dy) => (
              <g key={`strap-${x}-${dy}`} transform={`translate(${x + dy} 74)`}>
                <rect x={-2} y={0} width={4} height={44} fill="#6f7a85" />
                <circle cx={0} cy={54} r={9} fill="none" stroke="#8e99a4" strokeWidth={4} />
              </g>
            ))}
          </g>
        ))}

        {/* 문 */}
        {(["left", "right"] as const).map((side) => {
          const cx = side === "left" ? 78 : WORLD.w - 78;
          const open = frame.isDoorOpen;
          const slide = open ? 46 : 0;
          return (
            <g key={`door-${side}`}>
              <rect x={cx - 56} y={80} width={112} height={356} fill="url(#platform)" opacity={open ? 1 : 0} />
              {open && <rect x={cx - 56} y={392} width={112} height={10} fill="#f2c14e" />}
              <rect x={cx - 58} y={76} width={116} height={8} rx={3} fill="#4b555f" />
              <g transform={`translate(${-slide} 0)`}>
                <rect x={cx - 56} y={84} width={54} height={352} rx={6} fill="#4d5761" stroke="#39424b" strokeWidth={3} />
                <rect x={cx - 44} y={110} width={30} height={110} rx={4} fill="#22303a" />
              </g>
              <g transform={`translate(${slide} 0)`}>
                <rect x={cx + 2} y={84} width={54} height={352} rx={6} fill="#4d5761" stroke="#39424b" strokeWidth={3} />
                <rect x={cx + 14} y={110} width={30} height={110} rx={4} fill="#22303a" />
              </g>
            </g>
          );
        })}

        {/* 입석 승객(분위기용) */}
        <g opacity={0.92}>
          {frame.ambient.map((a, i) => (
            <PassengerFigure
              key={`amb-${i}`}
              x={a.x}
              palette={a.palette}
              phase="standing"
              pose={a.pose}
              glow={0}
              highContrast={highContrast}
            />
          ))}
        </g>

        {/* 앉아 있는 승객 */}
        {frame.passengers
          .filter((p) => p.phase === "sitting" || p.phase === "preparing")
          .map((p) => (
            <PassengerFigure
              key={p.id}
              x={p.seatX}
              palette={p.palette}
              phase={p.phase}
              pose={p.pose}
              glow={p.glow}
              highContrast={highContrast}
            />
          ))}

        {/* 서 있는 / 걸어가는 승객 */}
        {frame.passengers
          .filter((p) => p.phase === "standing" || p.phase === "exiting" || p.phase === "boarding")
          .map((p) => (
            <PassengerFigure
              key={`w-${p.id}`}
              x={p.x}
              palette={p.palette}
              phase={p.phase}
              pose={p.pose}
              glow={0}
              highContrast={highContrast}
            />
          ))}

        {/* 단서 아이콘 */}
        {frame.cueIcons.map((c) => (
          <g key={c.id} transform={`translate(${c.x} ${c.y})`}>
            <CueGlyph strength={c.strength} age={c.age} size={c.strength === "strong" ? 26 : 21} />
          </g>
        ))}

        {/* 경쟁 NPC */}
        {frame.rivals.map((r) => (
          <RivalFigure
            key={r.id}
            x={r.x}
            color={r.color}
            emoji={r.emoji}
            moving={Math.abs(r.x - frontXOfSeat(r.targetSeatId ?? "")) > 8}
            highContrast={highContrast}
          />
        ))}

        {/* 플레이어 */}
        <Owl
          fsm={frame.player.fsm}
          facing={frame.player.facing}
          x={frame.player.x}
          sway={sway}
          seated={!!frame.player.seatedSeatId}
          scanProgress={frame.player.scanProgress}
          reducedMotion={reducedMotion}
          highContrast={highContrast}
        />
        <g transform={`translate(${frame.player.x} 500)`} opacity={0.85}>
          <path d="M -10 -8 L 0 4 L 10 -8" fill="none" stroke="#f2c14e" strokeWidth={3} strokeLinecap="round" />
        </g>

        {/* 스캔 중 어두운 연출 */}
        {frame.scanRing && (
          <>
            <rect
              x={0}
              y={0}
              width={WORLD.w}
              height={WORLD.h}
              fill="url(#scanMask)"
              style={
                frame.scanRing
                  ? { mixBlendMode: "multiply" as never }
                  : undefined
              }
              opacity={0.75}
            />
            <g transform={`translate(${frame.scanRing.x} ${frame.scanRing.y})`}>
              <circle
                r={40 + frame.scanRing.progress * 46}
                fill="none"
                stroke="#4fd1e0"
                strokeWidth={3}
                opacity={0.9 - frame.scanRing.progress * 0.5}
              />
              <circle r={70} fill="none" stroke="#4fd1e0" strokeWidth={1.5} opacity={0.4} strokeDasharray="6 10" />
            </g>
          </>
        )}

        {/* 하이라이트 링 */}
        {frame.passengers.map((p) => {
          const isHover = hoveredId === p.id;
          const isObs = p.isObserveTarget;
          const isTut = frame.tutorialHighlightSeatId === p.seatId;
          if (!isHover && !isObs && !isTut) return null;
          return (
            <ellipse
              key={`ring-${p.id}`}
              cx={p.seatX}
              cy={238}
              rx={62}
              ry={78}
              fill="none"
              stroke={isTut ? "#f2c14e" : isObs ? "#4fd1e0" : "#e6edf3"}
              strokeWidth={isTut ? 3 : 2}
              strokeDasharray="8 7"
              opacity={isTut ? 0.95 : 0.7}
              className={reducedMotion ? "" : "dash-spin"}
            />
          );
        })}

        {/* 스캔 결과 직감 아이콘 */}
        {frame.passengers
          .filter((p) => p.scanVerdict !== "none")
          .map((p) => (
            <VerdictIcon key={`v-${p.id}`} verdict={p.scanVerdict} x={p.seatX} y={92} />
          ))}

        {/* 판정 팝업 */}
        {frame.popups.map((p) => {
          const x = seatX(p.seatId);
          const age = (frame.gameTimeMs - p.bornAtMs) / 1800;
          const color =
            p.judgement === "PERFECT" ? "#f7d774" : p.judgement === "GOOD" ? "#a9e5a0" : p.judgement === "LATE" ? "#f0a05a" : "#9aa4ad";
          return (
            <g key={`pop-${p.id}`} transform={`translate(${x} ${164 - age * 26})`} opacity={Math.max(0, 1 - age)}>
              <text textAnchor="middle" fontSize={30} fontWeight={800} fill={color} stroke="#0d1218" strokeWidth={1}>
                {p.judgement}
              </text>
              <text textAnchor="middle" y={22} fontSize={16} fill="#dfe6ec">
                {p.text}
              </text>
            </g>
          );
        })}

        {/* 튜토리얼 화살표 */}
        {frame.tutorialHighlightSeatId && frame.tutorialStep === 2 && (
          <g transform={`translate(${seatX(frame.tutorialHighlightSeatId)} 400)`}>
            <path d="M 0 -14 L 12 8 L -12 8 Z" fill="#f2c14e" opacity={0.9} />
          </g>
        )}

        {/* 위험 경고 테두리 */}
        {frame.glare >= 60 && (
          <rect
            x={18}
            y={26}
            width={WORLD.w - 36}
            height={WORLD.h - 52}
            rx={18}
            fill="url(#dangerVignette)"
            className={reducedMotion ? "" : "pulse-warn"}
          />
        )}
        {frame.fatigue <= 20 && (
          <rect x={18} y={26} width={WORLD.w - 36} height={WORLD.h - 52} rx={18} fill="#3b2412" opacity={0.22} />
        )}

        {/* 입력 타깃: 승객(스캔) */}
        {frame.passengers
          .filter((p) => p.phase === "sitting" || p.phase === "preparing")
          .map((p) => (
            <rect
              key={`hit-p-${p.id}`}
              x={p.seatX - 50}
              y={138}
              width={100}
              height={200}
              fill="#000"
              fillOpacity={0}
              pointerEvents="all"
              className="cursor-pointer"
              onMouseEnter={() => onHover(p.id)}
              onMouseLeave={() => onHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                onScanPassenger(p.id);
              }}
            />
          ))}

        {/* 입력 타깃: 좌석 앞(이동) */}
        {frame.seatSlots.map((s) => {
          const w = largeTouchTarget ? 104 : 94;
          return (
            <rect
              key={`hit-s-${s.seatId}`}
              x={s.x - w / 2}
              y={352}
              width={w}
              height={150}
              fill="#000"
              fillOpacity={0}
              pointerEvents="all"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToSlot(s.frontSlot);
              }}
            />
          );
        })}
        {(["DoorL", "DoorR"] as const).map((slot) => {
          const x = slot === "DoorL" ? 78 : WORLD.w - 78;
          return (
            <rect
              key={`hit-${slot}`}
              x={x - 54}
              y={352}
              width={108}
              height={150}
              fill="#000"
              fillOpacity={0}
              pointerEvents="all"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToSlot(slot);
              }}
            />
          );
        })}
        {/* 중앙 통로 */}
        <rect
          x={520 - 46}
          y={352}
          width={92}
          height={150}
          fill="#000"
          fillOpacity={0}
          pointerEvents="all"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onMoveToSlot("C1");
          }}
        />

        {/* 노선 안내 텍스트 */}
        <g opacity={0.9}>
          <rect x={WORLD.w / 2 - 150} y={60} width={300} height={26} rx={13} fill="#0f151d" opacity={0.65} />
          <text
            x={WORLD.w / 2}
            y={78}
            textAnchor="middle"
            fontSize={15}
            fill="#dfe6ec"
            fontWeight={600}
          >{`${stage.lineName} · ${frame.stationIndex + 1}/${stage.stationEvents.length} ${frame.stationName}`}</text>
        </g>
      </g>
    </svg>
  );
};

export const CarScene = memo(CarSceneBase);
