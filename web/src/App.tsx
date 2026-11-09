import { useEffect, useState } from "react"
import { useCoachStore, useExerciseStore } from "@/store"
import Sidebar from "@/components/layout/Sidebar"
import Dashboard from "@/components/pages/Dashboard"
import TacticalEditor from "@/components/pages/TacticalEditor"
import DrillLibrary from "@/components/pages/DrillLibrary"
import Analytics from "@/components/pages/Analytics"
import Settings from "@/components/pages/Settings"

type Page =
  | "dashboard"
  | "tactical-editor"
  | "drill-library"
  | "analytics"
  | "settings"

interface NewDrillContext {
  date: string
  type: "SESSION" | "DRILL"
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard")
  const [newDrillContext, setNewDrillContext] = useState<NewDrillContext | null>(
    null
  )
  const { profile } = useCoachStore()

  const handleCreateDrill = (context: NewDrillContext) => {
    setNewDrillContext(context)
    setCurrentPage("tactical-editor")
  }

  // Apply theme on mount
  useEffect(() => {
    if (profile.theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [profile.theme])

  // Initialize app
  useEffect(() => {
    // Ensure data is loaded
    const exercises = useExerciseStore.getState().getAllExercises()
    console.log("VisuBall 1.5 initialized with", exercises.length, "exercises")
  }, [])

  return (
    <div className={`flex h-screen ${profile.theme === "dark" ? "dark" : ""}`}>
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-900 dark:to-slate-950 lg:from-slate-50 lg:to-slate-100">
        {currentPage === "dashboard" && (
          <Dashboard onCreateDrill={handleCreateDrill} />
        )}
        {currentPage === "tactical-editor" && (
          <TacticalEditor
            newDrillContext={newDrillContext}
            onClearContext={() => {
              setNewDrillContext(null)
              setCurrentPage("dashboard")
            }}
          />
        )}
        {currentPage === "drill-library" && <DrillLibrary onLoadToBoard={() => { setNewDrillContext(null); setCurrentPage("tactical-editor") }} />}
        {currentPage === "analytics" && <Analytics />}
        {currentPage === "settings" && <Settings />}
      </main>
    </div>
  )
}
