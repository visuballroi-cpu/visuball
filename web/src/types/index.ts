export interface Player {
  id: string
  name: string
  number: number
  team: "HOME" | "AWAY"
  position: {
    x: number
    y: number
  }
  pathControlPoint?: {
    x: number
    y: number
  }
  selected?: boolean
}

export interface Area {
  id: string
  points: Array<{
    x: number
    y: number
  }>
  color: string
  name?: string
}

export interface MovementPath {
  cpX: number
  cpY: number
  /** Optional waypoints: when present the run follows a smooth spline through them (cpX/cpY are ignored). */
  pts?: Array<{ x: number; y: number }>
}

export interface Arrow {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  cpX: number
  cpY: number
  color: string
}

export interface Step {
  id: string
  name: string
  players: Player[]
  ballPosition: {
    x: number
    y: number
  }
  ballVisible?: boolean
  areas?: Area[]
  drawingAreas?: Area[]
  arrows?: Arrow[]
  movementPaths?: Record<string, MovementPath>
  ballMovementPath?: MovementPath
}

export interface Exercise {
  id: string
  name: string
  description?: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  formation: string // e.g., "4-3-3"
  type: "SESSION" | "DRILL"
  steps: Step[]
  tags?: string[]
  category?: string
  ageGroup?: "U8" | "U10" | "U13" | "U17" | "ADULT"
}

export interface CoachProfile {
  name: string
  teamName: string
  language: string
  theme: "light" | "dark"
}

export interface AIAnalysisResult {
  score: number
  exposedAreas: string[]
  recommendations: string[]
  summary: string
}

export type FilterType = "all" | "sessions" | "drills"
export type AgeGroupFilter = "U8" | "U10" | "U13" | "U17" | "ADULT" | "all"
export type CategoryFilter =
  | "TACTICS"
  | "TECHNIQUE"
  | "POSSESSION"
  | "FITNESS"
  | "SET_PIECES"
  | "all"
