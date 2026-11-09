import { useState } from "react"
import { Menu, X, BarChart3, Zap, BookOpen, Settings, Home, Sun, Moon } from "lucide-react"
import { useCoachStore } from "@/store"
import { t } from "@/utils"

interface SidebarProps {
  currentPage:
    | "dashboard"
    | "tactical-editor"
    | "drill-library"
    | "analytics"
    | "settings"
  onPageChange: (
    page:
      | "dashboard"
      | "tactical-editor"
      | "drill-library"
      | "analytics"
      | "settings"
  ) => void
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { profile, setTheme } = useCoachStore()
  const isLight = profile.theme === "light"

  const menuItems = [
    { icon: Home,     label: t("dashboard",      profile.language), page: "dashboard"      as const },
    { icon: Zap,      label: t("tacticalEditor", profile.language), page: "tactical-editor" as const },
    { icon: BookOpen, label: t("drillLibrary",   profile.language), page: "drill-library"  as const },
    { icon: BarChart3,label: t("analytics",      profile.language), page: "analytics"      as const },
    { icon: Settings, label: t("settings",       profile.language), page: "settings"       as const },
  ]

  const sidebarBg   = isLight
    ? "bg-white border-r border-slate-200 shadow-lg"
    : "bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-r border-neon-purple/20"

  const logoBorder  = isLight ? "border-b border-slate-200"     : "border-b border-neon-purple/20"
  const coachBg     = isLight ? "bg-slate-50 border border-slate-200 m-2 rounded-lg"
                               : "glassmorphism m-2 rounded-lg border-neon-purple/20"
  const coachName   = isLight ? "text-slate-900" : "text-white"
  const coachTeam   = isLight ? "text-slate-500" : "text-slate-400"
  const footerBorder= isLight ? "border-t border-slate-200"     : "border-t border-neon-purple/20"
  const footerText  = isLight ? "text-slate-400"                : "text-slate-400"
  const footerAccent= isLight ? "text-indigo-500"               : "text-neon-cyan"

  const activeItem  = isLight
    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
    : "bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-lg shadow-neon-purple/40"
  const inactiveItem= isLight
    ? "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-100"
    : "text-slate-300 hover:bg-slate-800/50 hover:text-neon-cyan border border-transparent hover:border-neon-purple/30"

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 lg:hidden"
      >
        {isOpen
          ? <X    size={24} className={isLight ? "text-slate-700" : "text-white"} />
          : <Menu size={24} className={isLight ? "text-slate-700" : "text-white"} />
        }
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 flex flex-col transition-transform duration-300 z-40 lg:relative lg:translate-x-0 ${sidebarBg} ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className={`p-6 space-y-1 ${logoBorder}`}>
          <h1 className="text-3xl font-bold gradient-text">VisuBall</h1>
          <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? "text-indigo-500" : "text-neon-cyan"}`}>
            Elite Tactical Board
          </p>
        </div>

        {/* Coach info */}
        <div className={`p-4 space-y-0.5 ${coachBg}`}>
          <p className={`text-sm font-bold ${coachName}`}>{profile.name}</p>
          <p className={`text-xs ${coachTeam}`}>{profile.teamName}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.page}
              onClick={() => { onPageChange(item.page); setIsOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                currentPage === item.page ? activeItem : inactiveItem
              }`}
            >
              <item.icon
                size={19}
                className={currentPage === item.page
                  ? "text-white"
                  : isLight ? "group-hover:text-indigo-600 transition-colors" : "group-hover:text-neon-cyan transition-colors"
                }
              />
              <span className="text-sm font-medium">{item.label}</span>
              {currentPage === item.page && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full opacity-80" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className={`p-4 space-y-3 ${footerBorder}`}>
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isLight ? "dark" : "light")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                : "bg-slate-800/60 hover:bg-slate-700 border-slate-700/50 text-slate-300"
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isLight ? "bg-amber-100 text-amber-500" : "bg-indigo-900/60 text-indigo-300"
            }`}>
              {isLight ? <Sun size={15} /> : <Moon size={15} />}
            </div>
            <span>{isLight ? "Light Mode" : "Dark Mode"}</span>
            {/* toggle pill */}
            <div className={`ml-auto w-10 h-5 rounded-full relative transition-colors ${isLight ? "bg-amber-400" : "bg-slate-700"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isLight ? "left-5" : "left-0.5"}`} />
            </div>
          </button>

          <div className={`text-xs ${footerText}`}>
            <p className={`font-semibold ${footerAccent}`}>© 2026 VisuBall</p>
            <p>v1.5 Elite Edition</p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
