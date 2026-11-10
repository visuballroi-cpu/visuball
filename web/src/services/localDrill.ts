// Offline drill generator — always works (no API key / network). Keyword-matched templates.
import type { AIDrillResult, AIStep, AIPlayer, AIArrow } from "./aiCoach"

export const P = (number: number, x: number, y: number): AIPlayer => ({ number, x, y })
export const A = (fromX: number, fromY: number, toX: number, toY: number, color = "#facc15"): AIArrow => ({ fromX, fromY, toX, toY, color })
export const S = (name: string, instruction: string, home: AIPlayer[], away: AIPlayer[], ball: [number, number], arrows: AIArrow[] = []): AIStep =>
  ({ name, instruction, homePlayers: home, awayPlayers: away, ball: { x: ball[0], y: ball[1] }, arrows })

type Tpl = { re: RegExp; build: (req: string) => AIDrillResult }

const rondo = (): AIDrillResult => ({
  name: "5v2 Rondo", description: "Keep possession in a square against two pressing defenders.",
  phase: "possession", objective: "Play on the first touch using open body shape to escape pressure.",
  coachingPoints: ["Show for the ball with an open body", "Pass and move to a new angle", "Defenders press the pass, not the player"],
  steps: [
    S("Set up", "Spread the square!",
      [P(1, 42, 22), P(2, 62, 22), P(3, 62, 46), P(4, 42, 46), P(5, 52, 34)], [P(1, 50, 30), P(2, 55, 38)], [42, 22], [A(42, 22, 62, 22)]),
    S("Switch", "Play across — move!",
      [P(1, 42, 22), P(2, 62, 22), P(3, 62, 46), P(4, 42, 46), P(5, 52, 34)], [P(1, 56, 24), P(2, 56, 36)], [62, 22], [A(62, 22, 62, 46), A(62, 46, 42, 46, "#38bdf8")]),
    S("Break pressure", "Third man — find the gap!",
      [P(1, 42, 22), P(2, 62, 22), P(3, 62, 46), P(4, 42, 46), P(5, 50, 34)], [P(1, 60, 40), P(2, 52, 44)], [62, 46], [A(62, 46, 50, 34), A(50, 34, 42, 22)]),
  ],
})

const overlap = (): AIDrillResult => ({
  name: "Wing Overlap & Cross", description: "Winger holds, full-back overlaps, cross to the striker.",
  phase: "attacking", objective: "Time the overlap run after the pass and deliver a early cross.",
  coachingPoints: ["Overlap fires AFTER the pass", "Winger cuts inside to drag the full-back", "Striker attacks the near post, #8 the far post"],
  steps: [
    S("Build", "Winger gets the ball!",
      [P(1, 5, 34), P(2, 40, 8), P(3, 55, 14), P(8, 62, 34), P(9, 80, 30)], [P(2, 60, 14), P(5, 82, 34), P(6, 82, 24)], [55, 14], [A(55, 14, 60, 12)]),
    S("Overlap", "Run now!",
      [P(1, 5, 34), P(2, 62, 10), P(3, 62, 16), P(8, 68, 34), P(9, 82, 30)], [P(2, 68, 16), P(5, 84, 34), P(6, 84, 24)], [62, 16], [A(40, 8, 78, 6, "#38bdf8"), A(62, 16, 74, 8)]),
    S("Cross", "Early ball in!",
      [P(1, 5, 34), P(2, 80, 6), P(3, 70, 20), P(8, 90, 40), P(9, 90, 30)], [P(2, 84, 18), P(5, 92, 34), P(6, 92, 26)], [80, 6], [A(80, 6, 90, 30), A(70, 20, 88, 38, "#38bdf8")]),
  ],
})

const press = (): AIDrillResult => ({
  name: "Pressing Trigger Drill", description: "Compact the block and press on the trigger pass.",
  phase: "defending", objective: "Press together on a bad touch and cut the passing lanes.",
  coachingPoints: ["Heavy touch → press NOW", "Curve runs to cut the pass back", "Block stays compact: 35m max between lines"],
  steps: [
    S("Mid block", "Hold the shape!",
      [P(1, 5, 34), P(2, 40, 12), P(3, 40, 26), P(4, 40, 42), P(5, 40, 56), P(6, 55, 24), P(7, 55, 44), P(9, 68, 34)],
      [P(1, 95, 34), P(2, 70, 10), P(3, 70, 28), P(4, 70, 40), P(5, 70, 58), P(6, 58, 34)], [70, 28], [A(70, 28, 58, 34, "#f87171")]),
    S("Trigger", "Press now!",
      [P(1, 5, 34), P(2, 44, 14), P(3, 44, 27), P(4, 44, 41), P(5, 44, 54), P(6, 58, 28), P(7, 58, 40), P(9, 64, 34)],
      [P(1, 95, 34), P(2, 70, 10), P(3, 68, 28), P(4, 70, 40), P(5, 70, 58), P(6, 58, 34)], [58, 34], [A(64, 34, 58, 34, "#f87171"), A(58, 28, 58, 33, "#f87171")]),
    S("Win it", "Win the ball and go!",
      [P(1, 5, 34), P(2, 48, 14), P(3, 48, 27), P(4, 48, 41), P(5, 48, 54), P(6, 60, 32), P(7, 60, 38), P(9, 62, 34)],
      [P(1, 95, 34), P(2, 70, 10), P(3, 68, 28), P(4, 70, 40), P(5, 70, 58), P(6, 58, 34)], [60, 34], [A(60, 34, 80, 34)]),
  ],
})

