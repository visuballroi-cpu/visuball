// VisuBall drill database — real-world coaching drills (rondos, overloads, pressing, transitions, set pieces…).
// Each entry knows how to search for itself, adapt to the requested player counts and step count.
import type { AIDrillResult, AIStep, AIPlayer, AIArrow } from "./aiCoach"
import { P, A, S, LEGACY, fitSteps, parseStepCount } from "./localDrill"

type Phase = AIDrillResult["phase"]
export interface DrillOpts { a: number; d: number; steps: number | null }
export interface DrillEntry {
  id: string
  name: string
  phase: Phase
  ages: string            // e.g. "U10–Senior"
  players: string         // typical numbers, shown to the coach
  keywords: RegExp        // he + en
  concepts?: string[]     // matched against everyday-language concepts
  build: (o: DrillOpts, req: string) => AIDrillResult
}

const r1 = (n: number) => Math.round(n * 10) / 10
const lerp = (a: number, b: number, f: number) => a + (b - a) * f
const clampX = (x: number) => Math.max(1, Math.min(104, x))
const clampY = (y: number) => Math.max(1, Math.min(67, y))
const spread = (n: number, lo: number, hi: number) => Array.from({ length: n }, (_, i) => (n === 1 ? (lo + hi) / 2 : lo + ((hi - lo) * i) / (n - 1)))

// ───────────────────────── parametric: rondo (n attackers vs m defenders) ─────────────────────────
function rondo({ a, d, steps }: DrillOpts): AIDrillResult {
  const nA = Math.max(3, Math.min(9, a)), nD = Math.max(1, Math.min(4, d))
  const cx = 52.5, cy = 34, rx = nA > 6 ? 15 : 12, ry = nA > 6 ? 13 : 11
  const ring = Array.from({ length: nA }, (_, i) => {
    const ang = (i / nA) * Math.PI * 2 - Math.PI / 2
    return { x: r1(cx + Math.cos(ang) * rx), y: r1(cy + Math.sin(ang) * ry) }
  })
  const N = steps ?? 6
  let holder = 0
  let def = Array.from({ length: nD }, (_, k) => ({ x: cx + (k - (nD - 1) / 2) * 4, y: cy + (k % 2 ? 2 : -2) }))
  const out: AIStep[] = []
  for (let k = 0; k < N; k++) {
    const next = (holder + (k % 2 === 0 ? 1 : 2)) % nA
    const ball = ring[holder]
    const target = ring[next]
    // defenders close the ball and the next lane
    def = def.map((p, i) => {
      const tgt = i % 2 === 0 ? ball : { x: lerp(ball.x, target.x, 0.6), y: lerp(ball.y, target.y, 0.6) }
      return { x: lerp(p.x, tgt.x, 0.38), y: lerp(p.y, tgt.y, 0.38) }
    })
    out.push(S(
      k === 0 ? "Set up" : `Pass ${k}`,
      k === 0 ? "Spread the ring — show for the ball!" : k % 3 === 0 ? "Switch the side!" : "One touch, move!",
      ring.map((p, i) => P(i + 1, p.x, p.y)),
      def.map((p, i) => P(i + 1, r1(p.x), r1(p.y))),
      [ball.x, ball.y],
      [A(ball.x, ball.y, target.x, target.y)],
    ))
    holder = next
  }
  return {
    name: `${nA}v${nD} Rondo`, description: `${nA} players keep the ball against ${nD} defender${nD > 1 ? "s" : ""} inside a ${Math.round(rx * 2)}×${Math.round(ry * 2)}m area.`,
    phase: "possession", objective: "Retain possession with one/two touches by creating passing angles and body orientation.",
    coachingPoints: ["Open body: see the ball and the next pass", "Receive on the back foot away from the defender", "Players on the ring offer different distances (short/long)", "On losing the ball the one who lost it becomes the defender"],
    steps: out,
  }
}

