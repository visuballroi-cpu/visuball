// ─── AI Coach — Claude (primary) + Gemini (fallback) + Pollinations (last resort) ──
import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { generateLocalDrill, parseStepCount, fitSteps } from "./localDrill"

export interface AIPlayer { number: number; x: number; y: number }
export interface AIArrow  { fromX: number; fromY: number; toX: number; toY: number; color: string }

export interface AIStep {
  name: string
  instruction: string          // coaching cue for this specific step
  homePlayers: AIPlayer[]
  awayPlayers: AIPlayer[]
  ball: { x: number; y: number }
  arrows: AIArrow[]
}

export interface AIDrillResult {
  name: string
  description: string
  phase: "attacking" | "defending" | "transition_attack" | "transition_defend" | "possession" | "set_piece" | "fitness"
  objective: string            // single tactical/technical objective
  coachingPoints: string[]     // 2-5 key teaching points for the whole drill
  steps: AIStep[]
  source?: "ai" | "local"
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `You are a UEFA Pro Licence football/soccer tactical coach AI embedded in the VisuBall tactical board app.
You think, plan, and communicate like an elite head coach — not a data tool.

══════════════════════════════════════════════════════
PITCH GEOMETRY
══════════════════════════════════════════════════════
Width: 105 (x-axis), Height: 68 (y-axis). Origin: top-left.
Home team (blue) attacks LEFT → RIGHT. GK at x≈5.
Away team (red) attacks RIGHT → LEFT. GK at x≈100.
Center of pitch: x=52.5, y=34.
Left touchline: y=0. Right touchline: y=68.
Home goal line: x=0. Away goal line: x=105.

THIRDS:
  Defensive third:   x=0–35
  Middle third:      x=35–70
  Attacking third:   x=70–105

══════════════════════════════════════════════════════
REFERENCE POSITIONS (HOME TEAM — away mirrors: awayX = 105 - homeX)
══════════════════════════════════════════════════════
GK(5,34)
RB(22,10)  CB(20,25)  CB(20,43)  LB(22,58)
RWB(30,8)  LWB(30,60)
CDM(36,34)  CDM(36,26)  CDM(36,42)
CM(44,22)  CM(44,34)  CM(44,46)
CAM(52,34)  CAM(50,22)  CAM(50,46)
RM(50,10)  LM(50,58)
RW(65,12)  LW(65,56)
CF(72,34)  ST(72,34)  ST(68,24)  ST(68,44)
SS(60,28)  SS(60,40)

FORMATIONS (home side):
4-3-3:   GK(5,34) RB(22,10) CB(20,25) CB(20,43) LB(22,58) CM(38,20) CDM(36,34) CM(38,48) RW(65,12) ST(68,34) LW(65,56)
4-4-2:   GK(5,34) RB(22,10) CB(20,25) CB(20,43) LB(22,58) RM(42,10) CM(40,25) CM(40,43) LM(42,58) ST(68,24) ST(68,44)
4-2-3-1: GK(5,34) RB(22,10) CB(20,25) CB(20,43) LB(22,58) CDM(35,26) CDM(35,42) RAM(52,14) CAM(52,34) LAM(52,54) ST(72,34)
3-5-2:   GK(5,34) CB(18,20) CB(18,34) CB(18,48) RWB(40,8) CM(36,22) CDM(36,34) CM(36,46) LWB(40,60) ST(65,26) ST(65,42)
4-1-4-1: GK(5,34) RB(22,10) CB(20,25) CB(20,43) LB(22,58) CDM(36,34) RM(50,10) CM(48,24) CM(48,44) LM(50,58) ST(72,34)
5-3-2:   GK(5,34) RWB(28,8) CB(20,20) CB(20,34) CB(20,48) LWB(28,60) CM(40,20) CM(40,34) CM(40,48) ST(65,26) ST(65,42)

══════════════════════════════════════════════════════
HOW TO THINK LIKE A COACH (MANDATORY REASONING PROCESS)
══════════════════════════════════════════════════════
Before generating JSON, mentally answer these questions:

1. PHASE: Which phase of play does this drill train?
   - "attacking"          → creating chances, finishing, combination play
   - "defending"          → shape, pressure, duels, transitions to defend
   - "transition_attack"  → winning ball and breaking fast
   - "transition_defend"  → losing ball and recovering shape
   - "possession"         → keeping the ball under pressure, rondos, passing patterns
   - "set_piece"          → corners, free kicks, throw-ins
   - "fitness"            → conditioning with a ball

2. OBJECTIVE: One specific coachable outcome. Not "improve passing" but
   "Third-man combination to break the first line of press and play into a striker's feet."

3. COACHING POINTS (2–5): The non-obvious cues a coach must repeat:
   - Body orientation before receiving
   - Pressing trigger (e.g., "heavy touch → press NOW")
   - Support angles (e.g., "arrive at 45°, not square")
   - Decision criteria ("2v1 → isolate wide, 3v2 → switch")
   - Timing of runs ("overlap fires AFTER the pass, not before")

4. STEPS — how many are needed? Use as many as the drill requires:
   - 1 step  = static reference position / shape
   - 2–3     = simple passing pattern or basic movement
   - 4–6     = full drill with phases (activation → execution → press)
   - 7–10    = complex game scenario with multiple transitions
   - 11+     = rarely needed; only for elaborate set pieces or match simulations
   Each step shows ONE moment in time. Players move between steps.
   Show ARROWS only for intended runs/passes in THAT step, not for past moves.
   Each step has an "instruction" — a short coaching command ("Play!","Press now!","Switch!").

5. PLAYER NUMBERS: consistent across all steps (same number = same player always).

6. SPATIAL LOGIC:
   - Use the full width of the pitch — avoid clustering all players in the center.
   - Defenders must be in realistic defensive positions relative to attackers.
   - Ball position must make sense for the step (e.g., can't be in the net if no shot was taken).
   - Attacking runs should go toward the goal (higher x for home, lower x for away).

══════════════════════════════════════════════════════
ARROW COLORS (use intentionally)
══════════════════════════════════════════════════════
"#facc15" yellow  → ball movement / pass
"#38bdf8" sky     → player run / overlap
"#f87171" red     → pressing run / defensive action
"#a3e635" lime    → decoy run / dummy
"#ffffff" white   → general movement / shape shift

══════════════════════════════════════════════════════
OUTPUT RULES
══════════════════════════════════════════════════════
- Return ONLY valid JSON — no markdown, no explanation, no code blocks.
- All x values: 0–105. All y values: 0–68. Never exceed these bounds.
- "phase" must be one of the 7 values above.
- "coachingPoints" must be an array of 2–5 strings.
- "instruction" per step: short, imperative coaching command (≤ 12 words).
- Player numbers stay consistent across ALL steps.
- Steps must show realistic temporal progression (what happens NEXT each time).

JSON FORMAT (exact schema — do not add or remove keys):
{
  "name": "Drill Name",
  "description": "One sentence describing the drill",
  "phase": "possession",
  "objective": "One precise tactical/technical objective sentence",
  "coachingPoints": [
    "First key coaching cue",
    "Second key coaching cue",
    "Third key coaching cue"
  ],
  "steps": [
    {
      "name": "Step name",
      "instruction": "Short coaching command",
      "homePlayers": [{"number": 1, "x": 5, "y": 34}],
      "awayPlayers": [{"number": 1, "x": 100, "y": 34}],
      "ball": {"x": 52.5, "y": 34},
      "arrows": [{"fromX": 30, "fromY": 20, "toX": 60, "toY": 15, "color": "#facc15"}]
    }
  ]
}`

// ─── JSON parser + validator ───────────────────────────────────────────────────

function parseResult(raw: string): AIDrillResult {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim()
  const start = cleaned.indexOf("{")
  const end   = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("No JSON found in AI response")

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as AIDrillResult
  if (!parsed.name || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Invalid drill structure from AI")
  }

  // Defaults for new fields in case older models omit them
  parsed.phase         = parsed.phase ?? "possession"
  parsed.objective     = parsed.objective ?? parsed.description ?? ""
  parsed.coachingPoints = Array.isArray(parsed.coachingPoints) ? parsed.coachingPoints : []

  parsed.steps = parsed.steps.map(s => ({
    ...s,
    instruction: s.instruction ?? "",
    homePlayers: (s.homePlayers ?? []).map(p => ({ ...p, x: Math.max(0, Math.min(105, p.x)), y: Math.max(0, Math.min(68, p.y)) })),
    awayPlayers: (s.awayPlayers ?? []).map(p => ({ ...p, x: Math.max(0, Math.min(105, p.x)), y: Math.max(0, Math.min(68, p.y)) })),
    ball: { x: Math.max(0, Math.min(105, s.ball?.x ?? 52.5)), y: Math.max(0, Math.min(68, s.ball?.y ?? 34)) },
    arrows: (s.arrows ?? []).map(a => ({
      fromX: Math.max(0, Math.min(105, a.fromX)), fromY: Math.max(0, Math.min(68, a.fromY)),
      toX:   Math.max(0, Math.min(105, a.toX)),   toY:   Math.max(0, Math.min(68, a.toY)),
      color: a.color ?? "#facc15",
    })),
  }))

  return parsed
}

// ─── Claude call ───────────────────────────────────────────────────────────────

async function callClaude(userRequest: string, apiKey: string, onChunk: (s: string) => void): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  onChunk("Connecting to Claude...")
  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: SYSTEM,
    messages: [{ role: "user", content: `Coach request: "${userRequest}"\n\nJSON:` }],
  })
  const block = msg.content[0]
  return block.type === "text" ? block.text : ""
}

