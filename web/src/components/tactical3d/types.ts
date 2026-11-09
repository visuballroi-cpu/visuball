import type { MutableRefObject } from "react"
import type { Player, Arrow, MovementPath } from "@/types"
import type { Vec2 } from "@/utils/geometry"

export type Tool = "drag" | "move" | "arrow" | "path"

export type CameraPreset = "broadcast" | "tactical" | "top" | "end" | "ball"

export interface Overlays {
  thirds: boolean
  quarters: boolean
  channels: boolean
  pep: boolean
  wings: boolean
}

export const NO_OVERLAYS: Overlays = {
  thirds: false,
  quarters: false,
  channels: false,
  pep: false,
  wings: false,
}

/** Minimal view of a step that the 3D scene needs. */
export interface SceneStep {
  players: Player[]
  ballPosition: Vec2
  arrows: Arrow[]
  movementPaths?: Record<string, MovementPath>
  ballMovementPath?: MovementPath
}

/**
 * Live pose, written by the playback engine every frame and read by the 3D
 * entities. Keeping it in a mutable ref means playback never triggers React
 * re-renders — entities are moved imperatively inside useFrame.
 */
export interface PlaybackBus {
  active: boolean
  players: Map<string, Vec2>
  ball: Vec2
}

export interface PitchSceneProps {
  players: Player[]
  ball: Vec2
  arrows: Arrow[]
  currentStep: SceneStep | null
  nextStep: SceneStep | null

  tool: Tool
  arrowColor: string
  arrowStart: Vec2 | null
  previewPos: Vec2 | null
  pathSelectedId: string | null
  selectedPlayerId: string | null

  showArrows: boolean
  showPaths: boolean
  showNames: boolean
  overlays: Overlays

  cameraPreset: CameraPreset
  /** 2D mode: fixed top-down view, rotation disabled */
  flat?: boolean
  cameraNonce: number

  /** true while playing/scrubbing — disables editing affordances */
  locked: boolean

  bus: MutableRefObject<PlaybackBus>
  onTick: (dt: number) => void
  pickRef: MutableRefObject<((clientX: number, clientY: number) => Vec2 | null) | null>
  hitTest: (x: number, y: number) => boolean

  onPitchDown: (x: number, y: number, button: number, clientX: number, clientY: number) => void
  onPitchMove: (x: number, y: number) => void
  onDeleteArrow: (id: string) => void
}

export const PLAYER_SCALE = 1.55