// ───────────────────────── parametric: overload (a v d) attacking the goal ─────────────────────────
function overload({ a, d, steps }: DrillOpts): AIDrillResult {
  const nA = Math.max(2, Math.min(6, a)), nD = Math.max(1, Math.min(5, d))
  const ysA = spread(nA, nA > 3 ? 12 : 16, nA > 3 ? 56 : 52)
  const mid = Math.floor(nA / 2)
  const free = nA - 1 // widest player on the far side becomes the free man
  const ysD = spread(nD, 26, 42)
  const key = (x0: number, shift: number, carryX: number): { home: AIPlayer[]; away: AIPlayer[] } => ({
    home: ysA.map((y, i) => P(i + 1, clampX(r1(x0 + (i === mid ? carryX : i === 0 || i === free ? carryX + 8 : carryX - 2))), clampY(r1(y)))),
    away: ysD.map((y, i) => P(i + 1, clampX(r1(78 - i * 1.5 - carryX * 0.15)), clampY(r1(y + shift)))),
  })
  const frames = [
    { n: "Start", ins: "Attack at pace!", ...key(40, 0, 0), ball: [40, ysA[mid]] as [number, number], ar: [A(40, ysA[mid], 55, ysA[mid])] },
    { n: "Commit the defender", ins: "Drive at the defender!", ...key(40, 3, 14), ball: [54, ysA[mid]] as [number, number], ar: [A(54, ysA[mid], 66, ysA[mid]), A(48, ysA[0], 68, ysA[0] + 2, "#38bdf8")] },
    { n: "Pass to the free man", ins: "Release it — free man!", ...key(40, 6, 24), ball: [64, ysA[mid]] as [number, number], ar: [A(64, ysA[mid], 72, ysA[free]), A(60, ysA[free], 74, ysA[free], "#38bdf8")] },
    { n: "Finish", ins: "Shoot / square for tap-in!", ...key(40, 8, 34), ball: [76, ysA[free]] as [number, number], ar: [A(76, ysA[free], 105, 34, "#f87171")] },
  ]
  const base = frames.map((f) => S(f.n, f.ins, f.home, f.away, f.ball, f.ar))
  return {
    name: `${nA}v${nD} Attack Overload`, description: `${nA} attackers against ${nD} defender${nD > 1 ? "s" : ""} finishing on goal.`,
    phase: "attacking", objective: "Use the numerical advantage: commit a defender, release the free player, finish in under 8 seconds.",
    coachingPoints: ["Carrier drives at the nearest defender to fix him", "Wide runners stay on the shoulder, not square", "Pass before the defender is set, not after", "Finish early — first-time if possible"],
    steps: steps ? fitSteps(base, steps) : base,
  }
}

// ───────────────────────── authored entries ─────────────────────────
const switchPlay = (): AIDrillResult => ({
  name: "Switch of Play", description: "Draw the opponent to one side, then switch quickly to the free winger.",
  phase: "attacking", objective: "Move the block laterally with short passes, then switch the point of attack in two passes.",
  coachingPoints: ["Pull the press to the ball side first", "Switch with a driven pass at head height", "Far-side winger starts wide and high"],
  steps: [
    S("Ball side overload", "Short passes — attract them!",
      [P(1, 5, 34), P(4, 25, 22), P(6, 38, 28), P(8, 50, 14), P(10, 54, 24), P(7, 66, 8), P(11, 66, 60)],
      [P(2, 58, 12), P(3, 58, 22), P(4, 58, 32), P(5, 58, 44), P(6, 58, 56)], [50, 14], [A(50, 14, 54, 24)]),
    S("Draw", "Shift them over!",
      [P(1, 5, 34), P(4, 28, 24), P(6, 40, 30), P(8, 52, 16), P(10, 56, 26), P(7, 68, 8), P(11, 66, 60)],
      [P(2, 56, 12), P(3, 56, 20), P(4, 56, 28), P(5, 58, 40), P(6, 60, 52)], [54, 24], [A(54, 24, 40, 30)]),
    S("Switch", "Hit the far side!",
      [P(1, 5, 34), P(4, 28, 24), P(6, 40, 30), P(8, 52, 16), P(10, 56, 26), P(7, 68, 8), P(11, 70, 58)],
      [P(2, 56, 12), P(3, 56, 20), P(4, 56, 28), P(5, 58, 40), P(6, 60, 52)], [40, 30], [A(40, 30, 70, 58)]),
    S("1v1 wide", "Attack the full-back!",
      [P(1, 5, 34), P(4, 28, 24), P(6, 44, 34), P(8, 62, 22), P(10, 66, 30), P(7, 78, 14), P(11, 80, 56)],
      [P(2, 62, 20), P(3, 62, 28), P(4, 64, 38), P(5, 70, 50), P(6, 74, 58)], [70, 58], [A(70, 58, 90, 54), A(66, 30, 88, 40, "#38bdf8")]),
  ],
})

