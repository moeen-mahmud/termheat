import type { GameLevel } from "@/lib/types";

/**
 * The `termheat play` physics engine.
 *
 * The renderer owns the clock and calls `step(state, level, dt, input)` once
 * per tick; everything here is a function of elapsed seconds, so frame rate
 * changes smoothness but never speed, difficulty, or jump distance. The
 * caller owns the state object and `step` mutates it in place — one live
 * simulation per game, driven and asserted directly in tests.
 *
 * Jump math is the Pittman parameterization ("Building a Better Jump", GDC):
 * pick the apex height and time-to-apex a play-tester approved, derive
 * gravity and launch velocity from them — tuning stays in human units.
 */

export const PHYSICS = {
	// Canabalt-style ramp: runs start gentle and build as you survive.
	SPEED_BASE: 6, // day-columns per second
	SPEED_CAP: 9,
	SPEED_RAMP: 0.06, // +cols/s per second survived

	// Ground jump: 3-row apex clears the tallest repaired climb (MAX_RISE 2).
	APEX_ROWS: 3,
	TIME_TO_APEX: 0.35,

	// Air jump: one extra, smaller parabola. Bounded on purpose — unlimited
	// air impulses would be Flappy Bird and the terrain would stop mattering.
	AIR_APEX_ROWS: 2,
	AIR_TIME_TO_APEX: 0.28,
	MAX_JUMPS: 2,

	// Input forgiveness — mandatory at coarse tick rates: a press slightly
	// early fires on landing (buffer), slightly late after a ledge still
	// fires (coyote).
	JUMP_BUFFER_S: 0.15,
	COYOTE_S: 0.1,

	// A +1 rise is an auto-step; anything steeper must be jumped or it's a wall.
	MAX_STEP_UP: 1,

	// One step never crosses more than this many rows falling, so a legit
	// landing always intersects the surface shallowly — which is what makes
	// "deep overlap = hit a wall's side" a valid death test.
	MAX_FALL_ROWS_PER_STEP: 0.9,

	// Landing overlap deeper than this means the fall started inside a wall.
	WALL_OVERLAP_ROWS: 1.2,

	// Flames are grabbed at ground level or a low hop — sailing high over a
	// streak day doesn't count as living it.
	FLAME_GRAB_ROWS: 2,

	// A death costs about a section, not a month: respawn this many columns
	// behind where it happened (never before the last checkpoint passed).
	RESPAWN_BACKOFF_COLS: 10,

	// Respawn drops in from this many rows above the tallest nearby ground.
	// Landing from a capped fall can never kill, so dropping in absorbs any
	// height difference under the spawn — a grounded respawn next to a +2
	// block would be the wall-death again, just relocated.
	RESPAWN_DROP_ROWS: 2,
} as const;

// Derived, exported for tests and HUD math.
export const G_UP = (2 * PHYSICS.APEX_ROWS) / PHYSICS.TIME_TO_APEX ** 2;
export const G_DOWN = 2 * G_UP; // fast falls read as weight, not floatiness
export const JUMP_V0 = (2 * PHYSICS.APEX_ROWS) / PHYSICS.TIME_TO_APEX;
export const AIR_JUMP_V0 = (2 * PHYSICS.AIR_APEX_ROWS) / PHYSICS.AIR_TIME_TO_APEX;

/** Altitude assigned while over a pit — far enough down that y < -1 = dead. */
const NO_FLOOR = -10;

export type GameStatus = "running" | "dead" | "won";
export type DeathCause = "pit" | "wall";

export interface EngineState {
	/** Player's left edge in day-columns. Advances automatically — auto-runner. */
	x: number;
	/** Altitude in rows; equals the terrain height while grounded. */
	y: number;
	vy: number;
	airborne: boolean;
	jumpsUsed: number;
	jumpBufferS: number;
	coyoteS: number;
	/** Seconds survived this life — drives the speed ramp, resets on respawn. */
	elapsed: number;
	status: GameStatus;
	deathCause?: DeathCause;
	/** Column index the death happened at, for dated shame lines. */
	deathColumn?: number;
	deaths: number;
	/** Flames collected, run-total; survives respawns — a lived day stays lived. */
	flames: number;
	collected: Set<number>;
	/** Index into level.checkpoints of the last checkpoint passed. */
	checkpoint: number;
}

export interface StepInput {
	/** True if a jump key was pressed since the previous tick. */
	jump: boolean;
}

export function createEngine(level: GameLevel): EngineState {
	const spawn = level.checkpoints[0]?.column ?? 0;
	return {
		x: spawn,
		y: level.columns[spawn]?.height ?? 1,
		vy: 0,
		airborne: false,
		jumpsUsed: 0,
		jumpBufferS: 0,
		coyoteS: 0,
		elapsed: 0,
		status: "running",
		deaths: 0,
		flames: 0,
		collected: new Set(),
		checkpoint: 0,
	};
}

export function speedAt(elapsed: number): number {
	return Math.min(PHYSICS.SPEED_CAP, PHYSICS.SPEED_BASE + PHYSICS.SPEED_RAMP * elapsed);
}

