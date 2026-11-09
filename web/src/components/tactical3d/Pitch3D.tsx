import { useMemo } from "react"
import * as THREE from "three"
import { LAYER, HALF_W, HALF_H } from "@/utils/geometry"
import { PITCH_WIDTH, PITCH_HEIGHT } from "@/constants"
import {
  makeGrassTexture, makeNetTexture, makeAdTexture, makeCrowdTexture,
} from "./textures"

const T = 0.13 // line thickness (m)
const lineMat = new THREE.MeshBasicMaterial({
  color: "#ffffff",
  toneMapped: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
})

/** Axis-aligned flat rectangle on the grass. */
function Flat({
  cx, cz, w, d, y = LAYER.pitchLine, material = lineMat,
}: { cx: number; cz: number; w: number; d: number; y?: number; material?: THREE.Material }) {
  return (
    <mesh position={[cx, y, cz]} rotation={[-Math.PI / 2, 0, 0]} material={material} renderOrder={2}>
      <planeGeometry args={[w, d]} />
    </mesh>
  )
}

function Outline({ x0, z0, x1, z1 }: { x0: number; z0: number; x1: number; z1: number }) {
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  return (
    <>
      <Flat cx={cx} cz={z0} w={w + T} d={T} />
      <Flat cx={cx} cz={z1} w={w + T} d={T} />
      <Flat cx={x0} cz={cz} w={T} d={d - T} />
      <Flat cx={x1} cz={cz} w={T} d={d - T} />
    </>
  )
}

function Arc({
  cx, cz, r, start = 0, length = Math.PI * 2, y = LAYER.pitchLine, seg = 64,
}: { cx: number; cz: number; r: number; start?: number; length?: number; y?: number; seg?: number }) {
  return (
    <mesh position={[cx, y, cz]} rotation={[-Math.PI / 2, 0, 0]} material={lineMat} renderOrder={2}>
      <ringGeometry args={[r - T / 2, r + T / 2, seg, 1, start, length]} />
    </mesh>
  )
}

function Dot({ cx, cz, r = 0.26 }: { cx: number; cz: number; r?: number }) {
  return (
    <mesh position={[cx, LAYER.pitchLine, cz]} rotation={[-Math.PI / 2, 0, 0]} material={lineMat} renderOrder={2}>
      <circleGeometry args={[r, 20]} />
    </mesh>
  )
}

function PitchMarkings() {
  const penAlpha = Math.acos(5.5 / 9.15) // arc half-angle outside the box
  return (
    <group>
      <Outline x0={-HALF_W} z0={-HALF_H} x1={HALF_W} z1={HALF_H} />
      <Flat cx={0} cz={0} w={T} d={PITCH_HEIGHT} />
      <Arc cx={0} cz={0} r={9.15} />
      <Dot cx={0} cz={0} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Outline x0={s * HALF_W} z0={-20.16} x1={s * (HALF_W - 16.5)} z1={20.16} />
          <Outline x0={s * HALF_W} z0={-9.16} x1={s * (HALF_W - 5.5)} z1={9.16} />
          <Dot cx={s * (HALF_W - 11)} cz={0} />
          <Arc
            cx={s * (HALF_W - 11)} cz={0} r={9.15}
            start={s === 1 ? Math.PI - penAlpha : -penAlpha}
            length={penAlpha * 2} seg={40}
          />
        </group>
      ))}
      {/* corner arcs — quarter circles facing into the pitch */}
      <Arc cx={HALF_W} cz={-HALF_H} r={1} start={Math.PI} length={Math.PI / 2} seg={12} />
      <Arc cx={HALF_W} cz={HALF_H} r={1} start={Math.PI / 2} length={Math.PI / 2} seg={12} />
      <Arc cx={-HALF_W} cz={-HALF_H} r={1} start={-Math.PI / 2} length={Math.PI / 2} seg={12} />
      <Arc cx={-HALF_W} cz={HALF_H} r={1} start={0} length={Math.PI / 2} seg={12} />
    </group>
  )
}

const postMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.35, metalness: 0.2 })

