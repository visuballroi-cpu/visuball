import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { OrbitControls, PerformanceMonitor } from "@react-three/drei"
import { HALF_W, HALF_H, clamp, damp, easeInOut } from "@/utils/geometry"
import type { CameraPreset, PitchSceneProps } from "./types"
import Pitch3D from "./Pitch3D"
import PitchOverlays from "./PitchOverlays"
import PlayerModel from "./PlayerModel"
import Ball3D from "./Ball3D"
import TacticalMarks from "./TacticalMarks"
import SceneErrorBoundary from "./SceneErrorBoundary"

type Ctl = {
  target: THREE.Vector3
  update: () => boolean | void
  addEventListener: (type: string, fn: () => void) => void
  removeEventListener: (type: string, fn: () => void) => void
}

const PRESETS: Record<Exclude<CameraPreset, "ball">, { pos: [number, number, number]; target: [number, number, number] }> = {
  broadcast: { pos: [0, 46, 76], target: [0, 0, 3] },
  tactical: { pos: [0, 76, 36], target: [0, 0, 2] },
  top: { pos: [0, 150, 0.01], target: [0, 0, 0] },
  top90: { pos: [0.01, 215, 0], target: [0, 0, 0] },
  top180: { pos: [0, 150, -0.01], target: [0, 0, 0] },
  top270: { pos: [-0.01, 215, 0], target: [0, 0, 0] },
  end: { pos: [-84, 24, 0.01], target: [8, 0, 0] },
}

/** Smooth camera presets, ball-follow mode and target clamping (never wander off the stadium). */
function CameraRig({ preset, nonce, ballWorld }: { preset: CameraPreset; nonce: number; ballWorld: React.MutableRefObject<THREE.Vector3> }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as Ctl | null
  const tween = useRef<{ fp: THREE.Vector3; ft: THREE.Vector3; tp: THREE.Vector3; tt: THREE.Vector3; t: number } | null>(null)
  const placed = useRef(false)
  const lastBall = useRef(new THREE.Vector3())

  useEffect(() => {
    if (!controls) return
    const onStart = () => { tween.current = null }
    controls.addEventListener("start", onStart)
    return () => controls.removeEventListener("start", onStart)
  }, [controls])

  useEffect(() => {
    if (!controls) return
    if (preset === "ball") {
      tween.current = null
      lastBall.current.copy(ballWorld.current)
      return
    }
    const p = PRESETS[preset]
    const tp = new THREE.Vector3(...p.pos)
    const tt = new THREE.Vector3(...p.target)
    if (!placed.current) {
      camera.position.copy(tp)
      controls.target.copy(tt)
      controls.update()
      placed.current = true
      return
    }
    tween.current = { fp: camera.position.clone(), ft: controls.target.clone(), tp, tt, t: 0 }
  }, [preset, nonce, controls, camera, ballWorld])

  useFrame((_, rawDt) => {
    if (!controls) return
    const dt = Math.min(rawDt, 0.1)
    const tw = tween.current
    if (tw) {
      tw.t = Math.min(1, tw.t + dt / 0.9)
      const e = easeInOut(tw.t)
      camera.position.lerpVectors(tw.fp, tw.tp, e)
      controls.target.lerpVectors(tw.ft, tw.tt, e)
      if (tw.t >= 1) tween.current = null
    } else if (preset === "ball") {
      // translate camera + target together so the user's chosen orbit offset is preserved
      const goal = ballWorld.current
      const dx = (goal.x - controls.target.x) * damp(3, dt)
      const dz = (goal.z - controls.target.z) * damp(3, dt)
      controls.target.x += dx
      controls.target.z += dz
      camera.position.x += dx
      camera.position.z += dz
    }
    controls.target.x = clamp(controls.target.x, -HALF_W - 14, HALF_W + 14)
    controls.target.z = clamp(controls.target.z, -HALF_H - 12, HALF_H + 12)
    controls.target.y = 0
    controls.update()
  })
  return null
}