// ─── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(userRequest: string, apiKey: string, onChunk: (s: string) => void): Promise<string> {
  onChunk("Connecting to Gemini...")
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const prompt = `${SYSTEM}\n\nCoach request: "${userRequest}"\n\nJSON:`
  const result = await model.generateContent(prompt)
  return result.response.text()
}

// ─── Pollinations fallback (no key needed) ────────────────────────────────────

async function callPollinations(userRequest: string, onChunk: (s: string) => void): Promise<string> {
  const prompt = (
    `You are a football tactical coach AI. Return ONLY valid JSON with this exact schema: ` +
    `{"name":"...","description":"...","phase":"possession","objective":"...","coachingPoints":["cue1","cue2"],"steps":[{"name":"...","instruction":"coaching command","homePlayers":[{"number":1,"x":5,"y":34}],"awayPlayers":[{"number":1,"x":100,"y":34}],"ball":{"x":52.5,"y":34},"arrows":[{"fromX":0,"fromY":0,"toX":10,"toY":10,"color":"#facc15"}]}]}. ` +
    `Pitch 105x68. Home(blue) left GK x=5. Away(red) right GK x=100. Use as many steps as needed for the drill. ` +
    `Coach request: "${userRequest}". JSON only:`
  )
  const encoded = encodeURIComponent(prompt)
  const seed = Math.floor(Math.random() * 99999)
  const endpoints = [
    `/api/pollinations/${encoded}?seed=${seed}`,
    `https://text.pollinations.ai/${encoded}?seed=${seed}`,
  ]
  for (const url of endpoints) {
    try {
      onChunk("Generating drill...")
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) continue
      const text = await res.text()
      if (text && text.length > 10) return text
    } catch { /* try next */ }
  }
  throw new Error("Could not reach any AI service. Check your internet connection.")
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function generateDrill(
  userRequest: string,
  onChunk?: (partial: string) => void
): Promise<AIDrillResult> {
  const cb = onChunk ?? (() => {})
  cb("Connecting to AI...")

  const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const geminiKey    = import.meta.env.VITE_GEMINI_API_KEY

  const hasAnthropic = anthropicKey && anthropicKey !== "your_anthropic_api_key_here"
  const hasGemini    = geminiKey && geminiKey !== "your_gemini_api_key_here"

  const wanted = parseStepCount(userRequest)
  const req = wanted
    ? `${userRequest}\n\nIMPORTANT: the "steps" array MUST contain EXACTLY ${wanted} steps - no more, no fewer. Each step is the next moment in the drill.`
    : userRequest
  const finish = (d: AIDrillResult): AIDrillResult => {
    if (wanted && d.steps.length !== wanted) d.steps = fitSteps(d.steps, wanted)
    return d
  }

  const attempts: Array<() => Promise<string>> = []
  if (hasAnthropic) attempts.push(() => callClaude(req, anthropicKey, cb))
  if (hasGemini)    attempts.push(() => callGemini(req, geminiKey, cb))
  attempts.push(() => callPollinations(req, cb))

  for (const run of attempts) {
    try {
      const drill = parseResult(await run())
      drill.source = "ai"
      return finish(drill)
    } catch (e) {
      console.warn("[AI drill] provider failed:", e)
    }
  }

  // Everything failed (no key / offline / bad JSON) → build a drill locally so it always works.
  cb("Building drill offline...")
  const local = generateLocalDrill(userRequest)
  local.source = "local"
  return finish(local)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tactical analysis of the current board (AI first, offline heuristics as fallback)
// ═══════════════════════════════════════════════════════════════════════════════

import type { AIAnalysisResult } from "@/types"

export interface BoardSnapshot {
  stepName: string
  formation: string
  home: AIPlayer[]
  away: AIPlayer[]
  ball: { x: number; y: number }
  language: string
}

export type TacticalAnalysis = AIAnalysisResult & { source: "ai" | "local" }

const LANG_NAMES: Record<string, string> = {
  en: "English", he: "Hebrew", es: "Spanish", pt: "Portuguese",
  de: "German", it: "Italian", ru: "Russian", ar: "Arabic",
}

const ANALYSIS_SYSTEM = `You are a UEFA Pro Licence football tactical analyst inside the VisuBall tactical board.
You receive a snapshot of the board. Pitch is 105 (x, goal to goal) by 68 (y, touchline to touchline).
HOME (blue) defends the goal at x=0 and attacks toward x=105. AWAY (red) is the opponent.
Find real structural problems for HOME: gaps between lines, unprotected half-spaces/wings, players isolated from the ball,
a defensive line that is too high or too deep, overloads by the opponent. Be concrete — mention zones, lines or player numbers.
Return ONLY valid JSON, no markdown:
{"score": <integer 0-100>, "exposedAreas": ["short phrase", ...up to 4], "recommendations": ["actionable coaching instruction", ...up to 4], "summary": "2 sentences"}`

function buildAnalysisPrompt(s: BoardSnapshot) {
  const fmt = (ps: AIPlayer[]) => ps.map((p) => `#${p.number}(${Math.round(p.x)},${Math.round(p.y)})`).join(" ")
  return (
    `Step: "${s.stepName}". Formation: ${s.formation}.\n` +
    `HOME: ${fmt(s.home) || "none"}\nAWAY: ${fmt(s.away) || "none"}\n` +
    `BALL: (${Math.round(s.ball.x)},${Math.round(s.ball.y)})\n` +
    `Write every text field in ${LANG_NAMES[s.language] ?? "English"}. JSON only:`
  )
}

function parseAnalysis(raw: string): AIAnalysisResult {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
  const a = cleaned.indexOf("{")
  const b = cleaned.lastIndexOf("}")
  if (a === -1 || b === -1) throw new Error("No JSON in analysis response")
  const j = JSON.parse(cleaned.slice(a, b + 1))
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 6) : [])
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(j.score) || 0))),
    exposedAreas: arr(j.exposedAreas),
    recommendations: arr(j.recommendations),
    summary: String(j.summary ?? ""),
  }
}

