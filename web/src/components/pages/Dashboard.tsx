import { useState, useMemo } from "react"
import { useExerciseStore, useCoachStore } from "@/store"
import { t } from "@/utils"
import Calendar from "@/components/dashboard/Calendar"
import StatsCards from "@/components/dashboard/StatsCards"
import DailyModal from "@/components/dashboard/DailyModal"

interface DashboardProps {
  onCreateDrill: (context: {
    date: string
    type: "SESSION" | "DRILL"
  }) => void
}

export default function Dashboard({ onCreateDrill }: DashboardProps) {
  const { profile } = useCoachStore()
  const { exercises } = useExerciseStore()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthExercises = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() + 1
    const all: Record<string, { sessions: number; drills: number }> = {}

    Object.keys(exercises).forEach((date) => {
      const [y, m] = date.split("-").map(Number)
      if (y === year && m === month) {
        const sessionCount = exercises[date].filter(
          (e) => e.type === "SESSION"
        ).length
        const drillCount = exercises[date].filter((e) => e.type === "DRILL")
          .length
        all[date] = { sessions: sessionCount, drills: drillCount }
      }
    })

    return all
  }, [currentMonth, exercises])

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold gradient-text">
          {t("welcome", profile.language) || "Welcome"}, {profile.name}!
        </h1>
        <p className="text-slate-400 text-lg">
          {t("manageTraining", profile.language) || "Manage your training sessions and drills"}
        </p>
      </div>

      {/* Stats Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-300 uppercase tracking-wider">Quick Stats</h2>
        <StatsCards exercises={exercises} />
      </div>

      {/* Calendar — full width */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-300 uppercase tracking-wider">Training Calendar</h2>
        <Calendar
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          monthExercises={monthExercises}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      </div>

      {/* Day popup modal */}
      {selectedDate && (
        <DailyModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onCreateDrill={onCreateDrill}
        />
      )}
    </div>
  )
}