// Fine-grained smooth wheel zoom: one notch ≈ 7%, eased toward a target distance (replaces OrbitControls' coarse zoom).
function SmoothZoom({ min, max }: { min: number; max: number }) {
  const gl = useThree((st) => st.gl)
  const camera = useThree((st) => st.camera)
  const controls = useThree((st) => st.controls) as unknown as { target: THREE.Vector3 } | null
  const goal = useRef<number | null>(null)
  const off = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const el = gl.domElement
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const c = controls
      if (!c) return
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1
      const d = clamp(e.deltaY * unit, -150, 150)
      const cur = goal.current ?? camera.position.distanceTo(c.target)
      goal.current = clamp(cur * Math.exp(d * 0.0007), min, max)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [gl, camera, controls, min, max])

  useFrame((_, dt) => {
    const c = controls
    if (!c || goal.current == null) return
    off.copy(camera.position).sub(c.target)
    const cur = off.length()
    const k = 1 - Math.exp(-dt * 40)
    const next = cur + (goal.current - cur) * k
    if (Math.abs(goal.current - next) < 0.02) { goal.current = null; return }
    camera.position.copy(c.target).addScaledVector(off.normalize(), next)
  })
  return null
}

function Picker({ pickRef }: { pickRef: PitchSceneProps["pickRef"] }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const ray = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    pickRef.current = (cx, cy) => {
      const r = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      if (!ray.ray.intersectPlane(plane, hit)) return null
      return { x: hit.x + HALF_W, y: hit.z + HALF_H }
    }
    return () => { pickRef.current = null }
  }, [camera, gl, pickRef])
  return null
}

function FrameDriver({ onTick }: { onTick: (dt: number) => void }) {
  useFrame((_, dt) => onTick(Math.min(dt, 0.1)))
  return null
}

function Lights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <hemisphereLight args={["#c3d7ff", "#0a2412", 0.7]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[-34, 78, 46]} intensity={2.3} castShadow={shadows}
        shadow-mapSize={[1536, 1536]} shadow-bias={-0.0005} shadow-normalBias={0.05}
        shadow-camera-left={-72} shadow-camera-right={72} shadow-camera-top={52} shadow-camera-bottom={-52}
        shadow-camera-near={5} shadow-camera-far={220}
      />
      <directionalLight position={[48, 52, -34]} intensity={0.55} color="#8ab4ff" />
    </>
  )
}

