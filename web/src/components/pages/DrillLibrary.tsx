import { useMemo, useState } from "react"
import { BookOpen, Box, CalendarPlus, X } from "lucide-react"
import { useCoachStore, useExerciseStore } from "@/store"
import { getCurrentDate } from "@/utils"
import { LIBRARY, buildExercise, type LibDrill } from "@/constants/drillTemplates"
import type { Exercise } from "@/types"

const AGES = ["all", "U8", "U10", "U13", "U17", "ADULT"] as const
const CATS = ["all", "TACTICS", "TECHNIQUE", "POSSESSION", "FITNESS", "SET_PIECES"] as const

const TXT: Record<string, Record<string, string>> = {
  en: { title: "Drill Library", sub: "Professional drills — load into the 3D board or schedule on your calendar", all: "All", load: "Load to board", schedule: "Add to calendar", pick: "Pick a date", add: "Add", cancel: "Cancel", added: "Added to calendar", steps: "steps", TACTICS: "Tactics", TECHNIQUE: "Technique", POSSESSION: "Possession", FITNESS: "Fitness", SET_PIECES: "Set pieces", ADULT: "Adult/Pro" },
  he: { title: "ספריית תרגילים", sub: "תרגילים מקצועיים — טען ללוח התלת-ממדי או שבץ ביומן", all: "הכל", load: "טען ללוח", schedule: "הוסף ליומן", pick: "בחר תאריך", add: "הוסף", cancel: "ביטול", added: "נוסף ליומן", steps: "שלבים", TACTICS: "טקטיקה", TECHNIQUE: "טכניקה", POSSESSION: "החזקה", FITNESS: "כושר", SET_PIECES: "מצבים נייחים", ADULT: "בוגרים/מקצוענים" },
}

export default function DrillLibrary({ onLoadToBoard }: { onLoadToBoard?: () => void }) {
  const { profile } = useCoachStore()
  const { setCurrentExercise, addExercise } = useExerciseStore()
  const lang = profile.language
  const T = (k: string) => TXT[lang]?.[k] ?? TXT.en[k] ?? k
  const rtl = lang === "he" || lang === "ar"
  const [age, setAge] = useState<(typeof AGES)[number]>("all")
  const [cat, setCat] = useState<(typeof CATS)[number]>("all")
  const [pending, setPending] = useState<LibDrill | null>(null)
  const [date, setDate] = useState(getCurrentDate())
  const [msg, setMsg] = useState<string | null>(null)

  const list = useMemo(
    () => LIBRARY.filter((d) => (age === "all" || d.ageGroup === age) && (cat === "all" || d.category === cat)),
    [age, cat]
  )

  const load = (d: LibDrill) => {
    setCurrentExercise(buildExercise(d, lang, getCurrentDate()))
    onLoadToBoard?.()
  }
  const schedule = () => {
    if (!pending) return
    const ex: Exercise = buildExercise(pending, lang, date)
    addExercise(ex)
    setPending(null)
    setMsg(T("added"))
    window.setTimeout(() => setMsg(null), 2200)
  }

  const chip = (on: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${on ? "bg-cyan-400/15 border-cyan-400/60 text-cyan-300" : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"}`

  return (
    <div className="p-6 lg:p-8" dir={rtl ? "rtl" : "ltr"}>
      <h1 className="text-3xl font-bold text-white mb-1">{T("title")}</h1>
      <p className="text-slate-400 mb-6">{T("sub")}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {AGES.map((a) => <button key={a} className={chip(age === a)} onClick={() => setAge(a)}>{a === "all" ? T("all") : a === "ADULT" ? T("ADULT") : a}</button>)}
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {CATS.map((x) => <button key={x} className={chip(cat === x)} onClick={() => setCat(x)}>{x === "all" ? T("all") : T(x)}</button>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((d) => (
          <div key={d.id} className="rounded-2xl p-5 border border-slate-700/70 bg-slate-900/50 backdrop-blur hover:border-cyan-400/50 hover:-translate-y-0.5 transition-all">
            <div className="flex items-start gap-3 mb-3">
              <BookOpen size={22} className="text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white">{d.name[lang] ?? d.name.en}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{d.desc[lang] ?? d.desc.en}</p>
              </div>
            </div>
            <div className="flex gap-2 mb-4 text-xs">
              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">{T(d.category)}</span>
              <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">{d.ageGroup === "ADULT" ? T("ADULT") : d.ageGroup}</span>
              <span className="bg-slate-500/20 text-slate-300 px-2 py-1 rounded">{d.frames.length} {T("steps")}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => load(d)} className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-slate-950 bg-gradient-to-r from-cyan-400 to-violet-400 hover:brightness-110 transition">
                <Box size={15} />{T("load")}
              </button>
              <button onClick={() => setPending(d)} title={T("schedule")} aria-label={T("schedule")} className="px-3 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 transition">
                <CalendarPlus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm" onClick={() => setPending(null)}>
          <div className="w-[340px] rounded-2xl border border-slate-700 bg-slate-900/95 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">{T("pick")}</h3>
              <button onClick={() => setPending(null)} aria-label={T("cancel")}><X size={18} className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-300 mb-3">{pending.name[lang] ?? pending.name.en}</p>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full mb-4 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            <div className="flex gap-2">
              <button onClick={schedule} className="flex-1 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold">{T("add")}</button>
              <button onClick={() => setPending(null)} className="px-4 rounded-lg border border-slate-600 text-slate-300">{T("cancel")}</button>
            </div>
          </div>
        </div>
      )}
      {msg && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-emerald-500 text-slate-950 text-sm font-semibold z-50">{msg}</div>}
    </div>
  )
}