const thirdMan = (): AIDrillResult => ({
  name: "Third-Man Combination", description: "Break the first line with a lay-off and a run in behind.",
  phase: "attacking", objective: "Play to the striker's feet, lay off to the third man arriving from midfield.",
  coachingPoints: ["Striker checks away then in to receive", "Lay-off with one touch, body open", "Third man starts his run when the first pass is struck"],
  steps: [
    S("Start", "Play into feet!", [P(6, 38, 34), P(9, 64, 34), P(8, 50, 24), P(10, 50, 44)], [P(4, 70, 30), P(5, 70, 40), P(2, 56, 28)], [38, 34], [A(38, 34, 64, 34)]),
    S("Lay-off", "One touch back!", [P(6, 40, 34), P(9, 64, 34), P(8, 56, 26), P(10, 52, 44)], [P(4, 68, 31), P(5, 68, 40), P(2, 58, 30)], [64, 34], [A(64, 34, 56, 26), A(56, 26, 74, 22, "#38bdf8")]),
    S("Third man in", "Run in behind!", [P(6, 42, 34), P(9, 70, 40), P(8, 70, 24), P(10, 56, 44)], [P(4, 74, 30), P(5, 74, 40), P(2, 62, 30)], [56, 26], [A(56, 26, 74, 20), A(74, 20, 100, 30, "#f87171")]),
  ],
})

const oneVOne = (): AIDrillResult => ({
  name: "1v1 Duels", description: "Attacker beats the defender and finishes; defender jockeys and delays.",
  phase: "attacking", objective: "Take on the defender at pace using a change of direction, then finish.",
  coachingPoints: ["Approach fast, slow down at 2m, explode past", "Defender: side-on, force wide, don't dive in", "Finish across the keeper"],
  steps: [
    S("Face up", "Attack the space!", [P(10, 66, 34)], [P(4, 82, 34)], [66, 34], [A(66, 34, 76, 34)]),
    S("Feint", "Drop the shoulder — go!", [P(10, 76, 34)], [P(4, 82, 33)], [76, 34], [A(76, 34, 84, 26, "#38bdf8")]),
    S("Beat him", "Accelerate past!", [P(10, 86, 27)], [P(4, 84, 33)], [86, 27], [A(86, 27, 96, 30)]),
    S("Finish", "Across the keeper!", [P(10, 94, 30)], [P(4, 86, 33), P(1, 104, 34)], [94, 30], [A(94, 30, 105, 38, "#f87171")]),
  ],
})

const counterPress = (): AIDrillResult => ({
  name: "Counter-Press (6 seconds)", description: "Win the ball back immediately after losing it, before the opponent can break.",
  phase: "transition_defend", objective: "The nearest 3 players press the ball within 6 seconds while the rest screen the passing lanes.",
  coachingPoints: ["Nearest player blocks the forward pass first", "Nobody chases alone — press in a triangle", "Back line steps up together to compress space"],
  steps: [
    S("Loss of ball", "Lost it — react!", [P(8, 62, 30), P(10, 58, 40), P(6, 52, 34), P(4, 38, 22), P(5, 38, 46), P(9, 70, 34)], [P(6, 66, 28), P(8, 72, 20), P(10, 72, 48), P(4, 84, 34)], [66, 28], []),
    S("Press", "Press the ball NOW!", [P(8, 65, 29), P(10, 62, 36), P(6, 58, 33), P(4, 44, 24), P(5, 44, 44), P(9, 70, 32)], [P(6, 66, 28), P(8, 72, 20), P(10, 72, 48), P(4, 84, 34)], [66, 28], [A(62, 30, 66, 28, "#f87171"), A(58, 40, 64, 34, "#f87171")]),
    S("Win it back", "Win it — attack!", [P(8, 66, 29), P(10, 64, 33), P(6, 60, 33), P(4, 50, 26), P(5, 50, 42), P(9, 72, 34)], [P(6, 67, 28), P(8, 72, 22), P(10, 72, 46), P(4, 84, 34)], [66, 30], [A(66, 30, 74, 34)]),
  ],
})

