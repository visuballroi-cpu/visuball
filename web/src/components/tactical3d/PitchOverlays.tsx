import { useMemo } from "react"
import * as THREE from "three"
import { Html } from "@react-three/drei"
import { LAYER, toWorldX, toWorldZ } from "@/utils/geometry"
import { PITCH_WIDTH as W, PITCH_HEIGHT as H } from "@/constants"
import type { Overlays } from "./types"

// Lane edges (m, across the pitch). Wings sit outside the penalty-box edges,
// half-spaces between box edge and goal-area edge, centre is the goal-area width.
const LANES = [0, 13.84, 24.84, 43.16, 54.16, H]
const LANE_NAMES = ["Wing", "Half-space", "Centre", "Half-space", "Wing"]

const fillCache = new Map<string, THREE.MeshBasicMaterial>()
function fillMat(color: string, opacity: number) {
  const k = `${color}|${opacity}`
  let m = fillCache.get(k)
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    })
    fillCache.set(k, m)
  }
  return m
}

/** Rect in pitch data-space (x along length, y across width). */
function Zone({
  x0, x1, y0, y1, color, opacity = 0.12,
}: { x0: number; x1: number; y0: number; y1: number; color: string; opacity?: number }) {
  return (
    <mesh
      position={[toWorldX((x0 + x1) / 2), LAYER.zoneFill, toWorldZ((y0 + y1) / 2)]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={fillMat(color, opacity)}
      renderOrder={1}
    >
      <planeGeometry args={[x1 - x0, y1 - y0]} />
    </mesh>
  )
}

function VLine({ x, color }: { x: number; color: string }) {
  return (
    <mesh position={[toWorldX(x), LAYER.zoneLine, 0]} rotation={[-Math.PI / 2, 0, 0]} material={fillMat(color, 0.85)} renderOrder={1}>
      <planeGeometry args={[0.18, H]} />
    </mesh>
  )
}
function HLine({ y, color }: { y: number; color: string }) {
  return (
    <mesh position={[0, LAYER.zoneLine, toWorldZ(y)]} rotation={[-Math.PI / 2, 0, 0]} material={fillMat(color, 0.85)} renderOrder={1}>
      <planeGeometry args={[W, 0.18]} />
    </mesh>
  )
}

function Label({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  return (
    <Html position={[toWorldX(x), 0.1, toWorldZ(y)]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
      <span
        style={{
          fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 1.2,
          textTransform: "uppercase", color, textShadow: "0 1px 3px rgba(0,0,0,.9)", whiteSpace: "nowrap",
          opacity: 0.9,
        }}
      >
        {text}
      </span>
    </Html>
  )
}

function Thirds() {
  const edges = [0, W / 3, (2 * W) / 3, W]
  const cols = ["#3b82f6", "#a855f7", "#f59e0b"]
  const names = ["Defensive third", "Middle third", "Attacking third"]
  return (
    <group>
      {cols.map((c, i) => (
        <group key={i}>
          <Zone x0={edges[i]} x1={edges[i + 1]} y0={0} y1={H} color={c} opacity={0.13} />
          <Label x={(edges[i] + edges[i + 1]) / 2} y={H / 2} text={names[i]} color={c} />
        </group>
      ))}
      <VLine x={W / 3} color="#c4b5fd" />
      <VLine x={(2 * W) / 3} color="#c4b5fd" />
    </group>
  )
}

function Quarters() {
  const q = W / 4
  const cols = ["#06b6d4", "#14b8a6"]
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <group key={i}>
          <Zone x0={i * q} x1={(i + 1) * q} y0={0} y1={H} color={cols[i % 2]} opacity={0.12} />
          <Label x={i * q + q / 2} y={H / 2} text={`Q${i + 1}`} color="#67e8f9" />
        </group>
      ))}
      {[1, 2, 3].map((i) => <VLine key={i} x={i * q} color="#67e8f9" />)}
    </group>
  )
}

function Channels() {
  const cols = ["#84cc16", "#10b981"]
  return (
    <group>
      {LANE_NAMES.map((n, i) => (
        <group key={i}>
          <Zone x0={0} x1={W} y0={LANES[i]} y1={LANES[i + 1]} color={cols[i % 2]} opacity={0.12} />
          <Label x={6} y={(LANES[i] + LANES[i + 1]) / 2} text={n} color="#bef264" />
        </group>
      ))}
      {LANES.slice(1, -1).map((y) => <HLine key={y} y={y} color="#bef264" />)}
    </group>
  )
}

function Wings() {
  return (
    <group>
      <Zone x0={0} x1={W} y0={0} y1={LANES[1]} color="#fb923c" opacity={0.2} />
      <Zone x0={0} x1={W} y0={LANES[4]} y1={H} color="#fb923c" opacity={0.2} />
      <HLine y={LANES[1]} color="#fdba74" />
      <HLine y={LANES[4]} color="#fdba74" />
      <Label x={W / 2} y={LANES[1] / 2} text="Left wing" color="#fed7aa" />
      <Label x={W / 2} y={(LANES[4] + H) / 2} text="Right wing" color="#fed7aa" />
    </group>
  )
}

/** Guardiola's 20 zones: 4 lines (box edge / halfway / box edge) × 5 lanes. */
function PepBoxes() {
  const xs = [0, 16.5, W / 2, W - 16.5, W]
  const zones = useMemo(() => {
    const out: { x0: number; x1: number; y0: number; y1: number; n: number; alt: boolean }[] = []
    let n = 1
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 4; c++) {
        out.push({ x0: xs[c], x1: xs[c + 1], y0: LANES[r], y1: LANES[r + 1], n: n++, alt: (r + c) % 2 === 0 })
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <group>
      {zones.map((z) => (
        <group key={z.n}>
          <Zone x0={z.x0} x1={z.x1} y0={z.y0} y1={z.y1} color={z.alt ? "#fbbf24" : "#f97316"} opacity={0.13} />
          <Label x={(z.x0 + z.x1) / 2} y={(z.y0 + z.y1) / 2} text={String(z.n)} color="#fde68a" />
        </group>
      ))}
      {xs.slice(1, -1).map((x) => <VLine key={x} x={x} color="#fde68a" />)}
      {LANES.slice(1, -1).map((y) => <HLine key={y} y={y} color="#fde68a" />)}
    </group>
  )
}

export default function PitchOverlays({ overlays }: { overlays: Overlays }) {
  return (
    <group>
      {overlays.thirds && <Thirds />}
      {overlays.quarters && <Quarters />}
      {overlays.channels && <Channels />}
      {overlays.wings && <Wings />}
      {overlays.pep && <PepBoxes />}
    </group>
  )
}
