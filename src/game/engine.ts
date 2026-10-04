import type {
  Frame,
  Judgement,
  JudgementPopup,
  PassengerCue,
  PassengerData,
  PassengerPhase,
  PlayerFSM,
  PlayerSlot,
  RivalNpcRuntime,
  ScanVerdict,
  StageData,
  Toast,
} from "./types";
import {
  GLARE_RULES,
  MOVE,
  SCAN,
  SCORE_TABLE,
  STANDUP_LEAD_MS,
  WORLD,
  ambientCount,
  buildLayout,
  buildPassengersForRound,
  clampFatigue,
  clampGlare,
  createRng,
  crowdMoveMs,
  estimateExitChance,
  judgeSeatClaim,
  planCues,
  seatClaimScore,
  slotDistance,
  verdictFromChance,
  type Layout,
  type Rng,
} from "./core";
import { ARCHETYPE_BY_ID, RIVAL_BY_ID } from "./data/content";

const quant = (v: number) => Math.round(v * 10) / 10;

export type EngineCallbacks = {
  play: (key: string) => void;
  caption: (text: string) => void;
};

type RtPassenger = PassengerData & {
  phase: PassengerPhase;
  x: number;
  claimResolved: boolean;
  scanVerdict: ScanVerdict;
  scanCues: PassengerCue[];
  scanAtMs: number;
  glow: number;
  poseSeed: number;
};

type RtRival = {
  npcId: string;
  name: string;
  emoji: string;
  color: string;
  x: number;
  fromX: number;
  toX: number;
  moveStartMs: number;
  moveDurationMs: number;
  targetSeatId: string;
  arriveAtMs: number;
  accuracy: number;
  seated: boolean;
};

const CUE_TAIL_MS = 340;

export class GameEngine {
  readonly stage: StageData;
  readonly layout: Layout;
  private rng: Rng;
  private cb: EngineCallbacks;
  reducedMotion = false;
  screenShakeEnabled = true;

  gameTimeMs = 0;
  status: Frame["status"] = "running";
  gameOverReason: string | null = null;

  private phase: "running" | "doorOpen" | "done" = "running";
  private stationIndex = 0;
  private isDoorOpen = false;
  private doorCloseAtMs = 0;
  private roundStartMs = 0;
  private nextStandUpMs = 0;
  private nextArrivalMs = 0;
  private yieldAtMs = 0;

  private passengers: RtPassenger[] = [];
  private rivals: RtRival[] = [];
  private rivalQueue: string[] = [];
  private ambient: { x: number; arch: string; seed: number }[] = [];

  private fsm: PlayerFSM = "Idle";
  private slot: PlayerSlot | string = "C1";
  private x = 520;
  private fromX = 520;
  private toX = 520;
  private moveProgress = 1;
  private moveDurationMs = 1;
  private facing: -1 | 1 = 1;
  private slotEntryTimeMs = 0;
  private scanUntilMs = 0;
  private scanCooldownUntilMs = 0;
  private scanTargetId: string | null = null;
  private observeTargetId: string | null = null;
  private seatedSeatId: string | null = null;

  private presence: { seatId: string; sinceMs: number } | null = null;
  private bestArrival: Record<string, number> = {};
  private wrongStandMs = 0;
  private idleMs = 0;
  private attemptCounted = false;

  glare = 0;
  fatigue = 100;
  score = 0;
  combo = 0;

  private stats = {
    attempts: 0,
    hits: 0,
    perfects: 0,
    wrongPredictions: 0,
    seatSuccess: 0,
    maxGlare: 0,
  };

  private toasts: Toast[] = [];
  private popups: JudgementPopup[] = [];
  private recentMoves: { t: number; slots: number }[] = [];
  private scanTimes: number[] = [];
  private reliefMs = 0;
  private announcement: string | null = null;
  private announcementUntilMs = 0;
  private cameraShake = 0;
  private zoomSeatX: number | null = null;
  private zoomUntilMs = 0;
  private glareHighCharged = false;
  private doorBlockCharged = false;
  private tutorialStep = 0;
  private uid = 1;

  constructor(stage: StageData, cb: EngineCallbacks, seed = Date.now()) {
    this.stage = stage;
    this.layout = buildLayout(stage.seats);
    this.rng = createRng(seed ^ (stage.id.length * 7919));
    this.cb = cb;
    this.roundStartMs = 600;
    this.nextArrivalMs = stage.stationEvents[0].arrivalTimeMs;
    this.nextStandUpMs = this.nextArrivalMs - STANDUP_LEAD_MS;
    this.passengers = stage.passengers.map((p) => this.toRuntime(p));
    this.rivalQueue = [...stage.rivalNpcIds];
    this.setupAmbient();
    this.spawnRivals();
    this.toast(
      stage.rules.tutorial ? "부엉이 선배: 침착하게. 단서를 읽는 거야." : `${stage.lineName} · 다음 역 ${stage.stationEvents[0].stationName}`,
      "info",
    );
  }

  private toRuntime(p: PassengerData): RtPassenger {
    return {
      ...p,
      phase: "sitting",
      x: this.layout.seatXs[p.seatId],
      claimResolved: false,
      scanVerdict: "none",
      scanCues: [],
      scanAtMs: -9999,
      glow: 0,
      poseSeed: this.rng.next() * 4,
    };
  }