const throwIn = (): AIDrillResult => ({
  name: "Throw-In Routine", description: "Short throw to the near player, third-man run down the line.",
  phase: "set_piece", objective: "Retain possession from a throw-in and progress up the touchline.",
  coachingPoints: ["Thrower brings two options: short and in behind", "Receiver sets the ball back to a supporting player", "Create a triangle within 8m"],
  steps: [
    S("Set", "Show for the throw!", [P(2, 62, 0.5), P(8, 58, 10), P(6, 52, 20), P(10, 70, 18)], [P(3, 62, 8), P(5, 68, 14)], [62, 0.5], [A(62, 0.5, 58, 10)]),
    S("Lay-off", "Set it back!", [P(2, 62, 6), P(8, 58, 10), P(6, 54, 20), P(10, 72, 16)], [P(3, 60, 10), P(5, 66, 14)], [58, 10], [A(58, 10, 54, 20)]),
    S("Run in behind", "Play it down the line!", [P(2, 66, 6), P(8, 60, 12), P(6, 54, 20), P(10, 76, 10)], [P(3, 64, 12), P(5, 72, 14)], [54, 20], [A(54, 20, 76, 10), A(62, 6, 78, 5, "#38bdf8")]),
  ],
})

const freeKick = (): AIDrillResult => ({
  name: "Free Kick Routine", description: "Decoy run over the ball, shot around the wall by the second taker.",
  phase: "set_piece", objective: "Beat the wall with a disguised routine from ~22m.",
  coachingPoints: ["Decoy runs over the ball to move the wall", "Second taker strikes with pace to the keeper's near side", "Two players ready for rebounds"],
  steps: [
    S("Set", "Take positions!", [P(10, 80, 34), P(8, 80, 38), P(9, 94, 28), P(7, 94, 40)], [P(1, 104, 34), P(2, 90, 31), P(3, 90, 34), P(4, 90, 37), P(5, 90, 40)], [80, 34], []),
    S("Decoy", "Run over it!", [P(10, 79, 34), P(8, 82, 37), P(9, 94, 28), P(7, 94, 40)], [P(1, 104, 34), P(2, 90, 31), P(3, 90, 34), P(4, 90, 37), P(5, 90, 40)], [80, 34], [A(79, 34, 86, 34, "#a3e635")]),
    S("Strike", "Hit it!", [P(10, 86, 34), P(8, 82, 37), P(9, 96, 28), P(7, 96, 38)], [P(1, 104, 34), P(2, 90, 31), P(3, 90, 34), P(4, 90, 37), P(5, 90, 40)], [80, 34], [A(80, 34, 105, 31, "#f87171")]),
  ],
})

