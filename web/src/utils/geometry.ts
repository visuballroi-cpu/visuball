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

// ── multi-waypoint routes ────────────────────────────────────────────────────

/** Catmull-Rom spline through [from, ...pts, to], sampled `perSeg` points per segment. */
export function sampleRoute(from: Vec2, pts: Vec2[], to: Vec2, perSeg = 16): Vec2[] {
  const P = [from, ...pts, to]
  const out: Vec2[] = [from]
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)]
    for (let k = 1; k <= perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  return out
}

const routeCache = new Map<string, { pts: Vec2[]; cum: number[] }>()

/** Position at fraction t (by arc length) along the route. `key` must change whenever the geometry changes. */
export function routePoint(key: string, from: Vec2, pts: Vec2[], to: Vec2, t: number): Vec2 {
  let r = routeCache.get(key)
  if (!r) {
    if (routeCache.size > 400) routeCache.clear()
    const s = sampleRoute(from, pts, to)
    const cum = [0]
    for (let i = 1; i < s.length; i++) cum.push(cum[i - 1] + Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y))
    r = { pts: s, cum }
    routeCache.set(key, r)
  }
  const total = r.cum[r.cum.length - 1]
  if (total < 1e-6) return from
  const d = clamp(t, 0, 1) * total
  let i = 1
  while (i < r.cum.length - 1 && r.cum[i] < d) i++
  const seg = r.cum[i] - r.cum[i - 1] || 1
  const u = (d - r.cum[i - 1]) / seg
  return { x: lerp(r.pts[i - 1].x, r.pts[i].x, u), y: lerp(r.pts[i - 1].y, r.pts[i].y, u) }
}

export function routeKey(id: string, from: Vec2, pts: Vec2[], to: Vec2) {
  return `${id}|${from.x.toFixed(2)},${from.y.toFixed(2)}|${to.x.toFixed(2)},${to.y.toFixed(2)}|${pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(";")}`
}

/** Index in `pts` at which a new waypoint at `p` should be inserted (nearest chord of from→pts→to). */
export function nearestSegment(from: Vec2, pts: Vec2[], to: Vec2, p: Vec2): number {
  const A = [from, ...pts, to]
  let best = 0, bd = Infinity
  for (let i = 0; i < A.length - 1; i++) {
    const a = A[i], b = A[i + 1]
    const dx = b.x - a.x, dy = b.y - a.y
    const l2 = dx * dx + dy * dy || 1
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1)
    const d = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
    if (d < bd) { bd = d; best = i }
  }
  return best
}