async function analysisViaProviders(s: BoardSnapshot): Promise<string> {
  const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY
  const user = buildAnalysisPrompt(s)

  if (anthropicKey && anthropicKey !== "your_anthropic_api_key_here") {
    const client = new Anthropic({ apiKey: anthropicKey, dangerouslyAllowBrowser: true })
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5", max_tokens: 1024, system: ANALYSIS_SYSTEM,
      messages: [{ role: "user", content: user }],
    })
    const block = msg.content[0]
    return block.type === "text" ? block.text : ""
  }
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const r = await model.generateContent(`${ANALYSIS_SYSTEM}\n\n${user}`)
    return r.response.text()
  }
  throw new Error("no-key")
}

// ── offline heuristics ────────────────────────────────────────────────────────
const LOCAL_TEXT: Record<string, Record<string, string>> = {
  en: {
    gap: "Gap of ~{n}m between defence and midfield lines",
    between: "{n} opponent(s) free between the lines",
    left: "Left wing unprotected", right: "Right wing unprotected",
    support: "No teammate within 8m of the ball",
    high: "Very high defensive line — space behind",
    narrow: "Team too narrow — wide areas open",
    stretched: "Team stretched over {n}m — poor compactness",
    rGap: "Compress the lines: midfield steps back / defence steps up to ≤ 20m apart",
    rBetween: "Screen the central channel with a holding midfielder",
    rWing: "Slide a full-back / winger to cover the weak side",
    rSupport: "Bring the nearest midfielder to give a passing option",
    rHigh: "Drop the line or add pressure on the ball so the high line is safe",
    rNarrow: "Stretch the team: wingers wider to ~10m from the touchline",
    rStretched: "Shorten the pitch: compact vertical distances between units",
    ok: "Solid structure. ", summary: "Offline analysis of line distances, width and coverage around the ball.",
  },
  he: {
    gap: "פער של כ-{n} מ' בין קו ההגנה לקו הקישור",
    between: "{n} שחקני יריב חופשיים בין הקווים",
    left: "האגף השמאלי לא מכוסה", right: "האגף הימני לא מכוסה",
    support: "אין שחקן קבוצה במרחק 8 מ' מהכדור",
    high: "קו הגנה גבוה מאוד — חשיפה של המרחב מאחור",
    narrow: "הקבוצה צרה מדי — אגפים פתוחים",
    stretched: "הקבוצה מתוחה על פני {n} מ' — קומפקטיות נמוכה",
    rGap: "לצמצם קווים: הקישור יורד / ההגנה עולה עד מרחק של 20 מ' לכל היותר",
    rBetween: "לסגור את הערוץ המרכזי עם קשר מגן",
    rWing: "להזיז בק / כנף כדי לכסות את הצד החלש",
    rSupport: "להביא את הקשר הקרוב ביותר כאפשרות מסירה",
    rHigh: "להוריד את הקו או ללחוץ על הכדור כדי שהקו הגבוה יהיה בטוח",
    rNarrow: "לרוחב את הקבוצה: כנפיים עד כ-10 מ' מקו הצד",
    rStretched: "לקצר את המגרש: למצוא מרחקים אנכיים קומפקטיים בין היחידות",
    ok: "מבנה יציב. ", summary: "ניתוח מקומי של מרחקי קווים, רוחב וכיסוי סביב הכדור.",
  },
}

