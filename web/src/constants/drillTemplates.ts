import type { Exercise, Player, Step } from "@/types"
import { defaultCp } from "@/utils/geometry"

type P = [number, number]
interface Frame { name: string; home: P[]; away?: P[]; ball: P; arrows?: [P, P, string?][] }
export interface LibDrill {
  id: string
  name: Record<string, string>
  desc: Record<string, string>
  category: "TACTICS" | "TECHNIQUE" | "POSSESSION" | "FITNESS" | "SET_PIECES"
  ageGroup: "U8" | "U10" | "U13" | "U17" | "ADULT"
  formation: string
  frames: Frame[]
}

const GK: P = [5, 34]
const BACK4: P[] = [[20, 10], [20, 25], [20, 43], [20, 58]]

export const LIBRARY: LibDrill[] = [
  {
    id: "lib-buildout", category: "TACTICS", ageGroup: "ADULT", formation: "4-3-3",
    name: { en: "Build-out from the back", he: "בניית משחק מהשוער" },
    desc: { en: "GK and back four play through a 4-4-2 first press into midfield.", he: "השוער וארבעת המגנים בונים מול לחץ ראשון של 4-4-2 אל קו האמצע." },
    frames: [
      { name: "Setup", home: [GK, ...BACK4, [38, 22], [36, 34], [38, 46]], away: [[48, 24], [48, 44], [58, 10], [58, 26], [58, 42], [58, 58]], ball: [6, 34] },
      { name: "GK → CB", home: [GK, [20, 10], [24, 25], [20, 43], [20, 58], [38, 22], [36, 34], [38, 46]], away: [[44, 28], [46, 44], [56, 12], [56, 26], [56, 42], [56, 58]], ball: [24, 25], arrows: [[[6, 34], [24, 25], "#facc15"]] },
      { name: "Break the line", home: [GK, [22, 10], [24, 25], [20, 43], [22, 58], [42, 22], [40, 34], [40, 46]], away: [[40, 26], [42, 42], [52, 14], [52, 28], [52, 40], [52, 56]], ball: [42, 22], arrows: [[[24, 25], [42, 22], "#38bdf8"]] },
    ],
  },
  {
    id: "lib-press", category: "TACTICS", ageGroup: "U17", formation: "4-4-2",
    name: { en: "High press trigger", he: "טריגר ללחץ גבוה" },
    desc: { en: "Press as a unit when the back pass is played to the keeper.", he: "לחץ קבוצתי כשמתבצעת מסירה אחורה לשוער." },
    frames: [
      { name: "Setup", home: [GK, ...BACK4, [48, 12], [50, 26], [50, 42], [48, 56], [66, 28], [66, 40]], away: [[100, 34], [86, 12], [86, 26], [86, 42], [86, 56]], ball: [86, 26] },
      { name: "Trigger", home: [GK, ...BACK4, [58, 12], [62, 26], [62, 42], [58, 56], [80, 28], [80, 40]], away: [[100, 34], [86, 12], [88, 26], [86, 42], [86, 56]], ball: [100, 34], arrows: [[[66, 28], [92, 32], "#f87171"]] },
    ],
  },
  {
    id: "lib-rondo", category: "POSSESSION", ageGroup: "U13", formation: "4-3-3",
    name: { en: "4v2 rondo", he: "רונדו 4 נגד 2" },
    desc: { en: "Keep the ball with quick, one-touch circulation.", he: "שמירת כדור בהעברות מהירות במגע אחד." },
    frames: [
      { name: "Setup", home: [[40, 24], [60, 24], [60, 44], [40, 44]], away: [[50, 32], [50, 36]], ball: [40, 24] },
      { name: "Pass 1", home: [[40, 24], [60, 24], [60, 44], [40, 44]], away: [[46, 28], [54, 30]], ball: [60, 24], arrows: [[[40, 24], [60, 24], "#facc15"]] },
      { name: "Pass 2", home: [[40, 24], [60, 24], [60, 44], [40, 44]], away: [[56, 34], [50, 40]], ball: [60, 44], arrows: [[[60, 24], [60, 44], "#facc15"]] },
    ],
  },
  {
    id: "lib-finishing", category: "TECHNIQUE", ageGroup: "U13", formation: "4-3-3",
    name: { en: "Cut-back finishing", he: "סיום מחזרה לאחור" },
    desc: { en: "Winger beats the full-back and cuts the ball back for a first-time finish.", he: "הקשר הקיצוני עוקף את המגן ומחזיר לגמר במגע ראשון." },
    frames: [
      { name: "Setup", home: [[72, 10], [86, 34], [78, 26], [78, 44]], away: [[84, 14], [96, 34]], ball: [72, 10] },
      { name: "Beat & cross", home: [[92, 10], [86, 34], [80, 26], [80, 44]], away: [[86, 18], [96, 34]], ball: [92, 10], arrows: [[[72, 10], [92, 10], "#facc15"]] },
      { name: "Cut-back", home: [[92, 10], [90, 32], [84, 26], [84, 44]], away: [[88, 18], [96, 34]], ball: [90, 32], arrows: [[[92, 10], [90, 32], "#38bdf8"]] },
    ],
  },
  {
    id: "lib-corner", category: "SET_PIECES", ageGroup: "ADULT", formation: "4-4-2",
    name: { en: "Corner · near-post flick", he: "קרן · הנחה בקרן הקרובה" },
    desc: { en: "Near-post flick-on to a runner arriving at the far post.", he: "הנחה בקרן הקרובה לרץ שמגיע לקרן הרחוקה." },
    frames: [
      { name: "Setup", home: [[104, 1], [96, 28], [98, 34], [96, 40], [92, 22], [92, 46]], away: [[100, 30], [100, 36], [97, 24], [97, 44]], ball: [104, 1] },
      { name: "Delivery", home: [[104, 1], [98, 28], [100, 34], [96, 40], [92, 22], [92, 46]], away: [[100, 30], [100, 36], [97, 24], [97, 44]], ball: [99, 29], arrows: [[[104, 1], [99, 29], "#facc15"]] },
      { name: "Flick & finish", home: [[104, 1], [98, 28], [100, 34], [101, 40], [94, 30], [92, 46]], away: [[100, 30], [100, 36], [97, 24], [97, 44]], ball: [101, 40], arrows: [[[99, 29], [101, 40], "#38bdf8"]] },
    ],
  },
  {
    id: "lib-fitness", category: "FITNESS", ageGroup: "U17", formation: "4-4-2",
    name: { en: "Shuttle & recover", he: "ריצות מעבר והתאוששות" },
    desc: { en: "Repeated high-intensity shuttles between cones.", he: "ריצות מעבר חוזרות בעצימות גבוהה בין קונוסים." },
    frames: [
      { name: "Start", home: [[20, 10], [20, 24], [20, 38], [20, 52]], ball: [20, 34] },
      { name: "Sprint 1", home: [[50, 10], [50, 24], [50, 38], [50, 52]], ball: [50, 34], arrows: [[[20, 10], [50, 10], "#a3e635"]] },
      { name: "Return", home: [[20, 10], [20, 24], [20, 38], [20, 52]], ball: [20, 34], arrows: [[[50, 10], [20, 10], "#f87171"]] },
    ],
  },
]