  private setupAmbient() {
    const count = ambientCount(this.stage.crowdLevel);
    const seats = this.layout.seatIds;
    this.ambient = Array.from({ length: count }, (_, i) => {
      const base = 130 + (i * 780) / Math.max(1, count - 1);
      const x = Math.max(110, Math.min(WORLD.w - 110, base + this.rng.range(-26, 26)));
      const near = seats.find((s) => Math.abs(this.layout.seatXs[s] - x) < 46);
      void near;
      return { x, arch: this.rng.pick(Object.keys(ARCHETYPE_BY_ID)), seed: this.rng.next() * 6 };
    });
  }

  /* ---------------------------------------------------------------- */
  /* 입력                                                              */
  /* ---------------------------------------------------------------- */
  moveBy(dir: -1 | 1) {
    const idx = this.layout.slots.indexOf(this.slot);
    const next = this.layout.slots[Math.max(0, Math.min(this.layout.slots.length - 1, idx + dir))];
    if (next !== this.slot) this.requestMove(next);
    else this.facing = dir;
  }

  requestMove(slot: string) {
    if (this.status !== "running") return;
    if (this.phase !== "running") return;
    if (this.seatedSeatId) return;
    if (this.fsm === "Embarrassed" || this.fsm === "Exhausted") return;
    const dist = slotDistance(this.slot, slot, this.layout);
    if (dist <= 0) return;
    const perSlot = crowdMoveMs(this.stage.crowdLevel, this.rivals.length);
    const duration = Math.min(2400, perSlot * dist);
    this.fromX = this.x;
    this.toX = this.layout.slotXs[slot] ?? this.x;
    this.moveProgress = 0;
    this.moveDurationMs = duration;
    this.slot = slot;
    this.facing = this.toX >= this.fromX ? 1 : -1;
    this.fsm = "Move";
    this.observeTargetId = null;
    this.fatigue = clampFatigue(this.fatigue - 1 * dist);
    this.recentMoves.push({ t: this.gameTimeMs, slots: dist });
    this.recentMoves = this.recentMoves.filter((m) => this.gameTimeMs - m.t <= MOVE.windowMs);
    const total = this.recentMoves.reduce((s, m) => s + m.slots, 0);
    if (total >= MOVE.rushSlots) {
      this.addGlare(GLARE_RULES.rush6, "급이동 · 주변 시선이 따갑다");
      this.fatigue = clampFatigue(this.fatigue - 5);
      this.cb.play("glare");
    } else if (total >= 4) {
      this.addGlare(GLARE_RULES.rush4, "조금 빠른데? 눈총 +8");
      this.cb.play("glare");
    }
    this.cb.play("step");
    this.checkExhausted();
  }

  scan(passengerId?: string) {
    if (this.status !== "running" || this.phase !== "running") return;
    if (this.seatedSeatId) return;
    if (this.gameTimeMs < this.scanCooldownUntilMs) {
      this.toast("아직 눈이 아파요…", "warn");
      return;
    }
    if (this.fsm === "Scan") return;
    const target = passengerId ? this.passengers.find((p) => p.id === passengerId) : this.autoTarget();
    if (!target || target.phase !== "sitting") {
      this.toast("가까이 가서 봐야 할 것 같다", "warn");
      return;
    }
    this.scanTargetId = target.id;
    this.scanUntilMs = this.gameTimeMs + SCAN.durationMs;
    this.scanCooldownUntilMs = this.scanUntilMs + SCAN.cooldownMs;
    this.fsm = "Scan";
    this.cb.play("scan_start");
    this.scanTimes.push(this.gameTimeMs);
    this.scanTimes = this.scanTimes.filter((t) => this.gameTimeMs - t <= 3500);
    if (this.scanTimes.length >= SCAN.rapidCount) {
      this.addGlare(SCAN.rapidGlare, "너무 오래 쳐다봤다 · 눈총 +5");
      this.scanTimes = [];
    }
  }

  toggleObserve(passengerId?: string) {
    if (this.status !== "running" || this.seatedSeatId) return;
    if (this.observeTargetId) {
      this.observeTargetId = null;
      if (this.fsm === "ObserveLock") this.fsm = "Idle";
      return;
    }
    const target = passengerId ? this.passengers.find((p) => p.id === passengerId) : this.autoTarget();
    if (!target || target.phase !== "sitting") {
      this.toast("관찰할 승객이 근처에 없다", "warn");
      return;
    }
    this.observeTargetId = target.id;
    this.fsm = "ObserveLock";
    this.toast("고정 관찰 시작 · 단서 기록 표시", "info");
  }

  pause() {
    if (this.status === "running") this.status = "paused";
  }
  resume() {
    if (this.status === "paused") this.status = "running";
  }

