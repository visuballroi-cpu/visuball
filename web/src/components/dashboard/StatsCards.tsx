import { useMemo } from "react"
import { Activity, Clock, Zap } from "lucide-react"
import { Exercise } from "@/types"
import { calculateTrainingHours } from "@/utils"

interface StatsCardsProps {
  exercises: Record<string, Exercise[]>
}

export default function StatsCards({ exercises }: StatsCardsProps) {
  const stats = useMemo(() => {
    let totalSessions = 0
    let totalDrills = 0
    let totalHours = 0

    Object.values(exercises).forEach((dayExercises) => {
      dayExercises.forEach((exercise) => {
        if (exercise.type === "SESSION") {
          totalSessions++
        } else {
          totalDrills++
        }
        totalHours += calculateTrainingHours(
          exercise.startTime,
          exercise.endTime
        )
      })
    })

    return { totalSessions, totalDrills, totalHours }
  }, [exercises])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Sessions Card */}
      <div className="stat-card bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 border-slate-700 group hover:border-neon-cyan/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">Training Sessions</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-neon-cyan bg-clip-text text-transparent mt-3">
              {stats.totalSessions}
            </p>
            <p className="text-xs text-slate-500 mt-2">Total completed</p>
          </div>
          <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all">
            <Activity className="text-blue-400 group-hover:text-neon-cyan transition-colors" size={24} />
          </div>
        </div>
      </div>

      {/* Training Hours Card */}
      <div className="stat-card bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 border-slate-700 group hover:border-neon-orange/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">Training Hours</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-neon-orange bg-clip-text text-transparent mt-3">
              {stats.totalHours}
              <span className="text-lg ml-1">h</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">Time invested</p>
          </div>
          <div className="p-3 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-all">
            <Clock className="text-orange-400 group-hover:text-neon-orange transition-colors" size={24} />
          </div>
        </div>
      </div>

      {/* Drills Created Card */}
      <div className="stat-card bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-900/40 border-slate-700 group hover:border-neon-purple/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">Drills Created</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-neon-purple bg-clip-text text-transparent mt-3">
              {stats.totalDrills}
            </p>
            <p className="text-xs text-slate-500 mt-2">Tactical exercises</p>
          </div>
          <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-all">
            <Zap className="text-purple-400 group-hover:text-neon-purple transition-colors" size={24} />
          </div>
        </div>
      </div>
    </div>
  )
}