const lowBlock = (): AIDrillResult => ({
  name: "Low-Block Shifting", description: "Compact 4-4-2 shifts across with the ball and protects the box.",
  phase: "defending", objective: "Keep the block compact (≤30m vertically, ≤10m between players) and shift together.",
  coachingPoints: ["Ball side tight, far side tucks in", "Strikers screen the pivot", "Nobody jumps out alone — pass the marker on"],
  steps: [
    S("Centre", "Hold the shape!", [P(1, 5, 34), P(2, 24, 14), P(3, 22, 27), P(4, 22, 41), P(5, 24, 54), P(6, 38, 10), P(7, 36, 26), P(8, 36, 42), P(9, 38, 58), P(10, 48, 28), P(11, 48, 40)], [P(6, 62, 34), P(8, 66, 22), P(10, 66, 46), P(2, 70, 8), P(5, 70, 60)], [62, 34], []),
    S("Ball goes left", "Shift! Compact!", [P(1, 5, 34), P(2, 24, 10), P(3, 22, 22), P(4, 22, 34), P(5, 24, 46), P(6, 38, 8), P(7, 36, 20), P(8, 36, 34), P(9, 38, 46), P(10, 48, 20), P(11, 48, 32)], [P(6, 62, 34), P(8, 66, 22), P(10, 66, 46), P(2, 70, 8), P(5, 70, 60)], [70, 8], [A(62, 34, 70, 8)]),
    S("Ball goes right", "Shift back!", [P(1, 5, 34), P(2, 24, 22), P(3, 22, 34), P(4, 22, 46), P(5, 24, 58), P(6, 38, 22), P(7, 36, 34), P(8, 36, 48), P(9, 38, 60), P(10, 48, 36), P(11, 48, 48)], [P(6, 62, 34), P(8, 66, 22), P(10, 66, 46), P(2, 70, 8), P(5, 70, 60)], [70, 60], [A(70, 8, 70, 60)]),
  ],
})

const diamondPassing = (): AIDrillResult => ({
  name: "Diamond Passing & Move", description: "Pass-and-follow pattern around a diamond to warm up technique and rhythm.",
  phase: "possession", objective: "Clean first touches and passing weight while moving into the next position.",
  coachingPoints: ["Pass with the inside of the foot, ankle locked", "Follow your pass to the next cone", "Call the name before you pass"],
  steps: [
  ],
})

export const DRILLS: DrillEntry[] = [
  { id: "rondo", concepts: ["possession","rondo"], name: "Rondo (n v m)", phase: "possession", ages: "U8–Senior", players: "4v1 – 8v3", keywords: /רונדו|שמירת כדור|שמירה על הכדור|פוזשן|rondo|keep.?ball|possession|piggy/i, build: (o) => rondo(o) },
  { id: "overload", concepts: ["overload","attack"], name: "Attacking overload (n v m)", phase: "attacking", ages: "U10–Senior", players: "2v1 – 5v3", keywords: /עדיפות|תוספת|מספרית|overload|numerical/i, build: (o) => overload(o) },
  { id: "overlap", concepts: ["overlap","cross","wing","striker"], name: "Wing Overlap & Cross", phase: "attacking", ages: "U12–Senior", players: "5v3", keywords: /כנף|אוברלאפ|הגבהה|crossing|cross|overlap|wing/i, build: () => LEGACY.overlap() },
  { id: "switch", concepts: ["switch","wing"], name: "Switch of Play", phase: "attacking", ages: "U14–Senior", players: "7v5", keywords: /החלפת צד|הפצה|החלפה|switch|change of (?:side|play)|long ball/i, build: () => switchPlay() },
  { id: "thirdman", concepts: ["combo","striker","midfield"], name: "Third-Man Combination", phase: "attacking", ages: "U14–Senior", players: "4v3", keywords: /איש שלישי|שלישי|שילוב|קומבינציה|third.?man|combination|one.?two|wall.?pass/i, build: () => thirdMan() },
  { id: "1v1", concepts: ["duel","dribble"], name: "1v1 Duels", phase: "attacking", ages: "U8–Senior", players: "1v1", keywords: /1\s*(?:v|על)\s*1|אחד על אחד|דו קרב|דריבל|1v1|one.?v.?one|dribbl/i, build: () => oneVOne() },
  { id: "finishing", concepts: ["shoot","striker"], name: "Finishing Combination", phase: "attacking", ages: "U10–Senior", players: "3 + GK", keywords: /בעיטה|סיום|גימור|שער|finish|shoot|shot|goal/i, build: () => LEGACY.finishing() },
  { id: "pressing", concepts: ["press","defend"], name: "Pressing Trigger Drill", phase: "defending", ages: "U14–Senior", players: "8v6", keywords: /לחץ|פרסינג|לחיצה|press|trigger/i, build: () => LEGACY.press() },
  { id: "lowblock", concepts: ["defend","block"], name: "Low-Block Shifting", phase: "defending", ages: "U14–Senior", players: "11v5", keywords: /הגנה|בלוק|הגנה נמוכה|שמירת צורה|defen|low.?block|shape|shift/i, build: () => lowBlock() },
  { id: "counter", concepts: ["counter","attack","striker"], name: "3v2 Counter Attack", phase: "transition_attack", ages: "U12–Senior", players: "3v2", keywords: /מתפרצת|מעבר|התקפה מהירה|counter|transition|break/i, build: () => LEGACY.counter() },
  { id: "counterpress", concepts: ["transition","press","defend"], name: "Counter-Press (6s)", phase: "transition_defend", ages: "U14–Senior", players: "6v4", keywords: /לחץ נגדי|אחרי איבוד|איבוד כדור|counter.?press|gegenpress|losing the ball|regain|recover/i, build: () => counterPress() },
  { id: "corner", concepts: ["setpiece","corner","cross"], name: "Corner Kick Routine", phase: "set_piece", ages: "U12–Senior", players: "7v6", keywords: /קרן|קרנות|corner/i, build: () => LEGACY.corner() },
  { id: "freekick", concepts: ["setpiece","freekick","shoot"], name: "Free Kick Routine", phase: "set_piece", ages: "U12–Senior", players: "4v5", keywords: /בעיטה חופשית|חופשית|כדור נייח|free.?kick|set.?piece/i, build: () => freeKick() },
  { id: "throwin", concepts: ["setpiece","throwin","wing"], name: "Throw-In Routine", phase: "set_piece", ages: "U10–Senior", players: "4v2", keywords: /חוץ|זריקת חוץ|זריקה|throw.?in/i, build: () => throwIn() },
  { id: "buildup", concepts: ["buildup","gk","midfield"], name: "Build-up from the Back", phase: "possession", ages: "U12–Senior", players: "8v3", keywords: /בנייה|בניית משחק|יציאה מהשוער|מהשוער|build.?up|play out|goalkeeper|gk/i, build: (_o, req) => LEGACY.buildUp(req) },
  { id: "diamond", concepts: ["pass","warmup"], name: "Diamond Passing", phase: "possession", ages: "U8–Senior", players: "4", keywords: /מסירות|חימום|טכניקה|יהלום|passing|warm.?up|technical|diamond/i, build: () => diamondPassingFixed() },
]

