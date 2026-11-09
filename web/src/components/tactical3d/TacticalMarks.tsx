import { useMemo } from "react"
import * as THREE from "three"
import { Html, Line } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import type { Arrow, Player } from "@/types"
import {
  HALF_W, HALF_H, LAYER, bezierMid, defaultCp, sampleBezier, sampleRoute, type Vec2,
} from "@/utils/geometry"
import type { SceneStep, Tool } from "./types"

type V3 = [number, number, number]
const w = (x: number, y: number, h: number = LAYER.path): V3 => [x - HALF_W, h, y - HALF_H]

interface CurveProps {
  fx: number; fy: number; cpX: number; cpY: number; tx: number; ty: number
  color: string; width?: number; opacity?: number; dashed?: boolean; head?: number; poly?: Vec2[]
}

/** Dashed bezier ribbon with a flat triangular arrow-head lying on the grass. */
function Curve({ fx, fy, cpX, cpY, tx, ty, color, width = 3.2, opacity = 0.95, dashed = true, head = 2.1, poly }: CurveProps) {
  const { pts, tri } = useMemo(() => {
    const pl = poly && poly.length > 2 ? poly : null
    let dx = pl ? tx - pl[Math.max(pl.length - 4, 0)].x : tx - cpX
    let dy = pl ? ty - pl[Math.max(pl.length - 4, 0)].y : ty - cpY
    let len = Math.hypot(dx, dy)
    if (len < 1e-4) { dx = tx - fx; dy = ty - fy; len = Math.hypot(dx, dy) || 1 }
    dx /= len; dy /= len
    const bx = tx - dx * head
    const by = ty - dy * head
    const line = pl
      ? [...pl.filter((p) => Math.hypot(p.x - tx, p.y - ty) > head), { x: bx, y: by }].map((p) => w(p.x, p.y))
      : sampleBezier(fx, fy, cpX, cpY, bx, by, 30).map((p) => w(p.x, p.y))
    const nx = -dy * head * 0.55
    const ny = dx * head * 0.55
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...w(tx, ty, LAYER.path + 0.004)),
      new THREE.Vector3(...w(bx + nx, by + ny, LAYER.path + 0.004)),
      new THREE.Vector3(...w(bx - nx, by - ny, LAYER.path + 0.004)),
    ])
    geo.computeVertexNormals()
    return { pts: line, tri: geo }
  }, [fx, fy, cpX, cpY, tx, ty, head, poly])

  return (
    <group renderOrder={5}>
      <Line
        points={pts} color={color} lineWidth={width} transparent opacity={opacity}
        dashed={dashed} dashSize={1.5} gapSize={0.85} toneMapped={false}
      />
      <mesh geometry={tri}>
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

interface HandleProps {
  x: number; y: number; color: string; r?: number
  onDown: (x: number, y: number, button: number, cx: number, cy: number) => void
  onOver: () => void; onOut: () => void
}

/** Draggable control point. The editor hit-tests in pitch coordinates, so we report the handle's own x/y. */
function Handle({ x, y, color, r = 0.85, onDown, onOver, onOut }: HandleProps) {
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onDown(x, y, e.nativeEvent.button, e.nativeEvent.clientX, e.nativeEvent.clientY)
  }
  return (
    <group position={w(x, y, 0.95)}>
      <mesh onPointerDown={down} onPointerOver={(e) => { e.stopPropagation(); onOver() }} onPointerOut={onOut} renderOrder={6}>
        <sphereGeometry args={[r, 20, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent opacity={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
        <ringGeometry args={[r * 1.25, r * 1.5, 24]} />
        <meshBasicMaterial color="#fff" toneMapped={false} depthTest={false} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function Ghost({ p, color, selected }: { p: Player; color: string; selected: boolean }) {
  const { x, y } = p.position
  return (
    <group position={w(x, y, LAYER.ring)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
      <mesh>
        <circleGeometry args={[1.25, 28]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.38 : 0.16} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[1.25, 1.5, 28]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.95 : 0.5} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

interface Props {
  arrows: Arrow[]
  showArrows: boolean
  showPaths: boolean
  tool: Tool
  arrowColor: string
  arrowStart: Vec2 | null
  previewPos: Vec2 | null
  currentStep: SceneStep | null
  nextStep: SceneStep | null
  pathSelectedId: string | null
  locked: boolean
  onPitchDown: (x: number, y: number, button: number, cx: number, cy: number) => void
  onDeleteArrow: (id: string) => void
  onHandleOver: () => void
  onHandleOut: () => void
}

export default function TacticalMarks({
  arrows, showArrows, showPaths, tool, arrowColor, arrowStart, previewPos,
  currentStep, nextStep, pathSelectedId, locked, onPitchDown, onDeleteArrow, onHandleOver, onHandleOut,
}: Props) {
  const editArrows = tool === "arrow" && !locked

  return (
    <group>
      {/* ── drawn tactical arrows ── */}
      {showArrows && arrows.map((a) => {
        const mid = bezierMid(a.fromX, a.fromY, a.cpX, a.cpY, a.toX, a.toY)
        return (
          <group key={a.id}>
            <Curve fx={a.fromX} fy={a.fromY} cpX={a.cpX} cpY={a.cpY} tx={a.toX} ty={a.toY} color={a.color} />
            {editArrows && (
              <>
                <Line
                  points={[w(a.fromX, a.fromY), w(a.cpX, a.cpY), w(a.toX, a.toY)]}
                  color={a.color} lineWidth={1} transparent opacity={0.35} dashed dashSize={0.6} gapSize={0.6}
                />
                <Handle x={a.cpX} y={a.cpY} color={a.color} onDown={onPitchDown} onOver={onHandleOver} onOut={onHandleOut} />
                <Html position={w(mid.x, mid.y, 1.4)} center zIndexRange={[30, 0]}>
                  <button
                    onPointerDown={(e) => { e.stopPropagation(); onDeleteArrow(a.id) }}
                    title="Delete arrow"
                    style={{
                      width: 22, height: 22, borderRadius: 11, border: `1.5px solid ${a.color}`, background: "#0f172a",
                      color: "#f87171", fontSize: 15, lineHeight: "18px", cursor: "pointer", fontWeight: 700,
                    }}
                  >×</button>
                </Html>
              </>
            )}
          </group>
        )
      })}

      {/* ── arrow being drawn ── */}
      {showArrows && tool === "arrow" && arrowStart && (
        <>
          <mesh position={w(arrowStart.x, arrowStart.y, LAYER.ring)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
            <ringGeometry args={[1.7, 2.0, 32]} />
            <meshBasicMaterial color={arrowColor} transparent opacity={0.9} toneMapped={false} depthWrite={false} />
          </mesh>
          {previewPos && Math.hypot(previewPos.x - arrowStart.x, previewPos.y - arrowStart.y) > 1.5 && (() => {
            const cp = defaultCp(arrowStart.x, arrowStart.y, previewPos.x, previewPos.y)
            return (
              <Curve
                fx={arrowStart.x} fy={arrowStart.y} cpX={cp.cpX} cpY={cp.cpY}
                tx={previewPos.x} ty={previewPos.y} color={arrowColor} opacity={0.5} width={2.6}
              />
            )
          })()}
        </>
      )}

      {/* ── movement paths (path tool): current → next step ── */}
      {tool === "path" && showPaths && currentStep && nextStep && !locked && (() => {
        const BALL = "__ball__"
        const items = currentStep.players.map((p) => {
          const to = nextStep.players.find((q) => q.id === p.id)
          if (!to) return null
          const moved = Math.hypot(to.position.x - p.position.x, to.position.y - p.position.y) > 0.4
          return moved || p.id === pathSelectedId ? { p, to } : null
        }).filter(Boolean) as { p: Player; to: Player }[]

        const fb = currentStep.ballPosition
        const tb = nextStep.ballPosition
        const ballMoved = Math.hypot(tb.x - fb.x, tb.y - fb.y) > 0.5 || pathSelectedId === BALL
        const bmp = currentStep.ballMovementPath
        const bpts = bmp?.pts ?? []
        const bcp = bmp ?? defaultCp(fb.x, fb.y, tb.x, tb.y)
        const bmid = bezierMid(fb.x, fb.y, bcp.cpX, bcp.cpY, tb.x, tb.y)
        const bsel = pathSelectedId === BALL

        return (
          <group>
            {items.map(({ p, to }) => {
              const home = p.team === "HOME"
              const col = home ? "#60a5fa" : "#f87171"
              const sel = p.id === pathSelectedId
              const mp = currentStep.movementPaths?.[p.id]
              const pts = mp?.pts ?? []
              const def = defaultCp(p.position.x, p.position.y, to.position.x, to.position.y)
              const cpX = mp?.cpX ?? def.cpX
              const cpY = mp?.cpY ?? def.cpY
              const mid = bezierMid(p.position.x, p.position.y, cpX, cpY, to.position.x, to.position.y)
              const poly = pts.length ? sampleRoute(p.position, pts, to.position) : undefined
              return (
                <group key={p.id}>
                  <Ghost p={to} color={col} selected={sel} />
                  <Curve
                    fx={p.position.x} fy={p.position.y} cpX={cpX} cpY={cpY} tx={to.position.x} ty={to.position.y}
                    color={col} opacity={sel ? 0.95 : 0.28} width={sel ? 3.6 : 1.8} head={sel ? 2.3 : 1.4} poly={poly}
                  />
                  {sel && (
                    <>
                      <Handle x={to.position.x} y={to.position.y} color="#ffffff" r={0.9} onDown={onPitchDown} onOver={onHandleOver} onOut={onHandleOut} />
                      {pts.length
                        ? pts.map((q, k) => <Handle key={k} x={q.x} y={q.y} color={col} r={1.0} onDown={onPitchDown} onOver={onHandleOver} onOut={onHandleOut} />)
                        : <Handle x={mid.x} y={mid.y} color={col} r={1.0} onDown={onPitchDown} onOver={onHandleOver} onOut={onHandleOut} />}
                    </>
                  )}
                </group>
              )
            })}
            {ballMoved && (
              <group>
                <Curve
                  fx={fb.x} fy={fb.y} cpX={bcp.cpX} cpY={bcp.cpY} tx={tb.x} ty={tb.y} color="#ffe566"
                  opacity={bsel ? 0.95 : 0.6} width={bsel ? 3.6 : 3}
                  poly={bpts.length ? sampleRoute(fb, bpts, tb) : undefined}
                />
                {bsel && (
                  <>
                    <Handle x={tb.x} y={tb.y} color="#ffffff" r={0.9} onDown={onPitchDown} onOver={onHandleOver} onOut={onHandleOut} />
                    {bpts.length
                      ? bpts.map((q, k) => <Handle key={k} x={q.x} y={q.y} color="#ffe566" r={0.95} onDown={onPitchDown} onOver={onHandleOver} onOut={onHandleOut} />)
                      : <Handle x={bmid.x} y={bmid.y} color="#ffe566" r={0.95} onDown={onPitchDown} onOver={onHandleOver} onOut={onHandleOut} />}
                  </>
                )}
              </group>
            )}
          </group>
        )
      })()}
    </group>
  )
}
