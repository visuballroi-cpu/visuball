import { useState, useRef, useEffect } from "react"
import { X, Send, Sparkles, CheckCircle, AlertCircle, Loader, Target, BookOpen, Zap } from "lucide-react"
import { generateDrill, AIDrillResult } from "@/services/aiCoach"
import { useCoachStore } from "@/store"

interface Message {
  id: string
  role: "user" | "ai" | "error"
  text: string
  result?: AIDrillResult
}

interface AICoachPanelProps {
  onApply: (drill: AIDrillResult) => void
  onClose: () => void
}

const SUGGESTIONS = [
  "4v2 rondo in midfield",
  "High press with 4-4-2 — pressing trigger on back pass",
  "Build-up from GK, switch of play into winger 1v1",
  "3v2 counterattack from halfway line",
  "Corner kick — near post flick-on",
  "5v3 possession in final third with overload",
  "Defensive transition — recover shape after losing ball",
  "Overlapping full-back combination in wide areas",
]

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  attacking:          { label: "Attacking",          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  defending:          { label: "Defending",           color: "bg-red-500/20 text-red-300 border-red-500/30" },
  transition_attack:  { label: "Transition → Attack", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  transition_defend:  { label: "Transition → Defend", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  possession:         { label: "Possession",          color: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  set_piece:          { label: "Set Piece",           color: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  fitness:            { label: "Fitness",             color: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
}

function DrillCard({ drill, isLight, onApply }: { drill: AIDrillResult; isLight: boolean; onApply: () => void }) {
  const phase = PHASE_LABELS[drill.phase] ?? { label: drill.phase, color: "bg-slate-500/20 text-slate-300 border-slate-500/30" }

  const cardBg    = isLight ? "bg-white border border-slate-200 shadow-sm" : "bg-slate-800/60 border border-slate-700/50"
  const labelText = isLight ? "text-slate-500" : "text-slate-400"
  const bodyText  = isLight ? "text-slate-700" : "text-slate-200"
  const stepBg    = isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/50 border-slate-700/40"
  const instrText = isLight ? "text-indigo-600" : "text-violet-300"

  return (
    <div className={`rounded-2xl overflow-hidden mt-2 ${cardBg}`}>
      {/* Drill header */}
      <div className="px-3.5 pt-3 pb-2 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-bold text-sm leading-tight ${bodyText}`}>{drill.name}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${phase.color}`}>
            {phase.label}
          </span>
        </div>
        <p className={`text-xs leading-relaxed ${labelText}`}>{drill.description}</p>
      </div>

      {/* Objective */}
      {drill.objective && (
        <div className={`mx-3 mb-2 px-3 py-2 rounded-xl flex gap-2 items-start ${
          isLight ? "bg-indigo-50 border border-indigo-100" : "bg-violet-900/20 border border-violet-700/30"
        }`}>
          <Target size={12} className={`flex-shrink-0 mt-0.5 ${isLight ? "text-indigo-500" : "text-violet-400"}`} />
          <p className={`text-xs leading-relaxed ${isLight ? "text-indigo-700" : "text-violet-200"}`}>
            <span className="font-semibold">Objective: </span>{drill.objective}
          </p>
        </div>
      )}

      {/* Coaching points */}
      {drill.coachingPoints.length > 0 && (
        <div className="mx-3 mb-2">
          <div className={`flex items-center gap-1.5 mb-1.5`}>
            <BookOpen size={11} className={labelText} />
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${labelText}`}>Coaching Points</p>
          </div>
          <ul className="space-y-1">
            {drill.coachingPoints.map((pt, i) => (
              <li key={i} className={`flex items-start gap-2 text-xs ${bodyText}`}>
                <span className={`font-bold flex-shrink-0 ${isLight ? "text-indigo-500" : "text-violet-400"}`}>{i + 1}.</span>
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      <div className="mx-3 mb-2">
        <div className={`flex items-center gap-1.5 mb-1.5`}>
          <Zap size={11} className={labelText} />
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${labelText}`}>
            {drill.steps.length} Step{drill.steps.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="space-y-1.5">
          {drill.steps.map((s, i) => (
            <div key={i} className={`rounded-lg border px-2.5 py-1.5 ${stepBg}`}>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                  isLight ? "bg-slate-200 text-slate-600" : "bg-slate-700 text-slate-300"
                }`}>{i + 1}</span>
                <span className={`text-xs font-semibold ${bodyText}`}>{s.name}</span>
              </div>
              {s.instruction && (
                <p className={`text-[11px] mt-1 ml-6 italic ${instrText}`}>"{s.instruction}"</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Apply button */}
      <div className="px-3 pb-3">
        <button
          onClick={onApply}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl
            bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500
            text-white text-xs font-bold transition-all active:scale-95 shadow-lg shadow-violet-500/30"
        >
          <CheckCircle size={13} />
          Apply to Board
        </button>
      </div>
    </div>
  )
}

export default function AICoachPanel({ onApply, onClose }: AICoachPanelProps) {
  const { profile } = useCoachStore()
  const isLight = profile.theme === "light"

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: "שלום מאמן! תאר לי את האימון שאתה רוצה — פרסינג, בניית משחק, מעבר התקפי, תרגיל פינות — ואני אבנה אותו על הלוח עם יעדים ונקודות הוראה.\n\nFor example: \"High press with 4-4-2\" or \"Build-up from GK with switch of play\"",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamText, setStreamText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, streamText])

  async function handleSend(text?: string) {
    const request = (text ?? input).trim()
    if (!request || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: request }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)
    setStreamText("")

    try {
      const drill = await generateDrill(request, partial => {
        const match = partial.match(/"name"\s*:\s*"([^"]*)"/)
        if (match) setStreamText(`Building "${match[1]}"...`)
        else setStreamText("Thinking like a coach...")
      })

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "",
        result: drill,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err: any) {
      const errText = err?.message?.length > 10
        ? err.message
        : "Could not connect to AI. Check your internet connection and try again."
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "error", text: errText }])
    } finally {
      setIsLoading(false)
      setStreamText("")
    }
  }

  const panelBg = isLight
    ? "bg-white border-l border-slate-200 shadow-2xl"
    : "bg-slate-900 border-l border-violet-500/20 shadow-2xl shadow-violet-900/20"

  const headerBg = isLight
    ? "bg-gradient-to-r from-indigo-600 to-violet-600"
    : "bg-gradient-to-r from-violet-700 to-fuchsia-700"

  const inputBg = isLight
    ? "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
    : "bg-slate-800 border-slate-700 text-white placeholder-slate-500"

  return (
    <div className={`flex flex-col h-full w-full ${panelBg}`}>

      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${headerBg}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">AI Coach</p>
            <p className="text-white/60 text-xs">UEFA Pro Licence — Powered by Claude</p>
          </div>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all">
          <X size={14} className="text-white" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                <Sparkles size={11} className="text-white" />
              </div>
            )}
            <div className={`max-w-[90%] ${msg.role === "user" ? "w-auto" : "w-full"}`}>
              {msg.role === "user" && (
                <div className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
                  {msg.text}
                </div>
              )}
              {msg.role === "error" && (
                <div className={`rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed ${
                  isLight ? "bg-red-50 border border-red-200 text-red-700" : "bg-red-900/30 border border-red-700/40 text-red-300"
                }`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    <span className="font-semibold text-xs uppercase tracking-wide">Error</span>
                  </div>
                  <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                </div>
              )}
              {msg.role === "ai" && !msg.result && msg.text && (
                <div className={`rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed ${
                  isLight ? "bg-slate-100 text-slate-800" : "bg-slate-800 text-slate-200"
                }`}>
                  <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                </div>
              )}
              {msg.role === "ai" && msg.result && (
                <div>
                  {msg.text && (
                    <div className={`rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed mb-1 ${
                      isLight ? "bg-slate-100 text-slate-800" : "bg-slate-800 text-slate-200"
                    }`}>
                      <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                    </div>
                  )}
                  <DrillCard
                    drill={msg.result}
                    isLight={isLight}
                    onApply={() => { onApply(msg.result!); onClose() }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
              <Sparkles size={11} className="text-white" />
            </div>
            <div className={`max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 ${
              isLight ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-400"
            }`}>
              <div className="flex items-center gap-2 text-xs">
                <Loader size={12} className="animate-spin" />
                <span>{streamText || "Thinking like a coach..."}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className={`text-xs font-semibold mb-2 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
            Try these:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => handleSend(s)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                  isLight
                    ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                    : "bg-violet-900/20 border-violet-700/30 text-violet-300 hover:bg-violet-900/40"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`p-4 border-t ${isLight ? "border-slate-200" : "border-slate-800"}`}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Describe a drill, phase of play, or formation..."
            className={`flex-1 text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all ${inputBg}`}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600
              hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center text-white transition-all active:scale-95 flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
