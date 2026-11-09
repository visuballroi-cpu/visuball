import { memo, useMemo, useRef, useState, type MutableRefObject } from "react"
import * as THREE from "three"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import type { Vec2 } from "@/utils/geometry"
import { HALF_W, HALF_H, LAYER, damp } from "@/utils/geometry"
import type { PlaybackBus } from "./types"
import { makeBallTexture } from "./textures"

const R = 0.55 // exaggerated so it reads at tactical-camera distance

interface Props {
  position: Vec2
  interactive: boolean
  bus: MutableRefObject<PlaybackBus>
  ballWorld: MutableRefObject<THREE.Vector3>
  onDown: (x: number, y: number, button: number, cx: number, cy: number) => void
  onOver: () => void
  onOut: () => void
}

function Ball3DBase({ position, interactive, bus, ballWorld, onDown, onOver, onOut }: Props) {
  const root = useRef<THREE.Group>(null)
  const sphere = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  const tex = useMemo(() => makeBallTexture(), [])
  const st = useRef({ init: false, px: 0, pz: 0 })
  const axis = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, rawDt) => {
    const r = root.current
    if (!r) return
    const dt = Math.min(rawDt, 0.1)
    const s = st.current
    const live = bus.current.active
    const src = live ? bus.current.ball : position
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
    r.position.set(s.px, 0, s.pz)
    ballWorld.current.set(s.px, R, s.pz)

    // roll without slipping: rotate about the axis ⟂ to travel by dist / radius
    const dx = s.px - ox
    const dz = s.pz - oz
    const dist = Math.hypot(dx, dz)
    if (dist > 1e-5 && sphere.current) {
      axis.set(dz, 0, -dx).normalize()
      sphere.current.rotateOnWorldAxis(axis, dist / R)
    }
  })

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return
    e.stopPropagation()
    onDown(position.x, position.y, e.nativeEvent.button, e.nativeEvent.clientX, e.nativeEvent.clientY)
  }

  return (
    <group ref={root}>
      <mesh ref={sphere} position={[0, R, 0]} castShadow>
        <sphereGeometry args={[R, 32, 24]} />
        <meshStandardMaterial map={tex} roughness={0.4} metalness={0.05} />
      </mesh>
      {interactive && (
        <mesh position={[0, LAYER.ring, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[hover ? 1.15 : 1.0, hover ? 1.42 : 1.18, 32]} />
          <meshBasicMaterial
            color={hover ? "#f5a623" : "#ffffff"} transparent opacity={hover ? 0.95 : 0.4}
            toneMapped={false} depthWrite={false}
          />
        </mesh>
      )}
      <mesh
        position={[0, 0.8, 0]}
        onPointerDown={down}
        onPointerOver={(e) => { e.stopPropagation(); if (interactive) { setHover(true); onOver() } }}
        onPointerOut={() => { setHover(false); onOut() }}
      >
        <sphereGeometry args={[1.6, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default memo(Ball3DBase)
