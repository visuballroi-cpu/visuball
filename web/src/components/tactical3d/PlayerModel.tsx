import { memo, useMemo, useRef, useState, type MutableRefObject } from "react"
import * as THREE from "three"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import type { Player } from "@/types"
import { HALF_W, HALF_H, LAYER, angleDelta, clamp, damp, smoothstep } from "@/utils/geometry"
import { PLAYER_SCALE, type PlaybackBus } from "./types"

// ── shared geometry (created once) ───────────────────────────────────────────
const G = {
  torso: new THREE.CapsuleGeometry(0.19, 0.34, 4, 12),
  neck: new THREE.CylinderGeometry(0.055, 0.065, 0.1, 10),
  head: new THREE.SphereGeometry(0.125, 20, 16),
  hair: new THREE.SphereGeometry(0.133, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  shorts: new THREE.CylinderGeometry(0.19, 0.215, 0.22, 14),
  thigh: new THREE.CylinderGeometry(0.085, 0.07, 0.45, 10),
  shin: new THREE.CylinderGeometry(0.065, 0.055, 0.44, 10),
  boot: new THREE.BoxGeometry(0.1, 0.075, 0.27),
  upperArm: new THREE.CylinderGeometry(0.062, 0.052, 0.27, 10),
  foreArm: new THREE.CylinderGeometry(0.05, 0.042, 0.26, 10),
  hand: new THREE.SphereGeometry(0.052, 10, 8),
}

const matCache = new Map<string, THREE.MeshStandardMaterial>()
function mat(color: string, roughness = 0.75) {
  const k = color + roughness
  let m = matCache.get(k)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 })
    matCache.set(k, m)
  }
  return m
}

const SKIN = ["#f1c9a5", "#d9a273", "#b57a52", "#8a5a3c"]
const HAIR = ["#17120d", "#3b2a1a", "#0e0e0e", "#6b4423", "#c9a24a"]

export const KITS = {
  HOME: { shirt: "#2563eb", shorts: "#0b2a6f", socks: "#2563eb", ui: "#2563eb" },
  HOME_GK: { shirt: "#84cc16", shorts: "#1a2e05", socks: "#84cc16", ui: "#84cc16" },
  AWAY: { shirt: "#dc2626", shorts: "#5c0f0f", socks: "#dc2626", ui: "#dc2626" },
  AWAY_GK: { shirt: "#f59e0b", shorts: "#422006", socks: "#f59e0b", ui: "#f59e0b" },
} as const

