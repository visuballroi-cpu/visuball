import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import {
  RotateCw, ArrowLeft, Save, Undo2, Redo2, Sparkles, Brain, Play, Pause, SkipBack, SkipForward, Repeat,
  MousePointer2, MoveUpRight, Route, Plus, Copy, Trash2, X, Eye, RotateCcw, Users, Video, Layers, Wand2,
} from "lucide-react"
import { useCoachStore, useExerciseStore } from "@/store"
import { generateId, getCurrentDate } from "@/utils"
import { FORMATIONS, PITCH_WIDTH, PITCH_HEIGHT } from "@/constants"
import type { Exercise, Player, Arrow, MovementPath } from "@/types"
import { te, type EdKey } from "@/constants/editorStrings"
import { analyzeTactics, type TacticalAnalysis, type AIDrillResult } from "@/services/aiCoach"
import AICoachPanel from "@/components/tactical/AICoachPanel"
import PitchScene from "@/components/tactical3d/PitchScene"
import {
  NO_OVERLAYS, type CameraPreset, type Overlays, type PlaybackBus, type Tool,
} from "@/components/tactical3d/types"
import { bezierMid, bezierPt, clamp, damp, defaultCp, easeInOut, nearestSegment, routeKey, routePoint, type Vec2 } from "@/utils/geometry"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditorStep {
  id: string
  name: string
  players: Player[]
  ballPosition: Vec2
  arrows: Arrow[]
  movementPaths?: Record<string, MovementPath>
  ballMovementPath?: MovementPath
}

interface Meta {
  name: string
  description: string
  formation: string
  startTime: string
  endTime: string
}

interface Snap { steps: EditorStep[]; meta: Meta }

type Hit =
  | { kind: "player"; id: string; pos: Vec2 }
  | { kind: "ball"; pos: Vec2 }
  | { kind: "arrowcp"; id: string; pos: Vec2 }
  | { kind: "pathcp"; id: string; pos: Vec2 }
  | { kind: "waypoint"; id: string; index: number; pos: Vec2 }
  | { kind: "dest"; id: string; pos: Vec2 }

interface Drag { hit: Hit; dx: number; dy: number; moved: boolean }

interface TacticalEditorProps {
  newDrillContext?: { date: string; type: "SESSION" | "DRILL" } | null
  onClearContext?: () => void
}

// ─── Constants & helpers ──────────────────────────────────────────────────────

const STEP_SECONDS = 2.4
const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3]
const ARROW_COLORS = ["#facc15", "#ffffff", "#38bdf8", "#f87171", "#a3e635"]
const FORMATION_KEYS = Object.keys(FORMATIONS)
type FormationMap = Record<string, { positions: { x: number; y: number }[] }>

function formationPositions(f: string) {
  const map = FORMATIONS as unknown as FormationMap
  return (map[f] ?? map["4-3-3"]).positions
}

function homeSquad(f: string): Player[] {
  return formationPositions(f).map((p, i) => ({
    id: generateId(), name: `P${i + 1}`, number: i + 1, team: "HOME" as const, position: { x: p.x, y: p.y },
  }))
}

function awaySquad(): Player[] {
  return formationPositions("4-4-2").map((p, i) => ({
    id: generateId(), name: `O${i + 1}`, number: i + 1, team: "AWAY" as const,
    position: { x: PITCH_WIDTH - p.x, y: PITCH_HEIGHT - p.y },
  }))
}

const centre = (): Vec2 => ({ x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 })
const clampPt = (p: Vec2): Vec2 => ({ x: clamp(p.x, 0, PITCH_WIDTH), y: clamp(p.y, 0, PITCH_HEIGHT) })
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y)
const BALL = "__ball__"
const getPath = (s: EditorStep, id: string): MovementPath | undefined => (id === BALL ? s.ballMovementPath : s.movementPaths?.[id])
const withPath = (s: EditorStep, id: string, mp: MovementPath): EditorStep =>
  id === BALL ? { ...s, ballMovementPath: mp } : { ...s, movementPaths: { ...(s.movementPaths ?? {}), [id]: mp } }
/** start/end of a run between step `a` and step `b` for a player id (or the ball). */
function anchorsOf(a: EditorStep, b: EditorStep, id: string): { from: Vec2; to: Vec2 } | null {
  if (id === BALL) return { from: a.ballPosition, to: b.ballPosition }
  const f = a.players.find((p) => p.id === id)?.position
  const t = b.players.find((p) => p.id === id)?.position
  return f && t ? { from: f, to: t } : null
}

function freshStep(name: string, formation: string): EditorStep {
  return { id: generateId(), name, players: homeSquad(formation), ballPosition: centre(), arrows: [] }
}

function normaliseArrows(arrows: unknown): Arrow[] {
  return ((arrows as Partial<Arrow>[] | undefined) ?? []).map((a) => {
    const fx = a.fromX ?? 0, fy = a.fromY ?? 0, tx = a.toX ?? 0, ty = a.toY ?? 0
    const d = defaultCp(fx, fy, tx, ty)
    return {
      id: a.id ?? generateId(), fromX: fx, fromY: fy, toX: tx, toY: ty,
      cpX: a.cpX ?? d.cpX, cpY: a.cpY ?? d.cpY, color: a.color ?? "#facc15",
    }
  })
}

function initialState(ex: Exercise | null, ctx: TacticalEditorProps["newDrillContext"]): Snap {
  if (ex && ex.steps.length > 0) {
    return {
      meta: {
        name: ex.name, description: ex.description ?? "", formation: ex.formation || "4-3-3",
        startTime: ex.startTime ?? "", endTime: ex.endTime ?? "",
      },
      steps: ex.steps.map((s) => ({
        id: s.id ?? generateId(), name: s.name,
        players: structuredClone(s.players),
        ballPosition: s.ballPosition ? { ...s.ballPosition } : centre(),
        arrows: normaliseArrows(s.arrows),
        movementPaths: s.movementPaths ? structuredClone(s.movementPaths) : undefined,
        ballMovementPath: s.ballMovementPath ? { ...s.ballMovementPath } : undefined,
      })),
    }
  }
  const formation = ex?.formation && FORMATION_KEYS.includes(ex.formation) ? ex.formation : "4-3-3"
  return {
    meta: {
      name: ex?.name ?? (ctx?.type === "SESSION" ? "Training session" : ""),
      description: ex?.description ?? "", formation, startTime: ex?.startTime ?? "", endTime: ex?.endTime ?? "",
    },
    steps: [freshStep("Setup", formation)],
  }
}

