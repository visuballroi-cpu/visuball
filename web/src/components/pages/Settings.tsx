import { useState } from "react"
import { useCoachStore, useExerciseStore } from "@/store"
import { t } from "@/utils"
import { Sun, Moon, Download, RotateCcw } from "lucide-react"
import { LANGUAGES } from "@/constants"

export default function Settings() {
  const { profile, setProfile, setTheme, setLanguage } = useCoachStore()
  const { exportData } = useExerciseStore()
  const [coachName, setCoachName] = useState(profile.name)
  const [teamName, setTeamName] = useState(profile.teamName)

  const handleSaveProfile = () => {
    setProfile({
      name: coachName,
      teamName: teamName,
    })
    alert(t("success", profile.language) || "Settings saved!")
  }

  const handleExportData = () => {
    const data = exportData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `visuball_backup_${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFactoryReset = () => {
    if (confirm(t("confirmReset", profile.language) || "Are you sure?")) {
      localStorage.clear()
      window.location.reload()
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {t("settings", profile.language)}
        </h1>
        <p className="text-slate-400">
          Customize your VisuBall experience
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Profile Settings */}
        <div className="glassmorphism rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">
            {t("profile", profile.language)}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                {t("coachName", profile.language)}
              </label>
              <input
                type="text"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                {t("teamName", profile.language)}
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              {t("save", profile.language)}
            </button>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="glassmorphism rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">
            {t("theme", profile.language)}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                profile.theme === "dark"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <Moon size={20} />
              {t("darkMode", profile.language)}
            </button>

            <button
              onClick={() => setTheme("light")}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                profile.theme === "light"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <Sun size={20} />
              {t("lightMode", profile.language)}
            </button>
          </div>
        </div>

        {/* Language Settings */}
        <div className="glassmorphism rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">
            {t("language", profile.language)}
          </h2>

          <select
            value={profile.language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Data Management */}
        <div className="glassmorphism rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">
            {t("dataManagement", profile.language)}
          </h2>

          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
            >
              <Download size={18} />
              {t("exportData", profile.language)}
            </button>

            <button
              onClick={handleFactoryReset}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
            >
              <RotateCcw size={18} />
              {t("factoryReset", profile.language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