export function buildExercise(d: LibDrill, lang: string, date: string): Exercise {
  const ids: string[] = []
  const id = (k: string) => (ids.includes(k) ? k : (ids.push(k), k))
  const steps: Step[] = d.frames.map((f, si) => {
    const players: Player[] = [
      ...f.home.map((p, i) => ({ id: id(`h${i}`), name: `P${i + 1}`, number: i + 1, team: "HOME" as const, position: { x: p[0], y: p[1] } })),
      ...(f.away ?? []).map((p, i) => ({ id: id(`a${i}`), name: `O${i + 1}`, number: i + 1, team: "AWAY" as const, position: { x: p[0], y: p[1] } })),
    ]
    return {
      id: `${d.id}-s${si}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name, players, ballPosition: { x: f.ball[0], y: f.ball[1] }, ballVisible: true,
      arrows: (f.arrows ?? []).map((a, k) => {
        const cp = defaultCp(a[0][0], a[0][1], a[1][0], a[1][1])
        return { id: `${d.id}-a${si}-${k}`, fromX: a[0][0], fromY: a[0][1], toX: a[1][0], toY: a[1][1], cpX: cp.cpX, cpY: cp.cpY, color: a[2] ?? "#facc15" }
      }),
    }
  })
  return {
    id: `${d.id}-${Date.now()}`, name: d.name[lang] ?? d.name.en, description: d.desc[lang] ?? d.desc.en,
    date, formation: d.formation, type: "DRILL", steps, category: d.category, ageGroup: d.ageGroup,
  }
}