const counter = (): AIDrillResult => ({
  name: "3v2 Counter Attack", description: "Win the ball and attack quickly with a numerical advantage.",
  phase: "transition_attack", objective: "Use width and speed to finish within 8 seconds of winning the ball.",
  coachingPoints: ["First pass forward", "Wide runners stretch the defense", "Carry the ball at the central defender"],
  steps: [
    S("Win the ball", "Break!",
      [P(8, 45, 34), P(7, 50, 12), P(11, 50, 56)], [P(4, 80, 28), P(5, 80, 40)], [45, 34], [A(45, 34, 62, 34)]),
    S("Spread", "Go wide — run!",
      [P(8, 62, 34), P(7, 66, 10), P(11, 66, 58)], [P(4, 82, 28), P(5, 82, 40)], [62, 34], [A(62, 34, 76, 34), A(66, 10, 82, 8, "#38bdf8"), A(66, 58, 82, 60, "#38bdf8")]),
    S("Finish", "Square it — shoot!",
      [P(8, 78, 34), P(7, 90, 14), P(11, 92, 50)], [P(4, 88, 28), P(5, 88, 42)], [78, 34], [A(78, 34, 92, 50), A(92, 50, 105, 34, "#f87171")]),
  ],
})

const finishing = (): AIDrillResult => ({
  name: "Finishing Combination", description: "Wall pass, cut back and shoot.",
  phase: "attacking", objective: "Finish first time after a one-two at the edge of the box.",
  coachingPoints: ["Open the body to the far post", "Shoot early", "Follow in for rebounds"],
  steps: [
    S("One-two", "Play and go!", [P(9, 66, 34), P(10, 72, 20), P(11, 72, 48)], [P(1, 104, 34)], [66, 34], [A(66, 34, 72, 20), A(66, 34, 82, 34, "#38bdf8")]),
    S("Return", "Wall pass back!", [P(9, 82, 34), P(10, 74, 20), P(11, 76, 48)], [P(1, 104, 34)], [74, 20], [A(74, 20, 86, 34)]),
    S("Shoot", "Strike it!", [P(9, 88, 34), P(10, 78, 22), P(11, 84, 46)], [P(1, 104, 34)], [88, 34], [A(88, 34, 105, 30, "#f87171")]),
  ],
})

const corner = (): AIDrillResult => ({
  name: "Corner Kick Routine", description: "Near-post flick-on with a late far-post run.",
  phase: "set_piece", objective: "Create a free header at the far post using blocking runs.",
  coachingPoints: ["Delay the run to arrive on the delivery", "Block the marker, don't hold", "Keep two players back for the counter"],
  steps: [
    S("Set", "Take positions!",
      [P(7, 104, 1), P(9, 96, 28), P(5, 94, 36), P(6, 92, 32), P(10, 90, 40), P(4, 60, 34), P(3, 58, 24)],
      [P(1, 104, 34), P(2, 98, 30), P(3, 98, 36), P(4, 96, 26), P(5, 96, 40), P(6, 92, 34)], [104, 1], [A(104, 1, 98, 28)]),
    S("Run & deliver", "Go! Attack the ball!",
      [P(7, 104, 1), P(9, 100, 28), P(5, 96, 32), P(6, 94, 36), P(10, 92, 44), P(4, 60, 34), P(3, 58, 24)],
      [P(1, 104, 34), P(2, 98, 30), P(3, 98, 36), P(4, 96, 26), P(5, 96, 40), P(6, 92, 34)], [98, 28], [A(94, 36, 100, 42, "#38bdf8"), A(92, 44, 100, 40, "#38bdf8")]),
  ],
})