  private autoTarget(): RtPassenger | null {
    let best: RtPassenger | null = null;
    let bestD = Infinity;
    for (const p of this.passengers) {
      if (p.phase !== "sitting") continue;
      const d = Math.abs(p.x - this.x);
      if (d <= SCAN.rangePx && d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  /* ---------------------------------------------------------------- */
  /* 고정 로직 틱                                                       */
  /* ---------------------------------------------------------------- */
  tick(dtMs: number) {
    if (this.status !== "running") return;
    this.gameTimeMs += dtMs;
    this.updateAnnouncement();
    this.updatePlayer(dtMs);
    this.updatePresence();
    this.updatePassengers(dtMs);
    this.updateRivals(dtMs);
    this.updateObservation(dtMs);
    this.updateGlareRelief(dtMs);
    this.updateFatigue(dtMs);
    this.updateTimeline();
    this.updateTutorial();
    this.updateFx(dtMs);
    this.stats.maxGlare = Math.max(this.stats.maxGlare, this.glare);
    if (this.glare >= 100) this.fail("눈총 게이지 100 · 객차 분위기 얼어붙음");
    if (this.fatigue <= 0) this.fail("피로도 0 · 부엉이가 바닥에 축 늘어짐");
  }

  private fail(reason: string) {
    if (this.status !== "running") return;
    if (this.stage.rules.tutorial) {
      this.glare = Math.min(this.glare, 99);
      this.fatigue = Math.max(this.fatigue, 25);
      return;
    }
    this.status = "gameover";
    this.gameOverReason = reason;
    this.fsm = "Exhausted";
    this.cb.caption(reason);
    this.cb.play("gameover");
  }

  private updateAnnouncement() {
    const remain = this.nextArrivalMs - this.gameTimeMs;
    if (remain <= 5200 && remain > 4900 && this.phase === "running") {
      const st = this.stage.stationEvents[this.stationIndex];
      this.announcement = `다음 역은 ${st.stationName} · 내리실 문은 ${
        this.passengers.some((p) => p.willExitAtNextStation && p.exitDoor === "left") ? "왼쪽" : "오른쪽"
      }입니다`;
      this.announcementUntilMs = this.gameTimeMs + 3400;
      this.cb.caption(this.announcement);
      this.cb.play("announce");
    }
    if (this.announcement && this.gameTimeMs > this.announcementUntilMs) this.announcement = null;
  }

  private updatePlayer(dt: number) {
    if (this.fsm === "Move") {
      this.moveProgress = Math.min(1, this.moveProgress + dt / this.moveDurationMs);
      const e = this.moveProgress < 0.5 ? 2 * this.moveProgress ** 2 : 1 - (-2 * this.moveProgress + 2) ** 2 / 2;
      this.x = this.fromX + (this.toX - this.fromX) * e;
      if (this.moveProgress >= 1) {
        this.x = this.toX;
        this.slotEntryTimeMs = this.gameTimeMs;
        this.fsm = this.observeTargetId ? "ObserveLock" : "Idle";
        this.idleMs = 0;
      }
    }
    if (this.fsm === "Scan") {
      if (this.gameTimeMs >= this.scanUntilMs) {
        this.finishScan();
      }
    }
    if (this.fsm === "Embarrassed" && this.gameTimeMs > this.embarrassedUntil) this.fsm = "Idle";
    if (this.fsm === "SitSuccess" && !this.seatedSeatId) this.fsm = "Idle";
    if (this.fsm === "Idle" || this.fsm === "ObserveLock" || this.fsm === "Scan") this.idleMs += dt;
  }

  private embarrassedUntil = 0;

  private finishScan() {
    const target = this.passengers.find((p) => p.id === this.scanTargetId);
    this.fsm = this.observeTargetId ? "ObserveLock" : "Idle";
    if (!target) return;
    const shown = target.cues.filter(
      (c) => c.startTimeMs <= this.gameTimeMs && c.startTimeMs + c.durationMs + 1400 >= this.gameTimeMs,
    );
    const weighted = [...shown].sort((a, b) => {
      const w = (c: PassengerCue) => (c.strength === "strong" ? 3 : c.strength === "medium" ? 2 : c.strength === "trap" ? 1 : 0.5);
      return w(b) - w(a) + (b.startTimeMs - a.startTimeMs) / 100000;
    });
    const sample = weighted.slice(0, 3);
    const chance = estimateExitChance(target.willExitAtNextStation, sample, (target.patienceModifier % 1) || 0.5);
    target.scanVerdict = verdictFromChance(chance);
    target.scanCues = sample;
    target.scanAtMs = this.gameTimeMs;
    target.glow = 1;
    this.cb.play(sample.some((c) => c.strength === "strong") ? "cue_strong" : "cue_soft");
  }

  private updatePresence() {
    if (this.seatedSeatId || this.fsm === "Move" || this.phase !== "running") {
      this.presence = null;
      return;
    }
    const seatId = this.layout.seatByFrontSlot[this.slot];
    if (seatId && this.fsm !== "Embarrassed") {
      if (!this.presence || this.presence.seatId !== seatId) {
        this.presence = { seatId, sinceMs: this.slotEntryTimeMs };
      }
    } else {
      this.presence = null;
    }
  }

  private updatePassengers(dt: number) {
    for (const p of this.passengers) {
      if (p.glow > 0) p.glow = Math.max(0, p.glow - dt / 900);
      if (p.phase === "standing" || p.phase === "exiting") {
        const doorX = p.exitDoor === "left" ? 78 : WORLD.w - 78;
        const speed = p.phase === "exiting" ? 0.32 : 0.12;
        p.x += Math.sign(doorX - p.x) * Math.min(Math.abs(doorX - p.x), speed * dt);
        if (p.phase === "standing" && this.gameTimeMs > (p.standUpTimeMs ?? 0) + 900) p.phase = "exiting";
        if (p.phase === "exiting" && Math.abs(doorX - p.x) < 12) p.phase = "gone";
      } else if (p.phase === "boarding") {
        const target = this.layout.seatXs[p.seatId];
        p.x += Math.sign(target - p.x) * Math.min(Math.abs(target - p.x), 0.16 * dt);
        if (Math.abs(target - p.x) < 5) {
          p.x = target;
          p.phase = "sitting";
        }
      }
    }
    this.passengers = this.passengers.filter((p) => p.phase !== "gone");
  }

  private updateRivals(dt: number) {
    for (const r of this.rivals) {
      if (r.seated) continue;
      if (this.gameTimeMs >= r.moveStartMs && r.moveDurationMs > 0) {
        const t = Math.max(0, Math.min(1, (this.gameTimeMs - r.moveStartMs) / r.moveDurationMs));
        r.x = r.fromX + (r.toX - r.fromX) * t;
      } else {
        r.x += Math.sin(this.gameTimeMs / 900 + r.arriveAtMs) * 0.02 * dt;
      }
    }
  }

  private updateObservation(dt: number) {
    // 좌석 앞 체류 판정
    for (const p of this.passengers) {
      if (!p.willExitAtNextStation || p.standUpTimeMs === undefined) continue;
      const windowOpen = p.standUpTimeMs - 3000;
      if (this.presence && this.presence.seatId === p.seatId && this.gameTimeMs >= windowOpen) {
        const eff = Math.max(this.presence.sinceMs, windowOpen);
        const prev = this.bestArrival[p.seatId];
        if (prev === undefined || eff < prev) this.bestArrival[p.seatId] = eff;
      }
    }
    // 내리지 않는 승객 앞에 오래 서 있음
    if (this.presence && this.phase === "running") {
      const target = this.passengers.find((p) => p.seatId === this.presence!.seatId);
      if (target && !target.willExitAtNextStation) {
        this.wrongStandMs += dt;
        if (this.wrongStandMs >= GLARE_RULES.wrongStandMs) {
          this.wrongStandMs = 0;
          this.addGlare(GLARE_RULES.wrongStand, "내리지 않을 것 같은데… 헛기침 소리");
          this.cb.play("glare");
        }
      } else {
        this.wrongStandMs = Math.max(0, this.wrongStandMs - dt * 0.6);
      }
    }
    // 문 앞을 막음
    if (this.isDoorOpen && !this.doorBlockCharged && (this.slot === "DoorL" || this.slot === "DoorR")) {
      this.doorBlockCharged = true;
      this.addGlare(GLARE_RULES.doorBlock, "문을 막았다 · 승하차 승객의 시선");
      this.score += SCORE_TABLE.doorBlock;
      this.cb.play("glare");
    }
  }

  private updateGlareRelief(dt: number) {
    if (this.glare <= 0) return;
    this.reliefMs += dt;
    if (this.reliefMs < GLARE_RULES.reliefWaitMs) return;
    this.reliefMs = 0;
    let amount = GLARE_RULES.reliefIdle;
    if (this.presence) {
      const target = this.passengers.find((p) => p.seatId === this.presence!.seatId);
      if (target?.willExitAtNextStation) amount = GLARE_RULES.reliefCorrectWait;
    }
    this.glare = clampGlare(this.glare - amount);
  }

  private updateFatigue(dt: number) {
    if (this.seatedSeatId) return;
    const drain = 0.4 * this.stage.fatigueDrainMultiplier * (dt / 1000);
    if (drain > 0) this.fatigue = clampFatigue(this.fatigue - drain);
  }

  private updateTimeline() {
    if (this.phase === "running") {
      for (const p of this.passengers) {
        if (!p.willExitAtNextStation || p.standUpTimeMs === undefined) continue;
        if (p.phase === "sitting" && this.gameTimeMs >= p.standUpTimeMs - 900) p.phase = "preparing";
        if (p.phase !== "standing" && p.phase !== "exiting" && p.phase !== "gone" && this.gameTimeMs >= p.standUpTimeMs) {
          p.phase = "standing";
          this.cb.play("standup");
        }
        if (!p.claimResolved && this.gameTimeMs >= p.standUpTimeMs + 500) {
          p.claimResolved = true;
          this.resolveClaim(p);
        }
      }
      if (this.gameTimeMs >= this.nextArrivalMs) this.openDoors();
      return;
    }
    if (this.phase === "doorOpen") {
      if (this.yieldAtMs > 0 && this.gameTimeMs >= this.yieldAtMs && this.seatedSeatId) this.yieldSeat();
      if (this.gameTimeMs >= this.doorCloseAtMs) this.closeDoors();
    }
  }

  private countAttempt() {
    if (this.attemptCounted) return;
    this.attemptCounted = true;
    this.stats.attempts += 1;
  }

  private resolveClaim(p: RtPassenger) {
    const arrival = this.bestArrival[p.seatId] ?? null;
    const judgement = judgeSeatClaim(arrival, p.standUpTimeMs!);
    const rival = this.rivals.find((r) => !r.seated && r.targetSeatId === p.seatId);
    const rivalArrival = rival ? rival.arriveAtMs : null;

    if (judgement === "MISS") {
      this.stats.wrongPredictions += 1;
      if (rival && rivalArrival !== null && rivalArrival <= p.standUpTimeMs! + 500) this.rivalTakesSeat(rival, p.seatId);
      return;
    }
    if (this.glare >= GLARE_RULES.danger) {
      this.fsm = "Embarrassed";
      this.embarrassedUntil = this.gameTimeMs + 1800;
      this.combo = 0;
      this.popup(p.seatId, "MISS", "눈총이 따가워서 못 앉았다");
      this.toast("눈총 90 이상 · 착석 포기", "bad");
      this.cb.play("miss");
      if (rival) this.rivalTakesSeat(rival, p.seatId);
      return;
    }
    if (judgement === "LATE" && rival && rivalArrival !== null && rivalArrival < (arrival ?? Infinity)) {
      this.countAttempt();
      this.score += SCORE_TABLE.rivalLoss;
      this.combo = 0;
      this.fatigue = clampFatigue(this.fatigue - 5);
      this.fsm = "Embarrassed";
      this.embarrassedUntil = this.gameTimeMs + 1800;
      this.popup(p.seatId, "LATE", `${rival.name}에게 선점당했다`);
      this.toast(`${rival.name}이 먼저 앉았다 -250`, "bad");
      this.cb.play("miss");
      this.rivalTakesSeat(rival, p.seatId);
      this.cameraShake = 1;
      return;
    }

    const movedSlots = this.recentMoves.reduce((s, m) => s + m.slots, 0);
    const breakdown = seatClaimScore(judgement, this.combo, this.glare, movedSlots);
    this.countAttempt();
    this.score += breakdown.total;
    this.combo += 1;
    this.stats.hits += 1;
    this.stats.seatSuccess += 1;
    if (judgement === "PERFECT") {
      this.stats.perfects += 1;
      this.fatigue = clampFatigue(this.fatigue + 35);
    } else {
      this.fatigue = clampFatigue(this.fatigue + 25);
    }
    this.seatedSeatId = p.seatId;
    this.fsm = "SitSuccess";
    this.observeTargetId = null;
    this.x = p.x;
    this.popup(p.seatId, judgement, judgement === "PERFECT" ? "완벽한 눈치!" : "좋은 눈치!");
    this.toast(
      `${judgement} · ${breakdown.total >= 1500 ? "완벽한 선점" : "좌석 확보"} +${breakdown.total}`,
      "good",
    );
    this.cb.play(judgement === "PERFECT" ? "perfect" : "good");
    this.zoomSeatX = p.x;
    this.zoomUntilMs = this.gameTimeMs + 260;
    this.cameraShake = 0.5;
  }

  private rivalTakesSeat(rival: RtRival, seatId: string) {
    rival.seated = true;
    rival.x = this.layout.seatXs[seatId];
    const arch = this.rng.pick(Object.keys(ARCHETYPE_BY_ID));
    this.passengers.push({
      id: `npc-${this.uid++}`,
      seatId,
      archetype: arch,
      willExitAtNextStation: false,
      exitDoor: this.layout.seatXs[seatId] < WORLD.w / 2 ? "left" : "right",
      cues: [],
      patienceModifier: 1,
      phase: "boarding",
      x: this.layout.seatXs[seatId],
      claimResolved: true,
      scanVerdict: "none",
      scanCues: [],
      scanAtMs: -9999,
      glow: 0,
      poseSeed: this.rng.next() * 4,
    });
    this.rivals = this.rivals.filter((r) => r !== rival);
    this.rivalQueue.push(rival.npcId);
  }

  private openDoors() {
    this.phase = "doorOpen";
    this.isDoorOpen = true;
    const st = this.stage.stationEvents[this.stationIndex];
    this.doorCloseAtMs = this.gameTimeMs + st.doorOpenDurationMs;
    this.doorBlockCharged = false;
    this.cb.play("door_open");
    this.cb.caption(`${st.stationName} · 문이 열립니다`);
    if (!this.doorBlockCharged && this.slot !== "DoorL" && this.slot !== "DoorR") {
      this.glare = clampGlare(this.glare - GLARE_RULES.reliefYield);
    }
    for (const p of this.passengers) {
      if (p.willExitAtNextStation && (p.phase === "standing" || p.phase === "preparing")) p.phase = "exiting";
    }
    if (this.seatedSeatId) this.yieldAtMs = this.gameTimeMs + st.doorOpenDurationMs + 900;
  }

  private yieldSeat() {
    const seatId = this.seatedSeatId!;
    this.seatedSeatId = null;
    this.yieldAtMs = 0;
    this.fsm = "Idle";
    this.slot = this.layout.frontSlotBySeat[seatId];
    this.x = this.layout.slotXs[this.slot];
    this.fromX = this.x;
    this.toX = this.x;
    this.moveProgress = 1;
    this.slotEntryTimeMs = this.gameTimeMs;
    this.fatigue = clampFatigue(this.fatigue - 3);
    this.glare = clampGlare(this.glare - 5);
    this.toast("눈치 있게 자리 양보 · 피로도 -3", "info");
    this.cb.play("sigh");
    this.boardPassenger(seatId);
  }

  private boardPassenger(seatId: string) {
    const arch = this.rng.pick(Object.values(ARCHETYPE_BY_ID));
    const roundStart = Math.max(this.gameTimeMs + 300, this.roundStartMs);
    const cues =
      this.nextStandUpMs - roundStart > 2500
        ? planCues(this.rng, {
            roundStartMs: roundStart,
            standUpMs: this.nextStandUpMs,
            willExit: this.rng.chance(0.35),
            difficulty: this.stage.difficulty,
            trapRatio: this.stage.rules.trapCueRatio,
            decoyStrong: this.stage.rules.decoyStrongCues,
            cueDurationMs: this.stage.rules.cueDurationMs,
            preferred: arch.preferredCues,
            leadProfile: this.stage.rules.tutorial ? "tutorial" : "normal",
          })
        : [];
    const willExit = cues.some((c) => c.strength === "strong") && this.rng.chance(0.5);
    this.passengers.push({
      id: `board-${this.uid++}`,
      seatId,
      archetype: arch.id,
      willExitAtNextStation: willExit,
      // willExit이면 standUp 필수 — undefined 블로커 방지
      standUpTimeMs: willExit ? this.nextStandUpMs : undefined,
      exitDoor: this.layout.seatXs[seatId] < WORLD.w / 2 ? "left" : "right",
      cues,
      patienceModifier: arch.patienceModifier,
      phase: "boarding",
      x: this.layout.seatXs[seatId] - 200,
      claimResolved: true,
      scanVerdict: "none",
      scanCues: [],
      scanAtMs: -9999,
      glow: 0,
      poseSeed: this.rng.next() * 4,
    });
  }

  private closeDoors() {
    this.isDoorOpen = false;
    this.phase = "running";
    this.cb.play("door_close");
    this.stationIndex += 1;
    if (this.stationIndex >= this.stage.stationEvents.length) {
      this.phase = "done";
      this.status = "cleared";
      this.cb.caption("목적지 도착 · 수고했어요, 부엉이 씨");
      return;
    }
    if (this.seatedSeatId) this.yieldSeat();
    this.planNextRound();
  }

  private planNextRound() {
    this.roundStartMs = this.gameTimeMs;
    this.attemptCounted = false;
    const st = this.stage.stationEvents[this.stationIndex];
    this.nextArrivalMs = st.arrivalTimeMs;
    this.nextStandUpMs = this.nextArrivalMs - STANDUP_LEAD_MS;
    this.bestArrival = {};
    this.wrongStandMs = 0;
    this.presence = null;
    this.recentMoves = [];

    const occupied = new Set(
      this.passengers.filter((p) => p.phase === "sitting" || p.phase === "boarding").map((p) => p.seatId),
    );
    if (this.seatedSeatId) occupied.add(this.seatedSeatId);
    const free = this.layout.seatIds.filter((s) => !occupied.has(s));
    if (free.length > 0) {
      const newOnes = buildPassengersForRound(this.rng, {
        layout: this.layout,
        roundStartMs: this.roundStartMs,
        standUpMs: this.nextStandUpMs,
        occupiedSeatIds: free,
        exitingSeatIds: [],
        difficulty: this.stage.difficulty,
        trapRatio: this.stage.rules.trapCueRatio,
        decoyStrong: this.stage.rules.decoyStrongCues,
        cueDurationMs: this.stage.rules.cueDurationMs,
        idPrefix: `r${this.stationIndex}`,
        leadProfile: this.stage.rules.tutorial ? "tutorial" : "normal",
      });
      this.passengers.push(...newOnes.map((p) => this.toRuntime(p)));
    }

    const seated = this.passengers.filter((p) => p.phase === "sitting" || p.phase === "boarding");
    const maxExit = Math.min(seated.length, this.stage.difficulty >= 3 ? 4 : 2);
    const exitCount = Math.min(seated.length, this.rng.int(this.templateExitMin, Math.max(this.templateExitMin, this.templateExitMax)));
    const exitingSeats = new Set(this.rng.shuffle(seated).slice(0, Math.min(exitCount, maxExit)).map((p) => p.seatId));

    for (const p of seated) {
      const will = exitingSeats.has(p.seatId);
      p.willExitAtNextStation = will;
      p.standUpTimeMs = will ? this.nextStandUpMs : undefined;
      p.claimResolved = false;
      p.scanVerdict = "none";
      p.scanCues = [];
      p.phase = "sitting";
      const arch = ARCHETYPE_BY_ID[p.archetype] ?? Object.values(ARCHETYPE_BY_ID)[0];
      p.cues = planCues(this.rng, {
        roundStartMs: this.roundStartMs,
        standUpMs: this.nextStandUpMs,
        willExit: will,
        difficulty: this.stage.difficulty,
        trapRatio: this.stage.rules.trapCueRatio,
        decoyStrong: this.stage.rules.decoyStrongCues,
        cueDurationMs: this.stage.rules.cueDurationMs,
        preferred: arch.preferredCues,
        leadProfile: this.stage.rules.tutorial ? "tutorial" : "normal",
      });
    }
    st.exitingPassengerIds = this.passengers.filter((p) => p.willExitAtNextStation).map((p) => p.id);
    st.enteringPassengerCount = this.rng.int(1, 3);
    this.spawnRivals();
    this.toast(`${st.stationName} 방면 · 관찰 시작`, "info");
  }

  private get templateExitMin() {
    return this.stage.difficulty <= 1 ? 1 : 2;
  }
  private get templateExitMax() {
    return this.stage.difficulty >= 5 ? 4 : this.stage.difficulty >= 3 ? 3 : 2;
  }

  private spawnRivals() {
    if (this.stage.rules.tutorial) return;
    while (this.rivals.length < this.stage.rivalNpcIds.length && this.rivalQueue.length > 0) {
      const npcId = this.rivalQueue.shift()!;
      const def = RIVAL_BY_ID[npcId];
      if (!def) continue;
      const startSlot = this.rng.pick(this.layout.slots);
      const seatedSeats = this.passengers.filter((p) => p.phase === "sitting" || p.phase === "boarding");
      if (seatedSeats.length === 0) break;
      const targets = seatedSeats.filter((p) => p.willExitAtNextStation);
      const correct = targets.length > 0 && this.rng.chance(def.accuracy);
      const targetSeat = correct
        ? this.rng.pick(targets).seatId
        : this.rng.pick(seatedSeats).seatId;
      const toX = this.layout.slotXs[this.layout.frontSlotBySeat[targetSeat]] ?? 520;
      const fromX = this.layout.slotXs[startSlot] ?? 520;
      const reaction = this.rng.range(def.reactionMs[0], def.reactionMs[1]);
      let arriveAt = this.nextStandUpMs - reaction;
      arriveAt = Math.max(this.roundStartMs + 1400, Math.min(this.nextStandUpMs + 400, arriveAt));
      const travel = Math.max(320, (Math.abs(toX - fromX) / 0.3) * 1);
      const moveStart = Math.max(this.roundStartMs + 600, arriveAt - travel);
      this.rivals.push({
        npcId,
        name: def.name,
        emoji: def.emoji,
        color: def.color,
        x: fromX,
        fromX,
        toX,
        moveStartMs: moveStart,
        moveDurationMs: travel,
        targetSeatId: targetSeat,
        arriveAtMs: arriveAt,
        accuracy: def.accuracy,
        seated: false,
      });
    }
  }

  private updateTutorial() {
    if (!this.stage.rules.tutorial) return;
    const target = this.passengers.find((p) => p.willExitAtNextStation);
    if (!target) return;
    if (this.tutorialStep === 0) {
      const shown = target.cues.some((c) => this.gameTimeMs >= c.startTimeMs);
      if (shown) this.tutorialStep = 1;
    } else if (this.tutorialStep === 1) {
      if (target.scanAtMs > 0) this.tutorialStep = 2;
    } else if (this.tutorialStep === 2) {
      if (this.presence?.seatId === target.seatId) this.tutorialStep = 3;
    }
  }

  private updateFx(dt: number) {
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt / 320);
    if (this.zoomSeatX !== null && this.gameTimeMs > this.zoomUntilMs) this.zoomSeatX = null;
    const now = this.gameTimeMs;
    this.toasts = this.toasts.filter((t) => now - t.bornAtMs < 2600);
    this.popups = this.popups.filter((p) => now - p.bornAtMs < 1800);
  }

  private addGlare(amount: number, message: string) {
    const before = this.glare;
    this.glare = clampGlare(this.glare + amount * this.stage.glareMultiplier);
    if (this.glare >= 80 && before < 80 && !this.glareHighCharged) {
      this.glareHighCharged = true;
      this.score += SCORE_TABLE.glareHigh;
      this.toast("객차 분위기가 싸늘하다 -500", "bad");
    }
    this.toast(`${message} (눈총 ${Math.round(this.glare)})`, "warn");
  }

  private toast(text: string, tone: Toast["tone"]) {
    this.toasts.push({ id: this.uid++, text, tone, bornAtMs: this.gameTimeMs });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  private popup(seatId: string, judgement: Judgement, text: string) {
    this.popups.push({ id: this.uid++, seatId, judgement, text, bornAtMs: this.gameTimeMs });
    if (this.popups.length > 3) this.popups.shift();
  }

  private checkExhausted() {
    if (this.fatigue <= 0) this.fail("피로도 0");
  }

  /* ---------------------------------------------------------------- */
  /* 스냅샷 (렌더링 전용)                                                */
  /* ---------------------------------------------------------------- */
  snapshot(): Frame {
    const now = this.gameTimeMs;
    const cueIcons: Frame["cueIcons"] = [];
    const passengers: Frame["passengers"] = [];

    for (const p of this.passengers) {
      const active = p.cues.filter((c) => now >= c.startTimeMs && now <= c.startTimeMs + c.durationMs + CUE_TAIL_MS);
      const recent = p.cues
        .filter((c) => now >= c.startTimeMs && c.startTimeMs + c.durationMs + 6000 >= now)
        .slice(-6);
      const seatX = this.layout.seatXs[p.seatId];
      active.forEach((c, i) => {
        cueIcons.push({
          id: `${p.id}-${c.id}`,
          type: c.type,
          strength: c.strength,
          x: seatX + (i - (active.length - 1) / 2) * 26,
          y: 128,
          age: (now - c.startTimeMs) / (c.durationMs + CUE_TAIL_MS),
          life: 1,
          passengerId: p.id,
        });
      });
      passengers.push({
        id: p.id,
        seatId: p.seatId,
        seatX,
        x: quant(p.x),
        archetype: p.archetype,
        palette: (ARCHETYPE_BY_ID[p.archetype] ?? Object.values(ARCHETYPE_BY_ID)[0]).palette,
        phase: p.phase,
        willExit: p.willExitAtNextStation,
        standUpTimeMs: p.standUpTimeMs,
        exitDoor: p.exitDoor,
        exitX: p.exitDoor === "left" ? 78 : WORLD.w - 78,
        activeCues: active.filter((c) => now <= c.startTimeMs + c.durationMs),
        recentCues: recent,
        isScanTarget: this.scanTargetId === p.id && this.fsm === "Scan",
        isObserveTarget: this.observeTargetId === p.id,
        scanVerdict: now - p.scanAtMs < 4200 ? p.scanVerdict : "none",
        scanProgress: this.fsm === "Scan" && this.scanTargetId === p.id ? Math.min(1, 1 - (this.scanUntilMs - now) / SCAN.durationMs) : 0,
        glow: quant(p.glow),
        pose: quant(((now / 1250 + p.poseSeed) % 1) * 8) / 8,
      });
    }

    const rivals: RivalNpcRuntime[] = this.rivals.map((r) => ({
      id: r.npcId + "-" + r.targetSeatId,
      name: r.name,
      archetypeId: r.npcId,
      color: r.color,
      x: quant(r.x),
      targetSeatId: r.targetSeatId,
      arriveOffsetMs: Math.round(r.arriveAtMs - this.nextStandUpMs),
      accuracy: r.accuracy,
      emoji: r.emoji,
    }));

    const st = this.stage.stationEvents[Math.min(this.stationIndex, this.stage.stationEvents.length - 1)];
    const nextSt = this.stage.stationEvents[Math.min(this.stationIndex + 1, this.stage.stationEvents.length - 1)];
    const isDoorOpen = this.isDoorOpen;

    return {
      status: this.status,
      gameOverReason: this.gameOverReason,
      gameTimeMs: now,
      stage: this.stage,
      passengers,
      player: {
        fsm: this.fsm,
        slot: this.slot as PlayerSlot,
        x: quant(this.x),
        fromX: quant(this.fromX),
        toX: quant(this.toX),
        moveProgress: this.moveProgress,
        moveDurationMs: this.moveDurationMs,
        facing: this.facing,
        isMoving: this.fsm === "Move",
        isScanning: this.fsm === "Scan",
        scanProgress: this.fsm === "Scan" ? Math.min(1, 1 - (this.scanUntilMs - now) / SCAN.durationMs) : 0,
        observeTargetId: this.observeTargetId,
        seatedSeatId: this.seatedSeatId,
        slotEntryTimeMs: this.slotEntryTimeMs,
        glare: Math.round(this.glare),
        fatigue: Math.round(this.fatigue),
        score: this.score,
        combo: this.combo,
        slotsMovedInWindow: this.recentMoves.reduce((s, m) => s + m.slots, 0),
      },
      rivals,
      seatSlots: this.layout.seatIds.map((seatId) => ({
        seatId,
        x: this.layout.seatXs[seatId],
        frontSlot: this.layout.frontSlotBySeat[seatId] as PlayerSlot,
        occupied: this.passengers.some((p) => p.seatId === seatId && p.phase !== "gone"),
      })),
      slotXs: this.layout.slotXs,
      stationIndex: this.stationIndex,
      stationName: st.stationName,
      nextStationName: nextSt.stationName,
      msToNextArrival: Math.max(0, this.nextArrivalMs - now),
      msToDoorClose: isDoorOpen ? Math.max(0, this.doorCloseAtMs - now) : 0,
      isDoorOpen,
      isArriving: this.phase === "running" && this.nextArrivalMs - now < 4200,
      announcement: this.announcement,
      toasts: this.toasts,
      popups: this.popups,
      cueIcons,
      ambient: this.ambient.map((a) => ({
        x: quant(a.x),
        pose: quant(((this.gameTimeMs / 1400 + a.seed) % 1) * 8) / 8,
        palette: (ARCHETYPE_BY_ID[a.arch] ?? Object.values(ARCHETYPE_BY_ID)[0]).palette,
      })),
      scanTargetId: this.fsm === "Scan" ? this.scanTargetId : null,
      scanRing:
        this.fsm === "Scan" && this.scanTargetId
          ? {
              x: this.passengers.find((p) => p.id === this.scanTargetId)?.x ?? this.x,
              y: 250,
              progress: Math.min(1, 1 - (this.scanUntilMs - now) / SCAN.durationMs),
            }
          : null,
      cameraShake: this.screenShakeEnabled ? this.cameraShake : 0,
      zoomSeatX: this.reducedMotion ? null : this.zoomSeatX,
      glare: Math.round(this.glare),
      fatigue: Math.round(this.fatigue),
      score: this.score,
      combo: this.combo,
      tutorialStep: this.tutorialStep,
      tutorialHint: this.tutorialHint(),
      tutorialHighlightSeatId: this.stage.rules.tutorial
        ? (this.passengers.find((p) => p.willExitAtNextStation)?.seatId ?? null)
        : null,
      stats: { ...this.stats },
    };
  }

  private tutorialHint(): string | null {
    if (!this.stage.rules.tutorial) return null;
    switch (this.tutorialStep) {
      case 0:
        return "머리 위에 뜨는 아이콘을 가만히 지켜보세요. 👀 눈 모양은 강한 단서입니다.";
      case 1:
        return "스캔 버튼(또는 Space)을 눌러 그 승객의 직감을 확인하세요.";
      case 2:
        return "그 승객 앞 자리로 조용히 이동하세요. 좌우 버튼이나 좌석 앞을 탭하세요.";
      case 3:
        return "역에 도착할 때까지 그 자리에. 완벽한 타이밍이면 PERFECT!";
      default:
        return "이제 혼자서도 할 수 있겠네요. 노선을 선택해 보세요.";
    }
  }

  /** 자유 이동이 아닌 슬롯 목록 (UI 하단 표시용) */
  slotList(): string[] {
    return this.layout.slots;
  }

  ambientList(): { x: number; arch: string; seed: number; pose: number }[] {
    const now = this.gameTimeMs;
    return this.ambient.map((a) => ({ ...a, pose: quant(((now / 1400 + a.seed) % 1) * 8) / 8 }));
  }
}
