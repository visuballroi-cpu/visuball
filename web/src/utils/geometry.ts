// Shared math + coordinate helpers for the tactical board.
// Pitch data space: x ∈ [0, PITCH_WIDTH] (goal→goal), y ∈ [0, PITCH_HEIGHT] (touchline→touchline)
// World space (three.js, metres): X = x - W/2, Y = up, Z = y - H/2

import { PITCH_WIDTH, PITCH_HEIGHT } from "@/constants"

export interface Vec2 {
  x: number
  y: number
}

export const HALF_W = PITCH_WIDTH / 2
export const HALF_H = PITCH_HEIGHT / 2

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Frame-rate independent exponential smoothing factor (use with lerp). */
export function damp(lambda: number, dt: number) {
  return 1 - Math.exp(-lambda * dt)
}

/** Shortest signed angular difference b - a, in (-π, π]. */
export function angleDelta(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

export function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function bezierPt(
  fx: number, fy: number, cpX: number, cpY: number, tx: number, ty: number, t: number
): Vec2 {
  const mt = 1 - t
  return {
    x: mt * mt * fx + 2 * mt * t * cpX + t * t * tx,
    y: mt * mt * fy + 2 * mt * t * cpY + t * t * ty,
  }
}

export function bezierMid(
  fx: number, fy: number, cpX: number, cpY: number, tx: number, ty: number
) {
  return bezierPt(fx, fy, cpX, cpY, tx, ty, 0.5)
}

/** Control point so that the curve passes through (mx,my) at t = 0.5. */
export function cpFromMid(fx: number, fy: number, mx: number, my: number, tx: number, ty: number) {
  return { cpX: 2 * mx - (fx + tx) / 2, cpY: 2 * my - (fy + ty) / 2 }
}

/** Gentle default curvature so overlapping runs stay readable. */
export function defaultCp(fx: number, fy: number, tx: number, ty: number) {
  const mx = (fx + tx) / 2
  const my = (fy + ty) / 2
  const len = Math.hypot(tx - fx, ty - fy) || 1
  const px = -(ty - fy) / len
  const py = (tx - fx) / len
  const offset = clamp(len * 0.18, 3, 14)
  return { cpX: mx + px * offset, cpY: my + py * offset }
}

/** Sample a quadratic bezier into n+1 points. */
export function sampleBezier(
  fx: number, fy: number, cpX: number, cpY: number, tx: number, ty: number, n = 28
): Vec2[] {
  const out: Vec2[] = []
  for (let i = 0; i <= n; i++) out.push(bezierPt(fx, fy, cpX, cpY, tx, ty, i / n))
  return out
}

// ── coordinate mapping ───────────────────────────────────────────────────────
export function toWorldX(x: number) { return x - HALF_W }
export function toWorldZ(y: number) { return y - HALF_H }
export function toDataX(wx: number) { return wx + HALF_W }
export function toDataY(wz: number) { return wz + HALF_H }

/** Y-offsets (metres) for flat things painted on the grass — keeps layers apart (no z-fighting). */
export const LAYER = {
  grass: 0,
  zoneFill: 0.012,
  zoneLine: 0.02,
  pitchLine: 0.028,
  marking: 0.04,
  path: 0.075,
  ring: 0.09,
} as const