const buildUp = (req: string): AIDrillResult => ({
  name: "Build-up from the Back", description: `Playing out from the goalkeeper (${req.slice(0, 40)}).`,
  phase: "possession", objective: "Break the first press with a goalkeeper-led build-up.",
  coachingPoints: ["GK is the extra player", "Full-backs high and wide", "Pivot drops between center-backs"],
  steps: [
    S("Start", "Keeper plays short!",
      [P(1, 5, 34), P(4, 18, 24), P(5, 18, 44), P(2, 30, 6), P(3, 30, 62), P(6, 34, 34), P(8, 46, 22), P(10, 46, 46)],
      [P(9, 38, 30), P(11, 38, 40), P(7, 52, 34)], [5, 34], [A(5, 34, 18, 24)]),
    S("Draw the press", "Switch the side!",
      [P(1, 5, 34), P(4, 18, 24), P(5, 18, 44), P(2, 34, 6), P(3, 34, 62), P(6, 34, 34), P(8, 48, 22), P(10, 48, 46)],
      [P(9, 22, 28), P(11, 38, 40), P(7, 52, 34)], [18, 24], [A(18, 24, 18, 44)]),
    S("Break the line", "Find the free man!",
      [P(1, 5, 34), P(4, 18, 24), P(5, 22, 44), P(2, 40, 6), P(3, 40, 62), P(6, 36, 34), P(8, 52, 22), P(10, 52, 46)],
      [P(9, 28, 28), P(11, 28, 40), P(7, 52, 34)], [22, 44], [A(22, 44, 40, 62), A(40, 62, 52, 46, "#38bdf8")]),
  ],
})

const TEMPLATES: Tpl[] = [
  { re: /רונדו|שמירת כדור|שמירה על הכדור|rondo|possession|keep.?ball/i, build: rondo },
  { re: /קרן|נייח|קרנות|corner|set.?piece|free.?kick/i, build: corner },
  { re: /כנף|אוברלאפ|הגבהה|crossing|cross|overlap|wing/i, build: overlap },
  { re: /לחץ|פרסינג|הגנה|לחיצה|press|defen/i, build: press },
  { re: /מתפרצת|מעבר|התקפה מהירה|counter|transition|break/i, build: counter },
  { re: /בעיטה|סיום|גימור|שער|finish|shoot|shot|goal/i, build: finishing },
]

export const LEGACY = { rondo, overlap, press, counter, finishing, corner, buildUp }

export function generateLocalDrill(request: string): AIDrillResult {
  const t = TEMPLATES.find((x) => x.re.test(request))
  return (t ? t.build : buildUp)(request)
}

// ─── Requested step count ("10 שלבים", "ten steps", "עשרה שלבים") ───────────
const HE_NUM: Record<string, number> = {
  שני: 2, שניים: 2, שתי: 2, שתיים: 2, שלוש: 3, שלושה: 3, ארבע: 4, ארבעה: 4, חמש: 5, חמישה: 5,
  שש: 6, שישה: 6, שבע: 7, שבעה: 7, שמונה: 8, תשע: 9, תשעה: 9, עשר: 10, עשרה: 10,

  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
}
const WORD = "(?:שלבים|שלב|צעדים|סטפים|steps?|stages?|phases?)"

export function parseStepCount(req: string): number | null {
  const d = req.match(new RegExp(`(\\d{1,2})\\s*${WORD}`, "i")) ?? req.match(new RegExp(`${WORD}\\s*[:=]?\\s*(\\d{1,2})`, "i"))
  let n: number | undefined = d ? parseInt(d[1], 10) : undefined
  if (n === undefined) {
    const w = req.match(new RegExp(`(\\S+)\\s+${WORD}`, "i"))
    if (w) n = HE_NUM[w[1].toLowerCase()] ?? HE_NUM[w[1].replace(/^[בלוכמש]/, "").toLowerCase()]
  }
  return n && n >= 1 && n <= 24 ? n : null
}

/** Resample a drill to exactly `n` steps, interpolating player/ball motion between keyframes. */
export function fitSteps(steps: AIStep[], n: number): AIStep[] {
  if (steps.length === 0 || n < 1) return steps
  if (steps.length === n) return steps
  if (n === 1) return [steps[0]]
  const lerp = (a: number, b: number, f: number) => a + (b - a) * f
  const mix = (A: AIPlayer[], B: AIPlayer[], f: number): AIPlayer[] =>
    A.map((p) => {
      const q = B.find((x) => x.number === p.number) ?? p
      return { number: p.number, x: +lerp(p.x, q.x, f).toFixed(1), y: +lerp(p.y, q.y, f).toFixed(1) }
    })
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * (steps.length - 1)
    const a = Math.floor(t), b = Math.min(steps.length - 1, a + 1), f = t - a
    const key = steps[Math.round(t)]
    if (f === 0) return { ...steps[a], name: `${i + 1}. ${steps[a].name.replace(/^\d+\.\s*/, "")}` }
    const sa = steps[a], sb = steps[b]
    return {
      name: `${i + 1}. ${key.name.replace(/^\d+\.\s*/, "")}`,
      instruction: key.instruction,
      homePlayers: mix(sa.homePlayers, sb.homePlayers, f),
      awayPlayers: mix(sa.awayPlayers, sb.awayPlayers, f),
      ball: { x: +lerp(sa.ball.x, sb.ball.x, f).toFixed(1), y: +lerp(sa.ball.y, sb.ball.y, f).toFixed(1) },
      arrows: key.arrows,
    }
  })
}