function diamondPassingFixed(): AIDrillResult {
  const pos = [[42, 34], [52.5, 22], [63, 34], [52.5, 46]]
  const steps: AIStep[] = []
  for (let k = 0; k < 4; k++) {
    // each player passes to the next and follows to its position
    const home = pos.map((p, i) => P(i + 1, p[0], p[1]))
    const from = pos[k % 4], to = pos[(k + 1) % 4]
    steps.push(S(`Pass ${k + 1}`, k === 0 ? "Pass and follow!" : "Next player — move!", home, [], [from[0], from[1]], [A(from[0], from[1], to[0], to[1])]))
  }
  const d = diamondPassing()
  return { ...d, steps }
}


// ───────────────────────── everyday-language understanding (Hebrew + English slang) ─────────────────────────
const LEXICON: Record<string, RegExp> = {
  overlap: /עוקף|עוקפ|עקיפ|אוברלאפ|מאחורי הקיצוני|מאחורי הכנף|בחוץ של|overlap|run(?:s|ning)? (?:around|outside)|underlap|פנימה מאחורי/i,
  cross: /מגביה|מגבי|הגבה|הגבהה|קרוס|כדור לרחבה|כדור גבוה|מרכז|מרכוז|שחרור לרחבה|cross|deliver|whip|ball into the box|תוך הרחבה/i,
  wing: /קיצוני|כנף|אגף|שפה|קו הצד|wing|winger|full.?back|wide|touchline|flank|מגן/i,
  striker: /חלוץ|סטרייקר|תשע|9\b|striker|forward|target man|number nine/i,
  midfield: /קשר|קשרים|פלייר|מרכז השדה|midfield|midfielder|pivot|number (?:6|8|10)/i,
  gk: /שוער|שוערים|goalkeeper|keeper|gk/i,
  cb: /בלם|בלמים|center.?back|centre.?back|cb\b/i,
  buildup: /בניי?ה|יציאה|מוציא|מוציאים|build.?up|play(?:ing)? out|from the back|מהשוער/i,
  press: /לוחץ|לוחצים|מלחיץ|לחץ|פרסינג|חוטף|חטיפה|סוגר|סוגרים|press|hunt|harass|close down|win it back|trigger/i,
  defend: /מגן על|שומר|הגנה|מגנים|חוסם|חסימה|שמירה|defend|defence|defense|protect|block|shape|compact/i,
  block: /בלוק|קומפקט|צפיפות|compact|low.?block|mid.?block/i,
  counter: /יוצאים מהר|יציאה מהירה|מהר קדימה|חוטפים ו|מתפרצת|מתפרץ|פורצים|מהיר קדימה|מעבר מהיר|counter|break(?:away)?|fast break|quick (?:attack|transition)/i,
  transition: /מעבר|אחרי איבוד|אחרי חטיפה|איבדנו|transition|after losing|after winning|turnover/i,
  shoot: /בועט|בעיטה|בעיטות|קולע|כובש|סיום|גימור|שער|shoot|shot|finish|score|strike/i,
  duel: /אחד על אחד|דו.?קרב|עימות|1v1|one.?v.?one|duel/i,
  dribble: /דריבל|כדרור|מכדרר|עוקף שחקן|dribble|take on|beat (?:a |the )?(?:man|defender)/i,
  combo: /קומבינציה|שילוב|איש שלישי|שלישי|וול|קיר|חילופי מסירות|one.?two|give.?and.?go|wall.?pass|combination|third.?man|link.?up/i,
  switch: /החלפת צד|מחליף צד|הפצה|מעביר לצד השני|מצד לצד|switch|change (?:the )?(?:side|point)|diagonal|long (?:ball|pass)/i,
  possession: /שמירת כדור|שמירה על הכדור|פוזשן|החזקת כדור|מחזיקים|possession|keep.?ball|retain/i,
  rondo: /רונדו|rondo|piggy|בתוך הריבוע|ריבוע/i,
  pass: /מסירה|מסירות|מוסר|passing|passes/i,
  warmup: /חימום|טכני|טכניקה|warm.?up|technical/i,
  setpiece: /כדור נייח|כדורים נייחים|set.?piece/i,
  corner: /קרן|קרנות|corner/i,
  freekick: /בעיטה חופשית|חופשית|עונשין|free.?kick/i,
  throwin: /זריקת חוץ|זריקה מהצד|זורק|throw.?in/i,
  attack: /התקפ|תוקפ|מתקפ|תקיפה|attack|create chances|chance creation/i,
  overload: /עדיפות|תוספת שחקן|מספרית|overload|numerical|extra man|\d\s*(?:v|vs|נגד|על)\s*\d/i,
}

