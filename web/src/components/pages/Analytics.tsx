import { useMemo } from "react"
import { useExerciseStore, useCoachStore } from "@/store"
import { t } from "@/utils"
import { BarChart3, PieChart } from "lucide-react"

export default function Analytics() {
  const { profile } = useCoachStore()
  const { getAllExercises } = useExerciseStore()

  const stats = useMemo(() => {
    const exercises = getAllExercises()
    const sessions = exercises.filter((e) => e.type === "SESSION").length
    const drills = exercises.filter((e) => e.type === "DRILL").length
    const total = sessions + drills

    const monthlyData: Record<string, number> = {}
    exercises.forEach((exercise) => {
      const [year, month] = exercise.date.split("-")
      const key = `${month}/${year}`
      monthlyData[key] = (monthlyData[key] || 0) + 1
    })

    return {
      totalExercises: total,
      sessions,
      drills,
      sessionsPercent: total > 0 ? Math.round((sessions / total) * 100) : 0,
      drillsPercent: total > 0 ? Math.round((drills / total) * 100) : 0,
      monthlyData,
    }
  }, [getAllExercises])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("analytics", profile.language)}
        </h1>
        <p className="text-slate-400">
          Track your coaching activity and performance metrics
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glassmorphism rounded-xl p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Total Exercises</p>
          <p className="text-4xl font-bold text-white">
            {stats.totalExercises}
          </p>
        </div>

        <div className="glassmorphism rounded-xl p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Training Sessions</p>
          <p className="text-4xl font-bold text-blue-400">{stats.sessions}</p>
          <p className="text-xs text-slate-500 mt-2">
            {stats.sessionsPercent}% of total
          </p>
        </div>

        <div className="glassmorphism rounded-xl p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Drills</p>
          <p className="text-4xl font-bold text-emerald-400">{stats.drills}</p>
          <p className="text-xs text-slate-500 mt-2">
            {stats.drillsPercent}% of total
          </p>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glassmorphism rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">
              {t("trainingDistribution", profile.language)}
            </h3>
          </div>

          <div className="flex items-center justify-center gap-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center relative">
              <div className="w-28 h-28 rounded-full bg-slate-950 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-white">
                  {stats.sessionsPercent}%
                </p>
                <p className="text-xs text-slate-400">Sessions</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-slate-400">Sessions</p>
                <p className="text-2xl font-bold text-blue-400">
                  {stats.sessions}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Drills</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {stats.drills}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glassmorphism rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">
              {t("yearlyActivity", profile.language)}
            </h3>
          </div>

          <div className="flex items-end justify-around h-48 gap-2">
            {Array.from({ length: 12 }).map((_, i) => {
              const month = i + 1
              const value = Object.values(stats.monthlyData).reduce(
                (sum) => sum,
                0
              )
              const height = value > 0 ? Math.random() * 100 : 0

              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer relative group"
                  style={{
                    height: `${Math.max(height, 5)}%`,
                  }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {month}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between text-xs text-slate-400 mt-4">
            <span>Jan</span>
            <span>Dec</span>
          </div>
        </div>
      </div>
    </div>
  )
}