/** Advances the simulation by dt seconds. No-op unless status is "running". */
export function step(w: EngineState, level: GameLevel, dt: number, input: StepInput): void {
	if (w.status !== "running") return;
	if (input.jump) w.jumpBufferS = PHYSICS.JUMP_BUFFER_S;

	w.elapsed += dt;
	w.x += speedAt(w.elapsed) * dt;

	if (Math.floor(w.x) >= level.finishColumn) {
		w.x = level.finishColumn;
		w.status = "won";
		return;
	}

	// Two-foot collision: the sprite is one column wide but straddles two
	// mid-scroll. It stands if either foot has ground and falls only when both
	// feet are over a pit — what you see touching a block is what physics
	// believes.
	const colL = Math.floor(w.x);
	const colR = Math.floor(w.x + 0.999);
	const heightL = level.columns[colL]?.height ?? 0;
	const heightR = level.columns[colR]?.height ?? 0;
	const solid = Math.max(heightL, heightR);
	const ground = solid > 0 ? solid : NO_FLOOR;

	if (!w.airborne) {
		const rise = ground - w.y;
		if (rise > PHYSICS.MAX_STEP_UP + 0.001) {
			die(w, "wall", colL);
			return;
		}
		if (rise > 0) {
			w.y = ground; // auto-step
		} else if (rise < 0) {
			w.airborne = true; // walked off a ledge or over a pit edge
			w.vy = 0;
			w.coyoteS = PHYSICS.COYOTE_S;
		}
	}

	if (w.jumpBufferS > 0) {
		if (!w.airborne || w.coyoteS > 0) {
			w.vy = JUMP_V0;
			w.airborne = true;
			w.jumpsUsed = 1;
			w.jumpBufferS = 0;
			w.coyoteS = 0;
		} else if (w.jumpsUsed < PHYSICS.MAX_JUMPS) {
			w.vy = AIR_JUMP_V0; // fresh, smaller parabola mid-air
			w.jumpsUsed++;
			w.jumpBufferS = 0;
		}
	}

	if (w.airborne) {
		w.y += w.vy * dt;
		w.vy -= (w.vy > 0 ? G_UP : G_DOWN) * dt;
		const maxFall = PHYSICS.MAX_FALL_ROWS_PER_STEP / dt;
		if (w.vy < -maxFall) w.vy = -maxFall;
		if (w.vy <= 0 && w.y <= ground) {
			if (ground - w.y > PHYSICS.WALL_OVERLAP_ROWS) {
				die(w, "wall", colL);
				return;
			}
			w.y = ground;
			w.vy = 0;
			w.airborne = false;
			w.jumpsUsed = 0;
		}
		if (w.y < -1) {
			die(w, "pit", colL);
			return;
		}
	}

	collectFlames(w, level, colL, colR);
	while (level.checkpoints[w.checkpoint + 1] && level.checkpoints[w.checkpoint + 1]!.column <= colL) {
		w.checkpoint++;
	}

	// Timers decay at the END of the tick so the fire check above always sees
	// the freshest value — decrementing first silently shaves a tick off the
	// forgiveness window (the round-1 "my jump got eaten" bug in new clothes).
	if (w.jumpBufferS > 0) w.jumpBufferS = Math.max(0, w.jumpBufferS - dt);
	if (w.airborne && w.coyoteS > 0) w.coyoteS = Math.max(0, w.coyoteS - dt);
}

/**
 * Back to RESPAWN_BACKOFF_COLS columns behind the death — enough runway to
 * retry the section that killed you — but never before the last checkpoint
 * passed, and never over a pit (slides left to solid ground). Collected
 * flames survive — a lived day stays lived — but the speed ramp restarts;
 * dying is punishment enough.
 */
export function respawn(w: EngineState, level: GameLevel): void {
	const checkpointCol = (level.checkpoints[w.checkpoint] ?? level.checkpoints[0])?.column ?? 0;
	let column = Math.max(checkpointCol, (w.deathColumn ?? checkpointCol) - PHYSICS.RESPAWN_BACKOFF_COLS);
	while (column > checkpointCol && (level.columns[column]?.height ?? 0) <= 0) column--;
	// Drop in above the tallest ground the fall can drift over (~2 columns at
	// base speed while falling RESPAWN_DROP_ROWS; 3 is that plus margin).
	let landing = 1;
	for (let i = column; i <= column + 3; i++) {
		landing = Math.max(landing, level.columns[i]?.height ?? 0);
	}
	w.x = column;
	w.y = landing + PHYSICS.RESPAWN_DROP_ROWS;
	w.vy = 0;
	w.airborne = true;
	w.jumpsUsed = 0;
	w.jumpBufferS = 0;
	w.coyoteS = 0;
	w.elapsed = 0;
	w.status = "running";
	w.deathCause = undefined;
	w.deathColumn = undefined;
}

function die(w: EngineState, cause: DeathCause, column: number): void {
	w.status = "dead";
	w.deathCause = cause;
	w.deathColumn = column;
	w.deaths++;
}

function collectFlames(w: EngineState, level: GameLevel, colL: number, colR: number): void {
	for (const col of colL === colR ? [colL] : [colL, colR]) {
		const cell = level.columns[col];
		if (cell?.flame && !w.collected.has(col) && w.y - cell.height <= PHYSICS.FLAME_GRAB_ROWS) {
			w.collected.add(col);
			w.flames++;
		}
	}
}