export function detectConcepts(req: string): Set<string> {
  const text = req.replace(/[\u0591-\u05C7]/g, "")
  const out = new Set<string>()
  for (const [k, re] of Object.entries(LEXICON)) if (re.test(text)) out.add(k)
  return out
}

/** Which side of the pitch the coach talks about (mirror the drill when "left"). */
function wantsLeft(req: string): boolean {
  return /שמאל|שמאלי|left/i.test(req) && !/ימין|ימני|right/i.test(req)
}

function mirror(d: AIDrillResult): AIDrillResult {
  const f = (p: AIPlayer): AIPlayer => ({ ...p, y: r1(68 - p.y) })
  return {
    ...d,
    steps: d.steps.map((s) => ({
      ...s, homePlayers: s.homePlayers.map(f), awayPlayers: s.awayPlayers.map(f),
      ball: { x: s.ball.x, y: r1(68 - s.ball.y) },
      arrows: s.arrows.map((a) => ({ ...a, fromY: r1(68 - a.fromY), toY: r1(68 - a.toY) })),
    })),
  }
}

// ───────────────────────── search ─────────────────────────
export function parseMatchup(req: string): { a: number; d: number } | null {
  const m = req.match(/(\d{1,2})\s*(?:v|vs|x|נגד|על|against)\s*(\d{1,2})/i)
  return m ? { a: +m[1], d: +m[2] } : null
}