/** Writes the interpolated pose at `head` (fractional step index) into the playback bus — no React involved. */
function writePose(steps: EditorStep[], head: number, bus: PlaybackBus) {
  const n = steps.length
  const i = clamp(Math.floor(head), 0, n - 1)
  const a = steps[i]
  const b = steps[Math.min(i + 1, n - 1)]
  const raw = i >= n - 1 ? 0 : head - i
  // 12% hold at the end of each segment so every step reads as a clear "frame"
  const f = easeInOut(clamp(raw / 0.88, 0, 1))

  for (const p of a.players) {
    const to = b.players.find((q) => q.id === p.id)?.position ?? p.position
    const saved = a.movementPaths?.[p.id]
    const mp = saved ?? defaultCp(p.position.x, p.position.y, to.x, to.y)
    const pt = saved?.pts?.length
      ? routePoint(routeKey(p.id, p.position, saved.pts, to), p.position, saved.pts, to, f)
      : bezierPt(p.position.x, p.position.y, mp.cpX, mp.cpY, to.x, to.y, f)
    let v = bus.players.get(p.id)
    if (!v) { v = { x: pt.x, y: pt.y }; bus.players.set(p.id, v) }
    v.x = pt.x; v.y = pt.y
  }
  const fb = a.ballPosition, tb = b.ballPosition
  const bp = a.ballMovementPath ?? defaultCp(fb.x, fb.y, tb.x, tb.y)
  const bpt = a.ballMovementPath?.pts?.length
    ? routePoint(routeKey(BALL, fb, a.ballMovementPath.pts, tb), fb, a.ballMovementPath.pts, tb, f)
    : bezierPt(fb.x, fb.y, bp.cpX, bp.cpY, tb.x, tb.y, f)
  bus.ball.x = bpt.x; bus.ball.y = bpt.y
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────

interface Palette {
  glass: string; glassSolid: string; border: string; text: string; sub: string; accent: string; accent2: string; hover: string; field: string
}

const DARK: Palette = {
  glass: "rgba(11,17,31,.74)", glassSolid: "rgba(11,17,31,.93)", border: "rgba(255,255,255,.09)", text: "#e8ecf4", sub: "#8b97ad",
  accent: "#22d3ee", accent2: "#a78bfa", hover: "rgba(255,255,255,.08)", field: "rgba(255,255,255,.06)",
}
const LIGHT: Palette = {
  glass: "rgba(255,255,255,.8)", glassSolid: "rgba(255,255,255,.95)", border: "rgba(15,23,42,.1)", text: "#0f172a", sub: "#5b6578",
  accent: "#0891b2", accent2: "#7c3aed", hover: "rgba(15,23,42,.07)", field: "rgba(15,23,42,.05)",
}

function IconBtn({
  c, onClick, title, active, disabled, children, wide, tone,
}: {
  c: Palette; onClick?: () => void; title?: string; active?: boolean; disabled?: boolean
  children: ReactNode; wide?: boolean; tone?: "danger" | "primary"
}) {
  const bg = tone === "primary" ? `linear-gradient(135deg, ${c.accent}, ${c.accent2})` : active ? `${c.accent}26` : "transparent"
  const col = tone === "primary" ? "#06121f" : tone === "danger" ? "#f87171" : active ? c.accent : c.text
  return (
    <button
      onClick={onClick} title={title} aria-label={title} disabled={disabled}
      className="vb-btn"
      style={{
        height: 34, minWidth: 34, padding: wide ? "0 12px" : 0, display: "inline-flex", alignItems: "center",
        justifyContent: "center", gap: 6, borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: disabled ? "default" : "pointer",
        border: `1px solid ${active ? c.accent + "88" : "transparent"}`, background: bg, color: col,
        opacity: disabled ? 0.35 : 1, transition: "background .15s, transform .1s, border-color .15s",
      }}
    >
      {children}
    </button>
  )
}

function Section({ c, icon, title, children }: { c: Palette; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div style={{ padding: "10px 12px", borderTop: `1px solid ${c.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: c.sub, fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
        {icon}{title}
      </div>
      {children}
    </div>
  )
}

function Toggle({ c, on, onChange, label }: { c: Palette; on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange} role="switch" aria-checked={on}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "5px 2px",
        background: "none", border: "none", color: c.text, fontSize: 12.5, cursor: "pointer",
      }}
    >
      <span>{label}</span>
      <span style={{ width: 30, height: 17, borderRadius: 9, background: on ? c.accent : c.field, position: "relative", transition: "background .2s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, insetInlineStart: on ? 15 : 2, width: 13, height: 13, borderRadius: 7, background: on ? "#06121f" : c.sub, transition: "inset-inline-start .2s" }} />
      </span>
    </button>
  )
}

function ScoreRing({ c, score }: { c: Palette; score: number }) {
  const r = 30, len = 2 * Math.PI * r
  const col = score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171"
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`${score}/100`}>
      <circle cx="38" cy="38" r={r} fill="none" stroke={c.field} strokeWidth="7" />
      <circle
        cx="38" cy="38" r={r} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * len} ${len}`} transform="rotate(-90 38 38)"
        style={{ transition: "stroke-dasharray .8s cubic-bezier(.2,.8,.2,1)" }}
      />
      <text x="38" y="43" textAnchor="middle" fontSize="19" fontWeight="800" fill={c.text}>{Math.round(score)}</text>
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TacticalEditor({ newDrillContext, onClearContext }: TacticalEditorProps) {
  const { profile } = useCoachStore()
  const { currentExercise, setCurrentExercise, addExercise, updateExercise, exercises } = useExerciseStore()
  const lang = profile.language || "en"
  const L = useCallback((k: EdKey) => te(k, lang), [lang])
  const rtl = lang === "he" || lang === "ar"
  const c = profile.theme === "light" ? LIGHT : DARK

  const [quality, setQualityState] = useState<"auto" | "high" | "low">(() => {
    try { const v = localStorage.getItem("visuball_quality"); return v === "high" || v === "low" ? v : "auto" } catch { return "auto" }
  })
  const setQuality = (v: "auto" | "high" | "low") => {
    setQualityState(v)
    try { localStorage.setItem("visuball_quality", v) } catch { /* private mode */ }
  }

  const glass: CSSProperties = {
    // backdrop-filter over a live WebGL canvas re-blurs every frame — only allowed in "High" quality
    background: quality === "high" ? c.glass : c.glassSolid, border: `1px solid ${c.border}`,
    ...(quality === "high" ? { backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } : {}),
    borderRadius: 16, boxShadow: quality === "high" ? "0 12px 40px rgba(0,0,0,.28)" : "0 4px 14px rgba(0,0,0,.25)",
    color: c.text,
  }

  // ── Document state (steps are treated as immutable → cheap undo snapshots) ──
  const init = useMemo(() => initialState(currentExercise, newDrillContext), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [steps, setStepsState] = useState<EditorStep[]>(init.steps)
  const [meta, setMetaState] = useState<Meta>(init.meta)
  const stepsRef = useRef(steps)
  const metaRef = useRef(meta)
  const history = useRef<{ undo: Snap[]; redo: Snap[] }>({ undo: [], redo: [] })

  const setSteps = useCallback((next: EditorStep[]) => { stepsRef.current = next; setStepsState(next) }, [])
  const setMeta = useCallback((next: Meta) => { metaRef.current = next; setMetaState(next) }, [])

  const pushHistory = useCallback(() => {
    history.current.undo.push({ steps: stepsRef.current, meta: metaRef.current })
    if (history.current.undo.length > 100) history.current.undo.shift()
    history.current.redo = []
  }, [])

  const commit = useCallback((next: EditorStep[], nextMeta?: Meta) => {
    pushHistory()
    setSteps(next)
    if (nextMeta) setMeta(nextMeta)
  }, [pushHistory, setSteps, setMeta])

  // ── Playback engine (mutable refs; React only sees ~20Hz UI sync) ──────────
  const bus = useRef<PlaybackBus>({ active: false, players: new Map(), ball: centre() })
  const headRef = useRef(0)
  const seekRef = useRef<number | null>(null)
  const playingRef = useRef(false)
  const speedRef = useRef(1)
  const loopRef = useRef(false)
  const idxRef = useRef(0)
  const uiHeadRef = useRef(0)
  const accRef = useRef(0)

  const [idx, setIdx] = useState(0)
  const [headUi, setHeadUi] = useState(0)
  const [playing, setPlayingState] = useState(false)
  const [speed, setSpeedState] = useState(1)
  const [loop, setLoopState] = useState(false)

  const setPlaying = useCallback((v: boolean) => { playingRef.current = v; setPlayingState(v) }, [])

  const onTick = useCallback((rawDt: number) => {
    const st = stepsRef.current
    const n = st.length
    const dt = Math.min(rawDt, 0.05)
    let head = clamp(headRef.current, 0, n - 1)

    if (seekRef.current !== null) {
      const target = clamp(seekRef.current, 0, n - 1)
      head += (target - head) * damp(7, dt)
      if (Math.abs(target - head) < 0.004) { head = target; seekRef.current = null }
    } else if (playingRef.current && n > 1) {
      head += (dt * speedRef.current) / STEP_SECONDS
      if (head >= n - 1) {
        if (loopRef.current) head -= n - 1
        else { head = n - 1; playingRef.current = false; setPlayingState(false) }
      }
    }
    headRef.current = head

    const midMove = n > 1 && Math.abs(head - Math.round(head)) > 1e-3
    bus.current.active = n > 1 && (playingRef.current || midMove || seekRef.current !== null)
    if (bus.current.active) writePose(st, head, bus.current)

    accRef.current += dt
    const ri = Math.round(head)
    const idxChanged = ri !== idxRef.current
    const settled = Number.isInteger(head) && uiHeadRef.current !== head // always publish the exact resting value
    if (settled || idxChanged || (accRef.current > 0.05 && Math.abs(head - uiHeadRef.current) > 1e-3)) {
      accRef.current = 0
      uiHeadRef.current = head
      setHeadUi(head)
      if (idxChanged) { idxRef.current = ri; setIdx(ri) }
    }
  }, [])

  const goto = useCallback((i: number, smooth = true) => {
    const t = clamp(i, 0, stepsRef.current.length - 1)
    playingRef.current = false; setPlayingState(false)
    if (smooth) seekRef.current = t
    else { seekRef.current = null; headRef.current = t; uiHeadRef.current = t; setHeadUi(t); idxRef.current = t; setIdx(t) }
  }, [])

  const togglePlay = useCallback(() => {
    const n = stepsRef.current.length
    if (n < 2) return
    if (playingRef.current) { setPlaying(false); return }
    seekRef.current = null
    if (headRef.current >= n - 1 - 1e-3) headRef.current = 0
    setPlaying(true)
  }, [setPlaying])

  const setSpeed = (v: number) => { speedRef.current = v; setSpeedState(v) }
  const toggleLoop = () => { loopRef.current = !loopRef.current; setLoopState(loopRef.current) }

  const frozen = steps.length > 1 && Math.abs(headUi - Math.round(headUi)) > 0.002
  const locked = playing || frozen || seekRef.current !== null
  const lockedRef = useRef(locked)
  lockedRef.current = locked

  const cur = steps[Math.min(idx, steps.length - 1)]
  const next = idx < steps.length - 1 ? steps[idx + 1] : null
  const curIdxSafe = Math.min(idx, steps.length - 1)

  // ── Board interaction state ────────────────────────────────────────────────
  const [tool, setTool] = useState<Tool>("drag")
  const [arrowColor, setArrowColor] = useState(ARROW_COLORS[0])
  const [arrowStart, setArrowStartState] = useState<Vec2 | null>(null)
  const arrowStartRef = useRef<Vec2 | null>(null)
  const [previewPos, setPreviewPos] = useState<Vec2 | null>(null)
  const [pathSelectedId, setPathSelectedId] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [overlays, setOverlays] = useState<Overlays>(NO_OVERLAYS)
  const [showArrows, setShowArrows] = useState(true)
  const [showPaths, setShowPaths] = useState(true)
  const [showNames, setShowNames] = useState(false)
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("broadcast")
  const [cameraNonce, setCameraNonce] = useState(0)
  const [flat, setFlat] = useState(false)
  const [spin, setSpin] = useState(0)

  const pickRef = useRef<((cx: number, cy: number) => Vec2 | null) | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const toolRef = useRef(tool)
  toolRef.current = tool
  const pathSelRef = useRef(pathSelectedId)
  pathSelRef.current = pathSelectedId
  const colorRef = useRef(arrowColor)
  colorRef.current = arrowColor

  const [panelOpen, setPanelOpen] = useState(true)
  const [showAI, setShowAI] = useState(false)
  const [analysis, setAnalysis] = useState<TacticalAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const flash = useCallback((m: string) => {
    setToast(m)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const setArrowStart = (v: Vec2 | null) => { arrowStartRef.current = v; setArrowStartState(v); if (!v) setPreviewPos(null) }

  // ── Step data helpers ──────────────────────────────────────────────────────
  const patchStep = useCallback((i: number, fn: (s: EditorStep) => EditorStep, record: boolean) => {
    const list = stepsRef.current.slice()
    list[i] = fn(list[i])
    if (record) commit(list); else setSteps(list)
  }, [commit, setSteps])


  const findHit = useCallback((x: number, y: number): Hit | null => {
    const st = stepsRef.current
    const i = clamp(idxRef.current, 0, st.length - 1)
    const s = st[i]
    const nx = i < st.length - 1 ? st[i + 1] : null
    const p: Vec2 = { x, y }

    if (toolRef.current === "arrow") {
      for (const a of s.arrows) if (dist(p, { x: a.cpX, y: a.cpY }) < 1.7) return { kind: "arrowcp", id: a.id, pos: { x: a.cpX, y: a.cpY } }
    }
    if (toolRef.current === "path" && nx) {
      const sel = pathSelRef.current
      const an = sel ? anchorsOf(s, nx, sel) : null
      if (sel && an) {
        if (dist(p, an.to) < 1.9) return { kind: "dest", id: sel, pos: an.to }
        const mp = getPath(s, sel)
        if (mp?.pts?.length) {
          for (let k = 0; k < mp.pts.length; k++) if (dist(p, mp.pts[k]) < 1.9) return { kind: "waypoint", id: sel, index: k, pos: mp.pts[k] }
        } else {
          const cp = mp ?? defaultCp(an.from.x, an.from.y, an.to.x, an.to.y)
          const mid = bezierMid(an.from.x, an.from.y, cp.cpX, cp.cpY, an.to.x, an.to.y)
          if (dist(p, mid) < 1.9) return { kind: "pathcp", id: sel, pos: mid }
        }
      }
    }
    let best: Hit | null = null
    let bestD = Infinity
    const bd = dist(p, s.ballPosition) * 0.8
    if (bd < 2.1) { best = { kind: "ball", pos: s.ballPosition }; bestD = bd }
    for (const q of s.players) {
      const d = dist(p, q.position)
      if (d < 2.5 && d < bestD) { best = { kind: "player", id: q.id, pos: q.position }; bestD = d }
    }
    return best
  }, [])

  const hitTest = useCallback((x: number, y: number) => !lockedRef.current && findHit(x, y) !== null, [findHit])

  const applyDragMove = useCallback((d: Drag, pt: Vec2) => {
    const i = idxRef.current
    const target = clampPt({ x: pt.x - d.dx, y: pt.y - d.dy })
    const h = d.hit
    if (h.kind === "player") {
      patchStep(i, (s) => ({ ...s, players: s.players.map((q) => (q.id === h.id ? { ...q, position: target } : q)) }), false)
    } else if (h.kind === "ball") {
      patchStep(i, (s) => ({ ...s, ballPosition: target }), false)
    } else if (h.kind === "arrowcp") {
      patchStep(i, (s) => ({ ...s, arrows: s.arrows.map((a) => (a.id === h.id ? { ...a, cpX: target.x, cpY: target.y } : a)) }), false)
    } else if (h.kind === "pathcp") {
      // dragging the mid handle of a plain curve turns it into the first waypoint
      const st = stepsRef.current
      const mp = getPath(st[i], h.id) ?? { cpX: 0, cpY: 0 }
      patchStep(i, (s) => withPath(s, h.id, { ...mp, pts: [target] }), false)
      d.hit = { kind: "waypoint", id: h.id, index: 0, pos: target }
    } else if (h.kind === "waypoint") {
      const st = stepsRef.current
      const mp = getPath(st[i], h.id)
      if (!mp?.pts) return
      patchStep(i, (s) => withPath(s, h.id, { ...mp, pts: mp.pts!.map((q, n) => (n === h.index ? target : q)) }), false)
    } else if (h.kind === "dest") {
      if (h.id === BALL) patchStep(i + 1, (s) => ({ ...s, ballPosition: target }), false)
      else patchStep(i + 1, (s) => ({ ...s, players: s.players.map((q) => (q.id === h.id ? { ...q, position: target } : q)) }), false)
    }
  }, [patchStep])

  const endDrag = useRef<() => void>(() => {})

  const removeWaypoint = (id: string, index: number) => {
    const i = idxRef.current
    const mp = getPath(stepsRef.current[i], id)
    if (!mp?.pts) return
    const pts = mp.pts.filter((_, k) => k !== index)
    patchStep(i, (s0) => withPath(s0, id, { ...mp, pts: pts.length ? pts : undefined }), true)
  }

  const onPitchDown = useCallback((x: number, y: number, button: number) => {
    if (lockedRef.current || button !== 0) return
    const t = toolRef.current
    const hit = findHit(x, y)
    const i = idxRef.current
    const startDrag = (h: Hit) => {
      // snapshot BEFORE the first change so a single undo reverts the whole gesture
      pushHistory()
      dragRef.current = { hit: h, dx: x - h.pos.x, dy: y - h.pos.y, moved: false }
      const move = (e: PointerEvent) => {
        const d = dragRef.current
        const pt = pickRef.current?.(e.clientX, e.clientY)
        if (!d || !pt) return
        d.moved = true
        applyDragMove(d, pt)
      }
      const up = () => endDrag.current()
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
      window.addEventListener("pointercancel", up)
      endDrag.current = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        window.removeEventListener("pointercancel", up)
        const d = dragRef.current
        dragRef.current = null
        if (d && !d.moved) {
          history.current.undo.pop() // plain click → nothing to undo
          if (d.hit.kind === "waypoint") removeWaypoint(d.hit.id, d.hit.index) // click a waypoint = delete it
        }
        endDrag.current = () => {}
      }
    }

    if (t === "drag") {
      if (hit && (hit.kind === "player" || hit.kind === "ball")) {
        setSelectedPlayerId(hit.kind === "player" ? hit.id : null)
        startDrag(hit)
      } else setSelectedPlayerId(null)
      return
    }

    if (t === "arrow") {
      if (hit?.kind === "arrowcp") { startDrag(hit); return }
      const start = arrowStartRef.current
      if (!start) {
        if (hit && (hit.kind === "player" || hit.kind === "ball")) setArrowStart({ ...hit.pos })
        return
      }
      const to = hit && (hit.kind === "player" || hit.kind === "ball") ? hit.pos : clampPt({ x, y })
      if (dist(start, to) < 1.5) { setArrowStart(null); return }
      const cp = defaultCp(start.x, start.y, to.x, to.y)
      const arrow: Arrow = {
        id: generateId(), fromX: start.x, fromY: start.y, toX: to.x, toY: to.y, cpX: cp.cpX, cpY: cp.cpY, color: colorRef.current,
      }
      patchStep(i, (s) => ({ ...s, arrows: [...s.arrows, arrow] }), true)
      setArrowStart(null)
      return
    }

    // path tool: pick a runner, then shape the route
    if (hit && (hit.kind === "pathcp" || hit.kind === "waypoint" || hit.kind === "dest")) { startDrag(hit); return }
    if (hit?.kind === "player") { setPathSelectedId(hit.id); return }
    if (hit?.kind === "ball") { setPathSelectedId(BALL); return }
    const sel = pathSelRef.current
    if (!sel) { setPathSelectedId(null); return }
    let st = stepsRef.current
    if (i >= st.length - 1) {
      // no next step yet → create it so the route has somewhere to go
      const base = structuredClone(st[i])
      commit([...st, { ...base, id: generateId(), name: `${L("step")} ${st.length + 1}`, arrows: [], movementPaths: undefined, ballMovementPath: undefined }])
      st = stepsRef.current
    }
    const an = anchorsOf(st[i], st[i + 1], sel)
    if (!an) { setPathSelectedId(null); return }
    const pt = clampPt({ x, y })
    const existing = getPath(st[i], sel)
    if (dist(an.from, an.to) < 1.5 && !existing?.pts?.length) {
      // runner hasn't been sent anywhere yet: first click = destination
      patchStep(i + 1, (s0) => sel === BALL
        ? { ...s0, ballPosition: pt }
        : { ...s0, players: s0.players.map((q) => (q.id === sel ? { ...q, position: pt } : q)) }, true)
    } else {
      // click on empty grass = add a waypoint on the nearest part of the route
      const pts = existing?.pts ?? []
      const at = nearestSegment(an.from, pts, an.to, pt)
      const mp = existing ?? { cpX: 0, cpY: 0 }
      patchStep(i, (s0) => withPath(s0, sel, { ...mp, pts: [...pts.slice(0, at), pt, ...pts.slice(at)] }), true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findHit, pushHistory, applyDragMove, patchStep, commit])

  useEffect(() => () => endDrag.current(), [])

  const onPitchMove = useCallback((x: number, y: number) => {
    if (arrowStartRef.current) setPreviewPos({ x, y })
  }, [])

  const deleteArrow = useCallback((id: string) => {
    patchStep(idxRef.current, (s) => ({ ...s, arrows: s.arrows.filter((a) => a.id !== id) }), true)
  }, [patchStep])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const chooseTool = (t: Tool) => { setTool(t); setArrowStart(null); setPathSelectedId(null) }

  const undo = useCallback(() => {
    const h = history.current
    const snap = h.undo.pop()
    if (!snap) return
    h.redo.push({ steps: stepsRef.current, meta: metaRef.current })
    setSteps(snap.steps); setMeta(snap.meta)
    const i = clamp(idxRef.current, 0, snap.steps.length - 1)
    goto(i, false)
  }, [goto, setSteps, setMeta])

  const redo = useCallback(() => {
    const h = history.current
    const snap = h.redo.pop()
    if (!snap) return
    h.undo.push({ steps: stepsRef.current, meta: metaRef.current })
    setSteps(snap.steps); setMeta(snap.meta)
    goto(clamp(idxRef.current, 0, snap.steps.length - 1), false)
  }, [goto, setSteps, setMeta])

  const addStep = (copyArrows: boolean) => {
    const i = idxRef.current
    const base = structuredClone(stepsRef.current[i])
    const ns: EditorStep = {
      ...base,
      id: generateId(),
      name: `${L("step")} ${stepsRef.current.length + 1}`,
      arrows: copyArrows ? base.arrows.map((a) => ({ ...a, id: generateId() })) : [],
      movementPaths: copyArrows ? base.movementPaths : undefined,
      ballMovementPath: copyArrows ? base.ballMovementPath : undefined,
    }
    const list = stepsRef.current.slice()
    list.splice(i + 1, 0, ns)
    commit(list)
    goto(i + 1, true)
  }

  const deleteStep = () => {
    if (stepsRef.current.length < 2) return
    const i = idxRef.current
    const list = stepsRef.current.filter((_, k) => k !== i)
    commit(list)
    goto(clamp(i - 1 < 0 ? 0 : i - 1, 0, list.length - 1), false)
  }

  const resetPositions = () => {
    const pos = formationPositions(metaRef.current.formation)
    const away = formationPositions("4-4-2")
    patchStep(idxRef.current, (s) => {
      let h = 0, a = 0
      const players = s.players.map((p) => {
        if (p.team === "HOME") { const q = pos[h++ % pos.length]; return { ...p, position: { x: q.x, y: q.y } } }
        const q = away[a++ % away.length]
        return { ...p, position: { x: PITCH_WIDTH - q.x, y: PITCH_HEIGHT - q.y } }
      })
      return { ...s, players, ballPosition: centre(), movementPaths: undefined, ballMovementPath: undefined }
    }, true)
  }

  const changeFormation = (f: string) => {
    const pos = formationPositions(f)
    const list = stepsRef.current.slice()
    const i = idxRef.current
    let h = 0
    list[i] = { ...list[i], players: list[i].players.map((p) => (p.team === "HOME" ? { ...p, position: { ...pos[h++ % pos.length] } } : p)) }
    commit(list, { ...metaRef.current, formation: f })
  }

  const hasAway = cur.players.some((p) => p.team === "AWAY")
  const addOpponent = () => {
    if (hasAway) return
    const squad = awaySquad()
    commit(stepsRef.current.map((s) => ({ ...s, players: [...s.players, ...squad.map((p) => ({ ...p, position: { ...p.position } }))] })))
  }

  const removeSelectedPlayer = () => {
    const id = selectedPlayerId
    if (!id) return
    commit(stepsRef.current.map((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) })))
    setSelectedPlayerId(null)
  }

  const applyAIDrill = (drill: AIDrillResult) => {
    const homeIds: Record<number, string> = {}
    const awayIds: Record<number, string> = {}
    drill.steps.forEach((s) => {
      s.homePlayers.forEach((p) => { homeIds[p.number] ??= generateId() })
      s.awayPlayers.forEach((p) => { awayIds[p.number] ??= generateId() })
    })
    const mk = (p: { number: number; x: number; y: number }, team: "HOME" | "AWAY", ids: Record<number, string>): Player => ({
      id: ids[p.number], name: team === "HOME" ? `P${p.number}` : `O${p.number}`, number: p.number, team,
      position: clampPt({ x: p.x, y: p.y }),
    })
    const built: EditorStep[] = drill.steps.map((s) => ({
      id: generateId(), name: s.name,
      players: [...s.homePlayers.map((p) => mk(p, "HOME", homeIds)), ...s.awayPlayers.map((p) => mk(p, "AWAY", awayIds))],
      ballPosition: clampPt(s.ball),
      arrows: (s.arrows ?? []).map((a) => {
        const cp = defaultCp(a.fromX, a.fromY, a.toX, a.toY)
        return { id: generateId(), fromX: a.fromX, fromY: a.fromY, toX: a.toX, toY: a.toY, cpX: cp.cpX, cpY: cp.cpY, color: a.color }
      }),
    }))
    commit(built, { ...metaRef.current, name: drill.name, description: drill.description })
    goto(0, false)
    setShowAI(false)
    flash(drill.name)
  }

  const runAnalysis = async () => {
    if (analyzing) return
    setAnalyzing(true)
    setShowAI(false)
    const s = stepsRef.current[idxRef.current]
    const pick = (team: "HOME" | "AWAY") =>
      s.players.filter((p) => p.team === team).map((p) => ({ number: p.number, x: p.position.x, y: p.position.y }))
    try {
      const r = await analyzeTactics({
        stepName: s.name, formation: metaRef.current.formation, home: pick("HOME"), away: pick("AWAY"),
        ball: s.ballPosition, language: lang,
      })
      setAnalysis(r)
    } catch (e) {
      console.error(e)
      flash("AI error")
    } finally {
      setAnalyzing(false)
    }
  }

  const save = () => {
    const m = metaRef.current
    if (!m.name.trim()) { flash(L("enterName")); return }
    const existing = currentExercise
    const isStored = !!existing && (exercises[existing.date] ?? []).some((e) => e.id === existing.id)
    const ex: Exercise = {
      id: isStored && existing ? existing.id : generateId(),
      name: m.name.trim(), description: m.description,
      date: isStored && existing ? existing.date : newDrillContext?.date ?? getCurrentDate(),
      startTime: m.startTime, endTime: m.endTime, formation: m.formation,
      type: newDrillContext?.type ?? existing?.type ?? "DRILL",
      steps: stepsRef.current.map((s) => ({
        id: s.id, name: s.name, players: structuredClone(s.players), ballPosition: { ...s.ballPosition }, ballVisible: true,
        arrows: structuredClone(s.arrows), movementPaths: s.movementPaths ? structuredClone(s.movementPaths) : undefined,
        ballMovementPath: s.ballMovementPath ? { ...s.ballMovementPath } : undefined,
      })),
      tags: existing?.tags, category: existing?.category, ageGroup: existing?.ageGroup,
    }
    if (isStored) updateExercise(ex); else addExercise(ex)
    flash(L("saved"))
    window.setTimeout(() => { setCurrentExercise(null); onClearContext?.() }, 650)
  }

  const leave = () => { setCurrentExercise(null); onClearContext?.() }

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); save(); return }
      if (e.key === " ") { e.preventDefault(); togglePlay(); return }
      if (e.key === "ArrowRight") { goto(idxRef.current + (rtl ? -1 : 1)); return }
      if (e.key === "ArrowLeft") { goto(idxRef.current + (rtl ? 1 : -1)); return }
      if (e.key === "Escape") { setArrowStart(null); setPathSelectedId(null); setSelectedPlayerId(null); return }
      if (!mod && e.key.toLowerCase() === "v") toggleViewRef.current()
      if (!mod && e.key === "1") chooseTool("drag")
      if (!mod && e.key === "2") chooseTool("arrow")
      if (!mod && e.key === "3") chooseTool("path")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }) // intentionally re-bound every render: handlers close over fresh `save`/`rtl`

  // ── Derived view data ──────────────────────────────────────────────────────
  const hint =
    locked ? L("frozen")
    : tool === "drag" ? (flat ? "" : L("hintDrag"))
    : tool === "arrow" ? (arrowStart ? L("hintArrow2") : L("hintArrow1"))
    : !next ? L("hintPathNeed")
    : pathSelectedId ? L("hintPathSel") : L("hintPath")

  const selectedPlayer = cur.players.find((p) => p.id === selectedPlayerId) ?? null
  const homeCount = cur.players.filter((p) => p.team === "HOME").length
  const awayCount = cur.players.length - homeCount

  const camBtns: { k: CameraPreset; label: EdKey }[] = [
    { k: "broadcast", label: "camBroadcast" }, { k: "tactical", label: "camTactical" }, { k: "top", label: "camTop" },
    { k: "end", label: "camEnd" }, { k: "ball", label: "camBall" },
  ]
  const setCam = (k: CameraPreset) => { setCameraPreset(k); setCameraNonce((n) => n + 1) }
  const SPINS: CameraPreset[] = ["top", "top90", "top180", "top270"]
  const toggleView = () => {
    const f = !flat
    setFlat(f); setSpin(0)
    setCam(f ? "top" : "broadcast")
  }
  const rotate2D = () => { const n = (spin + 1) % 4; setSpin(n); setCam(SPINS[n]) }
  const toggleViewRef = useRef(toggleView)
  toggleViewRef.current = toggleView

  const field: CSSProperties = {
    background: c.field, border: `1px solid ${c.border}`, color: c.text, borderRadius: 10, fontSize: 13, outline: "none",
  }

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#060913", color: c.text, fontFamily: "'Noto Sans Hebrew', 'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .vb-btn:hover:not(:disabled){background:${c.hover}!important}
        .vb-btn:active:not(:disabled){transform:scale(.95)}
        .vb-scroll::-webkit-scrollbar{width:6px;height:6px}
        .vb-scroll::-webkit-scrollbar-thumb{background:${c.border};border-radius:3px}
        .vb-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:3px;outline:none;cursor:pointer}
        .vb-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid ${c.accent};box-shadow:0 2px 8px rgba(0,0,0,.4)}
        .vb-range::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#fff;border:3px solid ${c.accent}}
        @keyframes vb-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .vb-in{animation:vb-in .35s cubic-bezier(.2,.8,.2,1) both}
      `}</style>

      {/* 3D board */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, isolation: "isolate" }}>
        <PitchScene
          players={cur.players} ball={cur.ballPosition} arrows={cur.arrows}
          currentStep={cur} nextStep={next}
          tool={tool} arrowColor={arrowColor} arrowStart={arrowStart} previewPos={previewPos}
          pathSelectedId={pathSelectedId} selectedPlayerId={selectedPlayerId}
          showArrows={showArrows} showPaths={showPaths} showNames={showNames} overlays={overlays}
          cameraPreset={cameraPreset} cameraNonce={cameraNonce} flat={flat} quality={quality} locked={locked}
          bus={bus} onTick={onTick} pickRef={pickRef} hitTest={hitTest}
          onPitchDown={onPitchDown} onPitchMove={onPitchMove} onDeleteArrow={deleteArrow}
          errorTitle={L("webglTitle")} errorHint={L("webglHint")} retryLabel={L("retry")}
        />
      </div>

      {/* Top bar */}
      <header className="vb-in" style={{ ...glass, position: "absolute", top: 12, insetInline: 12, height: 52, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", zIndex: 20 }}>
        <IconBtn c={c} onClick={leave} title={L("back")}><ArrowLeft size={18} style={{ transform: rtl ? "scaleX(-1)" : undefined }} /></IconBtn>
        <input
          value={meta.name} onChange={(e) => setMeta({ ...metaRef.current, name: e.target.value })}
          placeholder={L("drillName")} aria-label={L("drillName")}
          style={{ ...field, flex: "1 1 160px", maxWidth: 340, height: 34, padding: "0 12px", fontWeight: 600 }}
        />
        <div style={{ width: 1, height: 24, background: c.border }} />
        <IconBtn c={c} onClick={undo} disabled={history.current.undo.length === 0} title={`${L("undo")} (Ctrl+Z)`}><Undo2 size={17} /></IconBtn>
        <IconBtn c={c} onClick={redo} disabled={history.current.redo.length === 0} title={`${L("redo")} (Ctrl+Shift+Z)`}><Redo2 size={17} /></IconBtn>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", padding: 3, borderRadius: 11, background: c.field }} role="group" aria-label="2D / 3D">
          <IconBtn c={c} wide active={!flat} onClick={() => flat && toggleView()} title="3D (V)">3D</IconBtn>
          <IconBtn c={c} wide active={flat} onClick={() => !flat && toggleView()} title="2D (V)">2D</IconBtn>
        </div>
        {flat && <IconBtn c={c} onClick={rotate2D} title="Rotate 90°"><RotateCw size={16} /></IconBtn>}
        <IconBtn c={c} onClick={runAnalysis} disabled={analyzing} wide title={L("analyze")}>
          <Brain size={16} />{analyzing ? L("analyzing") : L("analyze")}
        </IconBtn>
        <IconBtn c={c} onClick={() => { setShowAI((v) => !v); setAnalysis(null) }} active={showAI} wide title={L("aiCoach")}>
          <Sparkles size={16} />{L("aiCoach")}
        </IconBtn>
        <IconBtn c={c} onClick={save} wide tone="primary" title={`${L("save")} (Ctrl+S)`}><Save size={16} />{L("save")}</IconBtn>
      </header>

      {/* Left tool panel */}
      <div style={{ position: "absolute", top: 76, insetInlineStart: panelOpen ? 256 : 12, zIndex: 16, transition: "inset-inline-start .25s" }}>
        <IconBtn c={c} onClick={() => setPanelOpen(!panelOpen)} title={L("tools")} active={panelOpen}><Layers size={16} /></IconBtn>
      </div>
      {panelOpen && <aside className="vb-in vb-scroll" style={{ ...glass, position: "absolute", top: 76, insetInlineStart: 12, width: 236, maxHeight: "calc(100vh - 290px)", overflowY: "auto", zIndex: 15 }}>
        <div style={{ padding: 12 }}>
          <textarea
            value={meta.description} onChange={(e) => setMeta({ ...metaRef.current, description: e.target.value })}
            placeholder={L("notes")} rows={2}
            style={{ ...field, width: "100%", padding: "8px 10px", resize: "none", fontSize: 12.5 }}
          />
        </div>

        <Section c={c} icon={<MousePointer2 size={12} />} title={L("tools")}>
          <div style={{ display: "flex", gap: 4 }}>
            <IconBtn c={c} active={tool === "drag"} onClick={() => chooseTool("drag")} wide title={`${L("select")} (1)`}><MousePointer2 size={15} />{L("select")}</IconBtn>
            <IconBtn c={c} active={tool === "arrow"} onClick={() => chooseTool("arrow")} wide title={`${L("arrow")} (2)`}><MoveUpRight size={15} /></IconBtn>
            <IconBtn c={c} active={tool === "path"} onClick={() => chooseTool("path")} wide title={`${L("path")} (3)`}><Route size={15} /></IconBtn>
          </div>
          {tool === "arrow" && (
            <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
              {ARROW_COLORS.map((col) => (
                <button
                  key={col} onClick={() => setArrowColor(col)} aria-label={col}
                  style={{ width: 22, height: 22, borderRadius: 11, background: col, cursor: "pointer", border: arrowColor === col ? `2.5px solid ${c.text}` : `1.5px solid ${c.border}`, boxShadow: arrowColor === col ? `0 0 0 3px ${col}44` : "none" }}
                />
              ))}
            </div>
          )}
        </Section>

        <Section c={c} icon={<Users size={12} />} title={`${L("squad")} · ${homeCount}+${awayCount}`}>
          <select
            value={meta.formation} onChange={(e) => changeFormation(e.target.value)} aria-label={L("formation")}
            style={{ ...field, width: "100%", height: 32, padding: "0 8px", marginBottom: 8 }}
          >
            {FORMATION_KEYS.map((f) => <option key={f} value={f} style={{ color: "#0f172a" }}>{f}</option>)}
          </select>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <IconBtn c={c} wide onClick={resetPositions} title={L("resetPositions")}><RotateCcw size={14} /><span style={{ flex: 1, textAlign: "start" }}>{L("resetPositions")}</span></IconBtn>
            <IconBtn c={c} wide onClick={addOpponent} disabled={hasAway} title={L("addOpponent")}><Plus size={14} /><span style={{ flex: 1, textAlign: "start" }}>{L("addOpponent")}</span></IconBtn>
            <IconBtn c={c} wide onClick={() => patchStep(idxRef.current, (s) => ({ ...s, arrows: [] }), true)} disabled={cur.arrows.length === 0} title={L("clearArrows")}><Wand2 size={14} /><span style={{ flex: 1, textAlign: "start" }}>{L("clearArrows")}</span></IconBtn>
          </div>
          {selectedPlayer && (
            <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: 10, background: c.field, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: selectedPlayer.team === "HOME" ? "#3b82f6" : "#ef4444", color: "#fff", fontWeight: 800, fontSize: 11, display: "grid", placeItems: "center" }}>{selectedPlayer.number}</span>
              <span style={{ flex: 1 }}>{selectedPlayer.name}</span>
              <IconBtn c={c} tone="danger" onClick={removeSelectedPlayer} title={L("delete")}><Trash2 size={14} /></IconBtn>
            </div>
          )}
        </Section>

        <Section c={c} icon={<Layers size={12} />} title={L("layers")}>
          <Toggle c={c} on={overlays.thirds} onChange={() => setOverlays({ ...overlays, thirds: !overlays.thirds })} label={L("thirds")} />
          <Toggle c={c} on={overlays.quarters} onChange={() => setOverlays({ ...overlays, quarters: !overlays.quarters })} label={L("quarters")} />
          <Toggle c={c} on={overlays.channels} onChange={() => setOverlays({ ...overlays, channels: !overlays.channels })} label={L("channels")} />
          <Toggle c={c} on={overlays.pep} onChange={() => setOverlays({ ...overlays, pep: !overlays.pep })} label={L("pepBoxes")} />
          <Toggle c={c} on={overlays.wings} onChange={() => setOverlays({ ...overlays, wings: !overlays.wings })} label={L("wings")} />
          <div style={{ height: 1, background: c.border, margin: "6px 0" }} />
          <Toggle c={c} on={showArrows} onChange={() => setShowArrows(!showArrows)} label={L("arrowsShow")} />
          <Toggle c={c} on={showPaths} onChange={() => setShowPaths(!showPaths)} label={L("pathsShow")} />
          <Toggle c={c} on={showNames} onChange={() => setShowNames(!showNames)} label={L("names")} />
          <div style={{ height: 1, background: c.border, margin: "6px 0" }} />
          <div style={{ fontSize: 12.5, marginBottom: 6 }}>{L("quality")}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["auto", "high", "low"] as const).map((q) => (
              <IconBtn key={q} c={c} wide active={quality === q} onClick={() => setQuality(q)}>{q === "auto" ? "Auto" : q === "high" ? "High" : "Low"}</IconBtn>
            ))}
          </div>
        </Section>
      </aside>}

      {/* Camera presets */}
      {!flat && <div className="vb-in" style={{ ...glass, position: "absolute", top: 76, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 2, padding: 4, borderRadius: 14, zIndex: 15, maxWidth: "calc(100vw - 520px)", overflowX: "auto" }}>
        <Video size={14} style={{ margin: "0 8px", color: c.sub, flexShrink: 0 }} />
        {camBtns.map((b) => (
          <IconBtn key={b.k} c={c} wide active={cameraPreset === b.k} onClick={() => setCam(b.k)}>{L(b.label)}</IconBtn>
        ))}
      </div>}

      {/* Hint / frozen banner */}
      <div style={{ position: "absolute", bottom: 148, left: "50%", transform: "translateX(-50%)", zIndex: 14, display: "flex", gap: 8, alignItems: "center" }}>
        {hint && <div style={{ ...glass, borderRadius: 999, padding: "6px 14px", fontSize: 12, color: c.sub, whiteSpace: "nowrap" }}>{hint}</div>}
        {frozen && !playing && (
          <IconBtn c={c} wide tone="primary" onClick={() => goto(Math.round(headRef.current), false)}><Eye size={14} />{L("editHere")}</IconBtn>
        )}
      </div>

      {/* Playback dock */}
      <footer className="vb-in" style={{ ...glass, position: "absolute", bottom: 12, insetInline: 12, padding: "10px 14px 12px", zIndex: 20 }}>
        <div className="vb-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8 }}>
          {steps.map((s, i) => (
            <button
              key={s.id} onClick={() => goto(i)}
              style={{
                flexShrink: 0, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${i === curIdxSafe ? c.accent : c.border}`,
                background: i === curIdxSafe ? `${c.accent}22` : "transparent", color: i === curIdxSafe ? c.accent : c.sub,
                transition: "all .15s",
              }}
            >
              {i + 1}. {s.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <IconBtn c={c} onClick={() => goto(idxRef.current - 1)} disabled={curIdxSafe === 0} title={L("prev")}><SkipBack size={17} style={{ transform: rtl ? "scaleX(-1)" : undefined }} /></IconBtn>
          <IconBtn c={c} tone="primary" onClick={togglePlay} disabled={steps.length < 2} title={playing ? L("pause") : L("play")}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </IconBtn>
          <IconBtn c={c} onClick={() => goto(idxRef.current + 1)} disabled={curIdxSafe >= steps.length - 1} title={L("next")}><SkipForward size={17} style={{ transform: rtl ? "scaleX(-1)" : undefined }} /></IconBtn>

          <div style={{ flex: "1 1 220px", minWidth: 160, padding: "0 8px", display: "flex", flexDirection: "column", gap: 3 }}>
            <input
              type="range" className="vb-range" min={0} max={Math.max(steps.length - 1, 0.001)} step={0.001}
              value={headUi} disabled={steps.length < 2} aria-label={L("step")}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                playingRef.current = false; setPlayingState(false); seekRef.current = null
                headRef.current = v
                setHeadUi(v); uiHeadRef.current = v
                if (Math.round(v) !== idxRef.current) { idxRef.current = Math.round(v); setIdx(idxRef.current) }
              }}
              style={{ width: "100%", direction: "ltr", background: `linear-gradient(to right, ${c.accent} ${(steps.length > 1 ? headUi / (steps.length - 1) : 0) * 100}%, ${c.field} 0)` }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", direction: "ltr", padding: "0 6px" }}>
              {steps.map((s, i) => <span key={s.id} style={{ width: 4, height: 4, borderRadius: 2, background: i <= headUi + 0.01 ? c.accent : c.sub, opacity: 0.7 }} />)}
            </div>
          </div>

          <span style={{ fontSize: 12, color: c.sub, minWidth: 44, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{curIdxSafe + 1} / {steps.length}</span>

          <select
            value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} aria-label={L("speed")} title={L("speed")}
            style={{ ...field, height: 32, padding: "0 6px", fontSize: 12 }}
          >
            {SPEEDS.map((s) => <option key={s} value={s} style={{ color: "#0f172a" }}>{s}×</option>)}
          </select>
          <IconBtn c={c} active={loop} onClick={toggleLoop} title={L("loop")}><Repeat size={16} /></IconBtn>

          <div style={{ width: 1, height: 24, background: c.border, margin: "0 2px" }} />
          <input
            value={cur.name} onChange={(e) => patchStep(idxRef.current, (s) => ({ ...s, name: e.target.value }), false)}
            aria-label={L("step")} disabled={locked}
            style={{ ...field, width: 120, height: 32, padding: "0 10px", fontSize: 12 }}
          />
          <IconBtn c={c} onClick={() => addStep(false)} disabled={locked} title={L("addStep")}><Plus size={17} /></IconBtn>
          <IconBtn c={c} onClick={() => addStep(true)} disabled={locked} title={L("duplicateStep")}><Copy size={16} /></IconBtn>
          <IconBtn c={c} tone="danger" onClick={deleteStep} disabled={locked || steps.length < 2} title={L("deleteStep")}><Trash2 size={16} /></IconBtn>
        </div>
      </footer>

      {/* AI coach drawer */}
      {showAI && (
        <div className="vb-in" style={{ ...glass, position: "absolute", top: 76, insetInlineEnd: 12, bottom: 148, width: 400, maxWidth: "calc(100vw - 24px)", zIndex: 25, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <AICoachPanel onApply={applyAIDrill} onClose={() => setShowAI(false)} />
        </div>
      )}

      {/* Tactical analysis */}
      {analysis && !showAI && (
        <div className="vb-in vb-scroll" style={{ ...glass, position: "absolute", top: 76, insetInlineEnd: 12, width: 340, maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100vh - 240px)", overflowY: "auto", zIndex: 25, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <ScoreRing c={c} score={analysis.score} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: c.sub, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{L("analysisTitle")}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{L("score")}</div>
            </div>
            <IconBtn c={c} onClick={() => setAnalysis(null)} title={L("close")}><X size={16} /></IconBtn>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: c.text, margin: "0 0 12px" }}>{analysis.summary}</p>
          {analysis.exposedAreas.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: c.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{L("exposed")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {analysis.exposedAreas.map((a, i) => (
                  <span key={i} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(248,113,113,.14)", color: "#f87171", border: "1px solid rgba(248,113,113,.3)" }}>{a}</span>
                ))}
              </div>
            </>
          )}
          {analysis.recommendations.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: c.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{L("recommendations")}</div>
              <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 5 }}>
                {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}
          {analysis.source === "local" && <div style={{ marginTop: 12, fontSize: 11, color: c.sub }}>{L("offline")}</div>}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="vb-in" style={{ ...glass, position: "absolute", top: 76, left: "50%", transform: "translateX(-50%)", padding: "10px 18px", borderRadius: 999, zIndex: 40, fontSize: 13, fontWeight: 600, borderColor: `${c.accent}88` }}>
          {toast}
        </div>
      )}
    </div>
  )
}