function localAnalysis(s: BoardSnapshot): AIAnalysisResult {
  const L = LOCAL_TEXT[s.language] ?? LOCAL_TEXT.en
  const f = (k: string, n?: number) => (L[k] ?? LOCAL_TEXT.en[k]).replace("{n}", String(n ?? ""))
  const out = s.home.filter((p) => p.number !== 1).sort((a, b) => a.x - b.x)
  const exposed: string[] = []
  const recs: string[] = []
  let score = 100

  if (out.length >= 6) {
    const k = Math.max(3, Math.round(out.length * 0.4))
    const defLine = avg(out.slice(0, k).map((p) => p.x))
    const midLine = avg(out.slice(k, k + Math.max(3, k)).map((p) => p.x))
    const gap = midLine - defLine
    if (gap > 22) { exposed.push(f("gap", gap)); recs.push(f("rGap")); score -= 14 }

    const free = s.away.filter((p) => p.x > defLine + 2 && p.x < midLine && p.y > 18 && p.y < 50).length
    if (free > 0) { exposed.push(f("between", free)); recs.push(f("rBetween")); score -= 8 + free * 4 }

    if (defLine > 48) { exposed.push(f("high")); recs.push(f("rHigh")); score -= 10 }
    const depth = out[out.length - 1].x - out[0].x
    if (depth > 52) { exposed.push(f("stretched", depth)); recs.push(f("rStretched")); score -= 10 }
  }

  if (out.length >= 4) {
    if (!out.some((p) => p.y < 15)) { exposed.push(f("left")); recs.push(f("rWing")); score -= 8 }
    if (!out.some((p) => p.y > 53)) { exposed.push(f("right")); recs.push(f("rWing")); score -= 8 }
    const width = Math.max(...out.map((p) => p.y)) - Math.min(...out.map((p) => p.y))
    if (width < 34) { exposed.push(f("narrow")); recs.push(f("rNarrow")); score -= 8 }
  }

  if (s.home.length > 1) {
    const near = Math.min(...s.home.map((p) => Math.hypot(p.x - s.ball.x, p.y - s.ball.y)))
    if (near > 8) { exposed.push(f("support")); recs.push(f("rSupport")); score -= 8 }
  }

  score = Math.max(20, Math.min(100, score))
  return {
    score,
    exposedAreas: exposed.slice(0, 4),
    recommendations: [...new Set(recs)].slice(0, 4),
    summary: (exposed.length === 0 ? f("ok") : "") + f("summary"),
  }
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

export async function analyzeTactics(s: BoardSnapshot): Promise<TacticalAnalysis> {
  try {
    const raw = await analysisViaProviders(s)
    return { ...parseAnalysis(raw), source: "ai" }
  } catch {
    return { ...localAnalysis(s), source: "local" }
  }
}