export function searchDrills(req: string): Array<{ entry: DrillEntry; score: number }> {
  const mu = parseMatchup(req)
  const cs = detectConcepts(req)
  const scored = DRILLS.map((entry) => {
    let score = 0
    const hits = req.match(new RegExp(entry.keywords.source, "gi"))
    if (hits) score += hits.length * 2
    for (const c of entry.concepts ?? []) if (cs.has(c)) score += 3
    // generic "n v m" requests fit rondo (many v few, ≥4 attackers) or overload (otherwise)
    if (mu && entry.id === "rondo" && /רונדו|rondo|possession|שמירת/i.test(req)) score += 4
    else if (mu && entry.id === "overload" && mu.a > 1 && !/רונדו|rondo/i.test(req)) score += 3
    if (mu && mu.a === 1 && mu.d === 1 && entry.id === "1v1") score += 10
    return { entry, score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)
  return scored
}

/** Best library drill for the request, adapted to player counts and step count. */
export function buildFromLibrary(req: string): AIDrillResult {
  const mu = parseMatchup(req)
  const found = searchDrills(req)
  const entry = found[0]?.entry ?? DRILLS.find((x) => x.id === "buildup")!
  const o: DrillOpts = { a: mu?.a ?? 5, d: mu?.d ?? 2, steps: parseStepCount(req) }
  if (!mu && entry.id === "overload") { o.a = 3; o.d = 2 }
  const drill = entry.build(o, req)
  if (o.steps && drill.steps.length !== o.steps) drill.steps = fitSteps(drill.steps, o.steps)
  const done = wantsLeft(req) ? mirror(drill) : drill
  return { ...done, source: "library" }
}

/** Compact reference drills for grounding an LLM (adapt, don't copy). */
export const GLOSSARY =
  "Football slang glossary (Hebrew/English): מגן=full-back, קיצוני/כנף=winger, חלוץ=striker, קשר=midfielder, בלם=center-back, שוער=goalkeeper, " +
  "עוקף/אוברלאפ=overlapping run, מגביה=crosses into the box, חוטף=wins the ball, לוחץ=presses, מתפרצת=counter-attack, קיר/וול=wall pass, " +
  "החלפת צד=switch of play. Interpret casual descriptions as a coach would and turn them into a precise, step-by-step drill."

export function referenceExamples(req: string, k = 2): string {
  const picks = searchDrills(req).slice(0, k).map((x) => x.entry)
  const list = picks.length ? picks : [DRILLS.find((x) => x.id === "buildup")!, DRILLS.find((x) => x.id === "overload")!]
  const mu = parseMatchup(req)
  return list
    .map((e) => {
      const d = e.build({ a: mu?.a ?? 4, d: mu?.d ?? 2, steps: null }, req)
      return JSON.stringify({ ...d, steps: d.steps.slice(0, 4) }, (key, v) => (key === "source" ? undefined : v))
    })
    .join("\n")
}

/** Light sanity pass for any drill (LLM or library): bounds, overlapping players pushed apart. */
export function polishDrill(d: AIDrillResult): AIDrillResult {
  const fix = (ps: AIPlayer[]): AIPlayer[] => {
    const out: AIPlayer[] = []
    for (const p of ps) {
      let x = clampX(p.x), y = clampY(p.y)
      for (const q of out) if (Math.hypot(q.x - x, q.y - y) < 1.4) { x = clampX(x + 1.6); y = clampY(y + 1.2) }
      out.push({ number: p.number, x: r1(x), y: r1(y) })
    }
    return out
  }
  return { ...d, steps: d.steps.map((s) => ({ ...s, homePlayers: fix(s.homePlayers), awayPlayers: fix(s.awayPlayers) })) }
}

export type { AIArrow }
