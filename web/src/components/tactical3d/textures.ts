import * as THREE from "three"

// Procedural canvas textures — no external assets, so the board works offline.

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  return { c, g: c.getContext("2d")! }
}

function finish(c: HTMLCanvasElement, srgb = true) {
  const tex = new THREE.CanvasTexture(c)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  tex.needsUpdate = true
  return tex
}

/** Mowed grass. Covers a (w × d) metre plane whose centre is the pitch centre. */
export function makeGrassTexture(planeW: number, planeD: number, pitchW: number, stripes = 16) {
  const PX = 17
  const W = Math.round(planeW * PX)
  const H = Math.round(planeD * PX)
  const { c, g } = makeCanvas(W, H)

  const stripeW = pitchW / stripes
  const pitchLeft = (planeW - pitchW) / 2
  const first = -Math.ceil(pitchLeft / stripeW)
  for (let i = first; i < stripes - first; i++) {
    const x = (pitchLeft + i * stripeW) * PX
    g.fillStyle = i % 2 === 0 ? "#2f8a3a" : "#379a42"
    g.fillRect(x, 0, stripeW * PX + 1, H)
  }

  // fine grass speckle
  for (let i = 0; i < 90000; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    const l = Math.random()
    g.fillStyle = l > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)"
    g.fillRect(x, y, 1.5, 2 + Math.random() * 3)
  }

  // soft night-light pool: bright centre, darker rim
  const grd = g.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, W * 0.62)
  grd.addColorStop(0, "rgba(255,255,230,0.07)")
  grd.addColorStop(1, "rgba(0,12,4,0.5)")
  g.fillStyle = grd
  g.fillRect(0, 0, W, H)

  return finish(c)
}

export function makeNetTexture() {
  const { c, g } = makeCanvas(128, 128)
  g.clearRect(0, 0, 128, 128)
  g.strokeStyle = "rgba(255,255,255,0.75)"
  g.lineWidth = 3
  g.beginPath()
  for (let i = 0; i <= 128; i += 16) {
    g.moveTo(i, 0)
    g.lineTo(i, 128)
    g.moveTo(0, i)
    g.lineTo(128, i)
  }
  g.stroke()
  const tex = finish(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

export function makeAdTexture(text = "VISUBALL  ◆  VISION TECH  ◆  ") {
  const { c, g } = makeCanvas(1024, 64)
  const grad = g.createLinearGradient(0, 0, 1024, 0)
  grad.addColorStop(0, "#1e0a3c")
  grad.addColorStop(0.5, "#0a2a3c")
  grad.addColorStop(1, "#1e0a3c")
  g.fillStyle = grad
  g.fillRect(0, 0, 1024, 64)
  g.font = "700 38px Rajdhani, 'Arial Narrow', sans-serif"
  g.textBaseline = "middle"
  g.fillStyle = "#e879f9"
  g.shadowColor = "#d946ef"
  g.shadowBlur = 12
  g.fillText(text + text, 12, 34)
  g.fillStyle = "#22d3ee"
  g.shadowColor = "#06b6d4"
  g.fillRect(0, 60, 1024, 4)
  const tex = finish(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

export function makeCrowdTexture() {
  const { c, g } = makeCanvas(256, 128)
  g.fillStyle = "#0b1020"
  g.fillRect(0, 0, 256, 128)
  const cols = ["#d946ef", "#06b6d4", "#f1f5f9", "#ef4444", "#3b82f6", "#fbbf24", "#94a3b8"]
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0]
    g.globalAlpha = 0.35 + Math.random() * 0.5
    g.fillRect(Math.random() * 256, Math.random() * 128, 2.5, 3.5)
  }
  g.globalAlpha = 1
  const tex = finish(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Football panel pattern (12 dark pentagons at icosahedron vertices, equirect-mapped). */
export function makeBallTexture() {
  const W = 512
  const H = 256
  const { c, g } = makeCanvas(W, H)
  g.fillStyle = "#f4f4f4"
  g.fillRect(0, 0, W, H)

  const phi = (1 + Math.sqrt(5)) / 2
  const raw: [number, number, number][] = [
    [0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi],
    [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
    [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1],
  ]
  g.fillStyle = "#16181d"
  for (const [x, y, z] of raw) {
    const l = Math.hypot(x, y, z)
    const lat = Math.asin(y / l)
    const lon = Math.atan2(z / l, x / l)
    const cx = ((lon + Math.PI) / (Math.PI * 2)) * W
    const cy = (0.5 - lat / Math.PI) * H
    const stretch = 1 / Math.max(0.35, Math.cos(lat))
    for (const off of [-W, 0, W]) {
      g.save()
      g.translate(cx + off, cy)
      g.scale(stretch, 1)
      g.beginPath()
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2
        const r = 21
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      g.closePath()
      g.fill()
      g.restore()
    }
  }
  g.strokeStyle = "rgba(60,60,70,0.55)"
  g.lineWidth = 1.5
  for (let i = 0; i < 10; i++) {
    g.beginPath()
    g.moveTo(0, (H / 10) * i)
    g.lineTo(W, (H / 10) * i + 6)
    g.stroke()
  }
  return finish(c)
}