function Goal({ side }: { side: 1 | -1 }) {
  const net = useMemo(() => makeNetTexture(), [])
  const GW = 7.32, GH = 2.44, GD = 2.1
  const x = side * HALF_W
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: net, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85,
    }),
    [net]
  )
  const tile = (rx: number, ry: number) => {
    const t = net.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    t.needsUpdate = true
    return t
  }
  const backTex = useMemo(() => tile(GW * 2, GH * 2), []) // eslint-disable-line react-hooks/exhaustive-deps
  const sideTex = useMemo(() => tile(GD * 2, GH * 2), []) // eslint-disable-line react-hooks/exhaustive-deps
  const topTex = useMemo(() => tile(GD * 2, GW * 2), []) // eslint-disable-line react-hooks/exhaustive-deps
  const m = (map: THREE.Texture) => {
    const c = mat.clone()
    c.map = map
    return c
  }
  const dx = side * GD
  return (
    <group position={[x, 0, 0]}>
      {[-GW / 2, GW / 2].map((z) => (
        <mesh key={z} position={[0, GH / 2, z]} castShadow material={postMat}>
          <cylinderGeometry args={[0.07, 0.07, GH, 12]} />
        </mesh>
      ))}
      <mesh position={[0, GH, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={postMat}>
        <cylinderGeometry args={[0.07, 0.07, GW + 0.14, 12]} />
      </mesh>
      {/* back, sides, roof of the net */}
      <mesh position={[dx, GH / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={m(backTex)}>
        <planeGeometry args={[GW, GH]} />
      </mesh>
      {[-GW / 2, GW / 2].map((z) => (
        <mesh key={z} position={[dx / 2, GH / 2, z]} material={m(sideTex)}>
          <planeGeometry args={[GD, GH]} />
        </mesh>
      ))}
      <mesh position={[dx / 2, GH, 0]} rotation={[-Math.PI / 2, 0, side === 1 ? Math.PI / 2 : -Math.PI / 2]} material={m(topTex)}>
        <planeGeometry args={[GW, GD]} />
      </mesh>
    </group>
  )
}

function CornerFlag({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[x > 0 ? -0.22 : 0.22, 1.32, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.44, 0.3]} />
        <meshBasicMaterial color="#fde047" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function AdBoards() {
  const tex = useMemo(() => makeAdTexture(), [])
  const mats = useMemo(() => {
    const long = tex.clone()
    long.repeat.set(5.5, 1)
    long.needsUpdate = true
    const short = tex.clone()
    short.repeat.set(3.6, 1)
    short.needsUpdate = true
    const mk = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, toneMapped: false })
    return { long: mk(long), short: mk(short) }
  }, [tex])
  const zOff = HALF_H + 4.2
  const xOff = HALF_W + 6.2
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={`l${s}`} position={[0, 0.5, s * zOff]} rotation={[0, s === 1 ? Math.PI : 0, 0]} material={mats.long}>
          <planeGeometry args={[PITCH_WIDTH + 14, 1]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} position={[s * xOff, 0.5, 0]} rotation={[0, s === 1 ? -Math.PI / 2 : Math.PI / 2, 0]} material={mats.short}>
          <planeGeometry args={[PITCH_HEIGHT + 8, 1]} />
        </mesh>
      ))}
    </group>
  )
}

function Stands() {
  const tex = useMemo(() => {
    const t = makeCrowdTexture()
    t.repeat.set(26, 3)
    return t
  }, [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.55,
      roughness: 1,
    }),
    [tex]
  )
  const tiers = [0, 1, 2, 3]
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={`long${s}`}>
          {tiers.map((k) => (
            <mesh key={k} position={[0, (k + 1) * 1.5, s * (HALF_H + 9 + k * 2.6)]} material={mat}>
              <boxGeometry args={[PITCH_WIDTH + 36 + k * 3, (k + 1) * 3, 2.6]} />
            </mesh>
          ))}
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={`end${s}`}>
          {tiers.map((k) => (
            <mesh key={k} position={[s * (HALF_W + 12 + k * 2.6), (k + 1) * 1.5, 0]} material={mat}>
              <boxGeometry args={[2.6, (k + 1) * 3, PITCH_HEIGHT + 12 + k * 3]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Floodlights() {
  const spots: [number, number][] = [[-70, -52], [70, -52], [-70, 52], [70, 52]]
  return (
    <group>
      {spots.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 17, 0]}>
            <cylinderGeometry args={[0.35, 0.6, 34, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          <group position={[0, 34, 0]} rotation={[0, Math.atan2(-x, -z), 0]}>
            <mesh>
              <boxGeometry args={[9, 4.5, 0.6]} />
              <meshBasicMaterial color="#e2f0ff" toneMapped={false} />
            </mesh>
            {[-3, 0, 3].flatMap((px) =>
              [-1, 1].map((py) => (
                <mesh key={`${px}${py}`} position={[px, py, 0.35]}>
                  <circleGeometry args={[0.7, 16]} />
                  <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
              ))
            )}
          </group>
        </group>
      ))}
    </group>
  )
}

export default function Pitch3D() {
  const PLANE_W = PITCH_WIDTH + 20
  const PLANE_D = PITCH_HEIGHT + 16
  const grass = useMemo(() => makeGrassTexture(PLANE_W, PLANE_D, PITCH_WIDTH), [PLANE_W, PLANE_D])

  return (
    <group>
      {/* outer surrounding — darker so the pitch pops */}
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[420, 320]} />
        <meshStandardMaterial color="#0a1a12" roughness={1} />
      </mesh>

      {/* mowed grass */}
      <mesh position={[0, LAYER.grass, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PLANE_W, PLANE_D]} />
        <meshStandardMaterial map={grass} roughness={0.92} metalness={0} />
      </mesh>

      <PitchMarkings />
      <Goal side={-1} />
      <Goal side={1} />
      <CornerFlag x={-HALF_W} z={-HALF_H} />
      <CornerFlag x={HALF_W} z={-HALF_H} />
      <CornerFlag x={-HALF_W} z={HALF_H} />
      <CornerFlag x={HALF_W} z={HALF_H} />
      <AdBoards />
      <Stands />
      <Floodlights />
    </group>
  )
}
