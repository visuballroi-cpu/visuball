import { X, Plus, Edit2, Trash2, Calendar } from "lucide-react"
import { useExerciseStore, useCoachStore } from "@/store"
import { t } from "@/utils"

interface DailyModalProps {
  date: string
  onClose: () => void
  onCreateDrill: (context: { date: string; type: "SESSION" | "DRILL" }) => void
}

export default function DailyModal({ date, onClose, onCreateDrill }: DailyModalProps) {
  const { profile } = useCoachStore()
  const { getExercisesByDate, deleteExercise } = useExerciseStore()
  const exercises = getExercisesByDate(date)

  const handleDelete = (exerciseId: string) => {
    if (confirm(t("confirmDelete", profile.language) || "Are you sure?")) {
      deleteExercise(exerciseId, date)
    }
  }

  const formatted = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  })

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,6,23,0.75)", backdropFilter: "blur(6px)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Dialog */}
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 0 60px rgba(99,102,241,0.15), 0 25px 60px rgba(0,0,0,0.6)" }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Calendar size={16} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Training Day</p>
              <h3 className="text-base font-bold text-white">{formatted}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Exercises list */}
        <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
          {exercises.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-3xl">✨</p>
              <p className="text-slate-500 text-sm">No exercises yet for this day</p>
            </div>
          ) : (
            exercises
              .sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"))
              .map(exercise => (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 rounded-xl px-4 py-3 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${exercise.type === "SESSION" ? "bg-blue-400" : "bg-orange-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{exercise.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {exercise.startTime && (
                          <span className="text-xs text-slate-500">{exercise.startTime}</span>
                        )}
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                          exercise.type === "SESSION"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-orange-500/20 text-orange-300"
                        }`}>
                          {exercise.type === "SESSION" ? "Session" : "Drill"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-colors">
                      <Edit2 size={13} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(exercise.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 pt-2 grid grid-cols-2 gap-3 border-t border-slate-800">
          <button
            onClick={() => onCreateDrill({ date, type: "SESSION" })}
            className="flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 hover:border-blue-500/60 rounded-xl text-sm font-semibold text-blue-300 transition-all active:scale-95"
          >
            <Plus size={15} />
            {t("createSession", profile.language) || "New Session"}
          </button>
          <button
            onClick={() => onCreateDrill({ date, type: "DRILL" })}
            className="flex items-center justify-center gap-2 py-2.5 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/30 hover:border-orange-500/60 rounded-xl text-sm font-semibold text-orange-300 transition-all active:scale-95"
          >
            <Plus size={15} />
            {t("createDrill", profile.language) || "New Drill"}
          </button>
        </div>
      </div>
    </div>
  )
}