function SceneContents(props: PitchSceneProps) {
  const {
    players, ball, arrows, currentStep, nextStep, tool, arrowColor, arrowStart, previewPos,
    pathSelectedId, selectedPlayerId, showArrows, showPaths, showNames, overlays,
    cameraPreset, cameraNonce, flat, quality = "auto", locked, bus, onTick, pickRef, hitTest,
    onPitchDown, onPitchMove, onDeleteArrow,
  } = props

  const gl = useThree((s) => s.gl)
  const ballWorld = useRef(new THREE.Vector3(0, 0.55, 0))
  const entityHover = useRef(0)
  const lastPt = useRef<{ x: number; y: number } | null>(null)
  const [lock, setLock] = useState(false)
  const [autoShadows, setAutoShadows] = useState(false)
  const shadowsOn = quality === "high" || (quality === "auto" && autoShadows)

  const applyLock = useCallback((v: boolean) => {
    setLock((prev) => (prev === v ? prev : v))
    gl.domElement.style.cursor = v ? (tool === "drag" ? "grab" : "pointer") : tool === "arrow" && arrowStart ? "crosshair" : "default"
  }, [gl, tool, arrowStart])

  // editing disabled (playback) → release the orbit lock
  useEffect(() => { if (locked) applyLock(false) }, [locked, applyLock])

  const onEntityOver = useCallback(() => { entityHover.current++; applyLock(true) }, [applyLock])
  const onEntityOut = useCallback(() => {
    entityHover.current = Math.max(0, entityHover.current - 1)
    const p = lastPt.current
    applyLock(entityHover.current > 0 || (!!p && hitTest(p.x, p.y)))
  }, [applyLock, hitTest])

  const groundMove = (e: ThreeEvent<PointerEvent>) => {
    const x = e.point.x + HALF_W
    const y = e.point.z + HALF_H
    lastPt.current = { x, y }
    onPitchMove(x, y)
    if (!locked) applyLock(entityHover.current > 0 || hitTest(x, y))
  }
  const groundDown = (e: ThreeEvent<PointerEvent>) => {
    if (locked) return
    onPitchDown(e.point.x + HALF_W, e.point.z + HALF_H, e.nativeEvent.button, e.nativeEvent.clientX, e.nativeEvent.clientY)
  }

  const interactive = !locked
  const orbitFree = !lock

  const entityDown = useCallback(
    (x: number, y: number, button: number, cx: number, cy: number) => onPitchDown(x, y, button, cx, cy),
    [onPitchDown]
  )

  const playerEls = useMemo(
    () => players.map((p) => (
      <PlayerModel
        key={p.id} player={p} selected={selectedPlayerId === p.id || pathSelectedId === p.id}
        interactive={interactive} showName={showNames} bus={bus} ballWorld={ballWorld}
        onDown={entityDown} onOver={onEntityOver} onOut={onEntityOut}
      />
    )),
    [players, selectedPlayerId, pathSelectedId, interactive, showNames, bus, entityDown, onEntityOver, onEntityOut]
  )

  return (
    <>
      <color attach="background" args={["#060913"]} />
      <fog attach="fog" args={["#060913", 150, 360]} />
      {quality === "auto" && (
        <PerformanceMonitor
          flipflops={3} onDecline={() => setAutoShadows(false)} onFallback={() => setAutoShadows(false)} onIncline={() => setAutoShadows(true)}
        />
      )}
      <Lights shadows={shadowsOn} />
      <FrameDriver onTick={onTick} />
      <Picker pickRef={pickRef} />

      <Pitch3D />
      <PitchOverlays overlays={overlays} />

      {/* invisible ground used for pointer events */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} onPointerMove={groundMove} onPointerDown={groundDown}>
        <planeGeometry args={[420, 320]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <TacticalMarks
        arrows={arrows} showArrows={showArrows} showPaths={showPaths} tool={tool} arrowColor={arrowColor}
        arrowStart={arrowStart} previewPos={previewPos} currentStep={currentStep} nextStep={nextStep}
        pathSelectedId={pathSelectedId} locked={locked} onPitchDown={entityDown} onDeleteArrow={onDeleteArrow}
        onHandleOver={onEntityOver} onHandleOut={onEntityOut}
      />

      {playerEls}
      <Ball3D
        position={ball} interactive={interactive} bus={bus} ballWorld={ballWorld}
        onDown={entityDown} onOver={onEntityOver} onOut={onEntityOut}
      />

      <OrbitControls
        makeDefault enableDamping={false} dampingFactor={0.22} rotateSpeed={0.8} panSpeed={0.9} enableZoom={false}
        minDistance={8} maxDistance={185} maxPolarAngle={flat ? 0.02 : Math.PI / 2.08}
        enableRotate={orbitFree} enablePan={orbitFree}
      />
      <SmoothZoom min={8} max={185} />
      <CameraRig preset={cameraPreset} nonce={cameraNonce} ballWorld={ballWorld} />
    </>
  )
}

export default function PitchScene(props: PitchSceneProps & { errorTitle?: string; errorHint?: string; retryLabel?: string }) {
  const { errorTitle, errorHint, retryLabel, ...scene } = props
  return (
    <SceneErrorBoundary title={errorTitle} hint={errorHint} retryLabel={retryLabel}>
      <Canvas
        shadows
        dpr={scene.quality === "low" ? [1, 1] : scene.quality === "high" ? [1, 2] : scene.flat ? [1.5, 2] : [1, 1.5]}
        camera={{ fov: 38, near: 0.5, far: 700, position: [0, 40, 64] }}
        gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
        style={{ touchAction: "none" }}
      >
        <Suspense fallback={null}>
          <SceneContents {...scene} />
        </Suspense>
      </Canvas>
    </SceneErrorBoundary>
  )
}
