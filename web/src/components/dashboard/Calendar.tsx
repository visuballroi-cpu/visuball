import { useState } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid } from "lucide-react"
import { getMonthName } from "@/utils"

interface CalendarProps {
  currentMonth: Date
  onMonthChange: (date: Date) => void
  monthExercises: Record<string, { sessions: number; drills: number }>
  selectedDate: string | null
  onDateSelect: (date: string) => void
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function todayStr() {
  return formatDate(new Date())
}

function getWeekStart(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

export default function Calendar({
  currentMonth,
  onMonthChange,
  monthExercises,
  selectedDate,
  onDateSelect,
}: CalendarProps) {
  const [view, setView] = useState<"month" | "week">("month")

  // ── month helpers ────────────────────────────────────────────────────────────

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd   = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const gridStart  = new Date(monthStart)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())

  const monthDays: Date[] = []
  const cur = new Date(gridStart)
  while (cur <= monthEnd || monthDays.length % 7 !== 0) {
    monthDays.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
    if (monthDays.length > 42) break
  }

  // ── week helpers ─────────────────────────────────────────────────────────────

  const weekStart = getWeekStart(currentMonth)
  const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  // ── navigation ───────────────────────────────────────────────────────────────

  const goPrev = () => {
    const d = new Date(currentMonth)
    if (view === "month") d.setMonth(d.getMonth() - 1)
    else d.setDate(d.getDate() - 7)
    onMonthChange(d)
  }

  const goNext = () => {
    const d = new Date(currentMonth)
    if (view === "month") d.setMonth(d.getMonth() + 1)
    else d.setDate(d.getDate() + 7)
    onMonthChange(d)
  }

  const goToday = () => onMonthChange(new Date())

  // ── header label ─────────────────────────────────────────────────────────────

  const headerLabel = view === "month"
    ? `${getMonthName(currentMonth.getMonth())} ${currentMonth.getFullYear()}`
    : (() => {
        const ws = weekDays[0], we = weekDays[6]
        if (ws.getMonth() === we.getMonth())
          return `${getMonthName(ws.getMonth())} ${ws.getDate()} – ${we.getDate()}, ${ws.getFullYear()}`
        return `${getMonthName(ws.getMonth())} ${ws.getDate()} – ${getMonthName(we.getMonth())} ${we.getDate()}, ${we.getFullYear()}`
      })()

  // ── shared day cell renderer ─────────────────────────────────────────────────

  function DayCell({ day, dimmed = false }: { day: Date; dimmed?: boolean }) {
    const ds = formatDate(day)
    const data = monthExercises[ds]
    const isSelected = ds === selectedDate
    const isToday    = ds === todayStr()
    const hasData    = data && (data.sessions > 0 || data.drills > 0)

    return (
      <button
        onClick={() => onDateSelect(ds)}
        className={`relative rounded-xl transition-all text-left overflow-hidden group
          ${dimmed ? "opacity-25 pointer-events-none" : ""}
          ${isSelected
            ? "bg-indigo-600/40 border-2 border-indigo-400/70 shadow-lg shadow-indigo-900/40"
            : isToday
              ? "bg-amber-500/10 border-2 border-amber-400/60"
              : hasData
                ? "bg-slate-800/60 border border-slate-600/50 hover:border-indigo-500/50 hover:bg-slate-800"
                : "bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40"
          }`}
        style={{ minHeight: 72 }}
      >
        {/* date number */}
        <div className={`absolute top-2.5 left-3 text-sm font-bold leading-none
          ${isSelected ? "text-indigo-200" : isToday ? "text-amber-300" : "text-slate-300"}`}>
          {day.getDate()}
        </div>

        {/* today ring */}
        {isToday && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
        )}

        {/* pills */}
        {hasData && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
            {data.sessions > 0 && (
              <span className="text-[10px] font-bold bg-blue-600/60 text-blue-200 px-1.5 py-0.5 rounded-md leading-none">
                {data.sessions}S
              </span>
            )}
            {data.drills > 0 && (
              <span className="text-[10px] font-bold bg-orange-600/60 text-orange-200 px-1.5 py-0.5 rounded-md leading-none">
                {data.drills}D
              </span>
            )}
          </div>
        )}
      </button>
    )
  }

  // ── week view day column ─────────────────────────────────────────────────────

  function WeekDayCol({ day }: { day: Date }) {
    const ds = formatDate(day)
    const data = monthExercises[ds]
    const isSelected = ds === selectedDate
    const isToday    = ds === todayStr()
    const items = [
      ...(data?.sessions ? Array(data.sessions).fill("session") : []),
      ...(data?.drills   ? Array(data.drills).fill("drill")     : []),
    ]

    return (
      <button
        onClick={() => onDateSelect(ds)}
        className={`flex flex-col rounded-2xl border transition-all text-left overflow-hidden
          ${isSelected
            ? "bg-indigo-600/30 border-indigo-400/60 shadow-lg shadow-indigo-900/30"
            : isToday
              ? "bg-amber-500/10 border-amber-400/50"
              : "bg-slate-900/50 border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40"
          }`}
        style={{ minHeight: 160 }}
      >
        {/* day header */}
        <div className={`px-3 pt-3 pb-2 border-b ${isSelected ? "border-indigo-500/30" : isToday ? "border-amber-400/20" : "border-slate-800/60"}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider
            ${isToday ? "text-amber-400" : isSelected ? "text-indigo-300" : "text-slate-500"}`}>
            {DAY_NAMES[day.getDay()]}
          </p>
          <p className={`text-2xl font-extrabold leading-tight
            ${isToday ? "text-amber-300" : isSelected ? "text-white" : "text-slate-200"}`}>
            {day.getDate()}
          </p>
          {isToday && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />}
        </div>

        {/* events */}
        <div className="flex-1 px-2.5 py-2 space-y-1.5">
          {items.length === 0 ? (
            <p className="text-[11px] text-slate-700 mt-1">—</p>
          ) : (
            items.map((type, i) => (
              <div key={i} className={`text-[11px] font-semibold px-2 py-1 rounded-lg
                ${type === "session"
                  ? "bg-blue-600/25 text-blue-300"
                  : "bg-orange-600/25 text-orange-300"
                }`}>
                {type === "session" ? "📋 Session" : "⚽ Drill"}
              </div>
            ))
          )}
        </div>
      </button>
    )
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="glassmorphism rounded-xl p-5 border border-slate-700 space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={goPrev} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-lg font-bold text-white min-w-[200px] text-center">
            {headerLabel}
          </h2>
          <button onClick={goNext} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
            <ChevronRight size={16} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-semibold bg-slate-800 border border-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all">
            Today
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 gap-1">
          <button
            onClick={() => setView("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === "month"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid size={13} /> Monthly
          </button>
          <button
            onClick={() => setView("week")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === "week"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CalendarDays size={13} /> Weekly
          </button>
        </div>
      </div>

      {/* ── Monthly view ── */}
      {view === "month" && (
        <>
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day, i) => (
              <DayCell
                key={i}
                day={day}
                dimmed={day.getMonth() !== currentMonth.getMonth()}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Weekly view ── */}
      {view === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => (
            <WeekDayCol key={i} day={day} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 pt-3 border-t border-slate-800/60 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-600/60 inline-block"/> Sessions</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-600/60 inline-block"/> Drills</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block"/> Today</div>
      </div>
    </div>
  )
}