export function kitFor(player: Player) {
  const gk = player.number === 1
  if (player.team === "HOME") return gk ? KITS.HOME_GK : KITS.HOME
  return gk ? KITS.AWAY_GK : KITS.AWAY
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

interface Props {
  player: Player
  selected: boolean
  interactive: boolean
  showName: boolean
  bus: MutableRefObject<PlaybackBus>
  ballWorld: MutableRefObject<THREE.Vector3>
  onDown: (x: number, y: number, button: number, cx: number, cy: number) => void
  onOver: () => void
  onOut: () => void
}

/**
 * ProPlayerModel — athletic humanoid built from primitives (also the fallback for GLB loading).
 * Animation is procedural: run cycle weight + cadence follow the *measured* speed
 * (time-scale sync), idle↔run cross-fades through a damped weight, and the body
 * turns with atan2 toward its direction of travel (or toward the ball when standing).
 */
function PlayerModelBase({ player, selected, interactive, showName, bus, ballWorld, onDown, onOver, onOut }: Props) {
  const kit = kitFor(player)
  const h = useMemo(() => hash(player.id), [player.id])
  const skin = SKIN[h % SKIN.length]
  const hair = HAIR[(h >> 3) % HAIR.length]

  const root = useRef<THREE.Group>(null)
  const figure = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const kneeL = useRef<THREE.Group>(null)
  const kneeR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const elbL = useRef<THREE.Group>(null)
  const elbR = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)

  const [hover, setHover] = useState(false)

  const st = useRef({
    init: false, px: 0, pz: 0, vx: 0, vz: 0, spd: 0,
    yaw: player.team === "HOME" ? Math.PI / 2 : -Math.PI / 2,
    runW: 0, phase: (h % 100) / 16, t: 0,
  })

  useFrame((_, rawDt) => {
    const r = root.current
    if (!r) return
    const dt = Math.min(rawDt, 0.1)
    if (dt <= 0) return
    const s = st.current
    s.t += dt

    const live = bus.current.active
    const src = (live && bus.current.players.get(player.id)) || player.position
    const tx = src.x - HALF_W
    const tz = src.y - HALF_H
    if (!s.init) { s.px = tx; s.pz = tz; s.init = true }

    const ox = s.px
    const oz = s.pz
    if (live) { s.px = tx; s.pz = tz }
    else {
      const k = damp(24, dt)
      s.px += (tx - s.px) * k
      s.pz += (tz - s.pz) * k
    }

    // measured velocity (frame-rate independent)
    const k = damp(12, dt)
    s.vx += ((s.px - ox) / dt - s.vx) * k
    s.vz += ((s.pz - oz) / dt - s.vz) * k
    s.spd = Math.hypot(s.vx, s.vz)

    // facing: direction of travel, else toward the ball
    let target = s.yaw
    if (s.spd > 1.2) target = Math.atan2(s.vx, s.vz)
    else {
      const bx = ballWorld.current.x - s.px
      const bz = ballWorld.current.z - s.pz
      if (Math.hypot(bx, bz) > 1.6) target = Math.atan2(bx, bz)
    }
    s.yaw += angleDelta(s.yaw, target) * damp(s.spd > 1.2 ? 13 : 5, dt)

    // idle ↔ run cross-fade + cadence sync
    s.runW += (smoothstep(0.6, 4.2, s.spd) - s.runW) * damp(9, dt)
    s.phase += dt * clamp(5 + s.spd * 0.5, 5, 16)
    const w = s.runW
    const sp = Math.sin(s.phase)
    const cp = Math.cos(s.phase)

    r.position.set(s.px, 0, s.pz)
    r.rotation.y = s.yaw

    const f = figure.current
    if (f) f.position.y = Math.abs(sp) * 0.09 * w * PLAYER_SCALE
    if (legL.current) legL.current.rotation.x = -sp * 0.95 * w
    if (legR.current) legR.current.rotation.x = sp * 0.95 * w
    if (kneeL.current) kneeL.current.rotation.x = Math.max(0, cp) * 1.25 * w
    if (kneeR.current) kneeR.current.rotation.x = Math.max(0, -cp) * 1.25 * w
    if (armL.current) { armL.current.rotation.x = sp * 0.85 * w; armL.current.rotation.z = -0.1 - 0.05 * (1 - w) }
    if (armR.current) { armR.current.rotation.x = -sp * 0.85 * w; armR.current.rotation.z = 0.1 + 0.05 * (1 - w) }
    const elbow = -(0.3 + 0.95 * w)
    if (elbL.current) elbL.current.rotation.x = elbow
    if (elbR.current) elbR.current.rotation.x = elbow
    if (torso.current) {
      torso.current.rotation.x = 0.05 + 0.24 * w
      torso.current.rotation.y = sp * 0.2 * w
      torso.current.scale.y = 1 + Math.sin(s.t * 2.2 + h) * 0.012 * (1 - w)
    }

    if (ring.current) {
      const pulse = 1 + Math.sin(s.t * 5) * 0.05
      ring.current.scale.setScalar(pulse)
    }
  })

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return
    e.stopPropagation()
    onDown(player.position.x, player.position.y, e.nativeEvent.button, e.nativeEvent.clientX, e.nativeEvent.clientY)
  }

  const showRing = interactive && (selected || hover)
  const M = {
    shirt: mat(kit.shirt, 0.65), shorts: mat(kit.shorts), socks: mat(kit.socks, 0.8),
    skin: mat(skin, 0.6), hair: mat(hair, 0.9), boot: mat("#0b0d12", 0.45),
  }

  return (
    <group ref={root}>
      {/* team marker on the grass — keeps players readable from far away */}
      <mesh position={[0, LAYER.marking, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <ringGeometry args={[1.05, 1.28, 40]} />
        <meshBasicMaterial color={kit.ui} transparent opacity={0.7} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, LAYER.marking - 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <circleGeometry args={[1.05, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {showRing && (
        <mesh ref={ring} position={[0, LAYER.ring, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[1.55, 1.95, 48]} />
          <meshBasicMaterial
            color="#f5a623" transparent opacity={0.95} toneMapped={false} depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      <group ref={figure} scale={PLAYER_SCALE}>
        {/* legs */}
        {([[-0.105, legL, kneeL], [0.105, legR, kneeR]] as const).map(([x, leg, knee]) => (
          <group key={x} ref={leg} position={[x, 0.95, 0]}>
            <mesh geometry={G.thigh} material={M.skin} position={[0, -0.225, 0]} castShadow />
            <group ref={knee} position={[0, -0.45, 0]}>
              <mesh geometry={G.shin} material={M.socks} position={[0, -0.22, 0]} castShadow />
              <mesh geometry={G.boot} material={M.boot} position={[0, -0.455, 0.06]} castShadow />
            </group>
          </group>
        ))}
        <mesh geometry={G.shorts} material={M.shorts} position={[0, 0.9, 0]} castShadow />

        {/* upper body — pivots at the hips so it can lean into the run */}
        <group ref={torso} position={[0, 0.95, 0]}>
          <mesh geometry={G.torso} material={M.shirt} position={[0, 0.34, 0]} scale={[1.15, 1, 0.8]} castShadow />
          <mesh geometry={G.neck} material={M.skin} position={[0, 0.69, 0]} castShadow />
          <mesh geometry={G.head} material={M.skin} position={[0, 0.82, 0]} castShadow />
          <mesh geometry={G.hair} material={M.hair} position={[0, 0.835, -0.012]} rotation={[-0.25, 0, 0]} castShadow />
          {([[-0.27, armL, elbL], [0.27, armR, elbR]] as const).map(([x, arm, elb]) => (
            <group key={x} ref={arm} position={[x, 0.56, 0]}>
              <mesh geometry={G.upperArm} material={M.shirt} position={[0, -0.13, 0]} castShadow />
              <group ref={elb} position={[0, -0.27, 0]}>
                <mesh geometry={G.foreArm} material={M.skin} position={[0, -0.13, 0]} castShadow />
                <mesh geometry={G.hand} material={M.skin} position={[0, -0.28, 0]} castShadow />
              </group>
            </group>
          ))}
        </group>
      </group>

      {/* generous invisible hit-proxy: easy to grab from any camera angle */}
      <mesh
        position={[0, 1.7, 0]}
        onPointerDown={down}
        onPointerOver={(e) => { e.stopPropagation(); if (interactive) { setHover(true); onOver() } }}
        onPointerOut={() => { setHover(false); onOut() }}
      >
        <cylinderGeometry args={[1.5, 1.5, 3.5, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* billboard label (screen-aligned, always faces the camera) */}
      <Html position={[0, 1.85 * PLAYER_SCALE + 0.6, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, userSelect: "none" }}>
          <div
            style={{
              minWidth: 22, height: 22, padding: "0 6px", borderRadius: 11, display: "flex", alignItems: "center",
              justifyContent: "center", background: kit.ui, color: kit.ui === "#84cc16" || kit.ui === "#f59e0b" ? "#10130a" : "#fff",
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: 14, lineHeight: 1,
              border: selected ? "2px solid #f5a623" : "1.5px solid rgba(255,255,255,.85)",
              boxShadow: selected ? "0 0 12px rgba(245,166,35,.8)" : "0 1px 6px rgba(0,0,0,.6)",
            }}
          >
            {player.number}
          </div>
          {showName && (
            <div
              style={{
                fontFamily: "'Noto Sans Hebrew', system-ui, sans-serif", fontSize: 10, fontWeight: 600, color: "#fff",
                background: "rgba(8,12,20,.72)", padding: "1px 6px", borderRadius: 6, whiteSpace: "nowrap",
                backdropFilter: "blur(4px)",
              }}
            >
              {player.name}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

const PlayerModel = memo(PlayerModelBase)
export default PlayerModel
