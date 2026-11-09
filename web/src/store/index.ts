import { create } from "zustand"
import { Exercise, CoachProfile, Step } from "@/types"

interface ExerciseStore {
  exercises: Record<string, Exercise[]>
  currentExercise: Exercise | null
  currentStep: number
  isPlaying: boolean
  playbackSpeed: number

  // Actions
  addExercise: (exercise: Exercise) => void
  updateExercise: (exercise: Exercise) => void
  deleteExercise: (id: string, date: string) => void
  getExercisesByDate: (date: string) => Exercise[]
  setCurrentExercise: (exercise: Exercise | null) => void
  setCurrentStep: (step: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  addStep: (step: Step) => void
  updateStep: (step: Step) => void
  deleteStep: (stepId: string) => void
  loadBackup: (data: Record<string, Exercise[]>) => void
  exportData: () => Record<string, Exercise[]>
  getExercisesForMonth: (year: number, month: number) => Exercise[]
  getAllExercises: () => Exercise[]
}

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  exercises: (() => {
    const stored = localStorage.getItem("visuball_exercises")
    return stored ? JSON.parse(stored) : {}
  })(),
  currentExercise: null,
  currentStep: 0,
  isPlaying: false,
  playbackSpeed: 1,

  addExercise: (exercise: Exercise) => {
    set((state) => {
      const date = exercise.date
      const updated = {
        ...state.exercises,
        [date]: [...(state.exercises[date] || []), exercise],
      }
      localStorage.setItem("visuball_exercises", JSON.stringify(updated))
      return { exercises: updated }
    })
  },

  updateExercise: (exercise: Exercise) => {
    set((state) => {
      const date = exercise.date
      const exercises = state.exercises[date] || []
      const updated = {
        ...state.exercises,
        [date]: exercises.map((e) => (e.id === exercise.id ? exercise : e)),
      }
      localStorage.setItem("visuball_exercises", JSON.stringify(updated))
      return { exercises: updated }
    })
  },

  deleteExercise: (id: string, date: string) => {
    set((state) => {
      const updated = {
        ...state.exercises,
        [date]: (state.exercises[date] || []).filter((e) => e.id !== id),
      }
      if (updated[date].length === 0) {
        delete updated[date]
      }
      localStorage.setItem("visuball_exercises", JSON.stringify(updated))
      return { exercises: updated }
    })
  },

  getExercisesByDate: (date: string) => {
    return get().exercises[date] || []
  },

  setCurrentExercise: (exercise: Exercise | null) => {
    set({ currentExercise: exercise, currentStep: 0 })
  },

  setCurrentStep: (step: number) => {
    set({ currentStep: step })
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing })
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed })
  },

  addStep: (step: Step) => {
    set((state) => {
      if (!state.currentExercise) return state
      const updated = {
        ...state.currentExercise,
        steps: [...state.currentExercise.steps, step],
      }
      return { currentExercise: updated }
    })
  },

  updateStep: (step: Step) => {
    set((state) => {
      if (!state.currentExercise) return state
      const updated = {
        ...state.currentExercise,
        steps: state.currentExercise.steps.map((s) =>
          s.id === step.id ? step : s
        ),
      }
      return { currentExercise: updated }
    })
  },

  deleteStep: (stepId: string) => {
    set((state) => {
      if (!state.currentExercise) return state
      const updated = {
        ...state.currentExercise,
        steps: state.currentExercise.steps.filter((s) => s.id !== stepId),
      }
      return { currentExercise: updated }
    })
  },

  loadBackup: (data: Record<string, Exercise[]>) => {
    localStorage.setItem("visuball_exercises", JSON.stringify(data))
    set({ exercises: data })
  },

  exportData: () => {
    return get().exercises
  },

  getExercisesForMonth: (year: number, month: number) => {
    const state = get()
    const allExercises: Exercise[] = []
    Object.keys(state.exercises).forEach((date) => {
      const [y, m] = date.split("-").map(Number)
      if (y === year && m === month) {
        allExercises.push(...state.exercises[date])
      }
    })
    return allExercises
  },

  getAllExercises: () => {
    const state = get()
    const allExercises: Exercise[] = []
    Object.values(state.exercises).forEach((exercises) => {
      allExercises.push(...exercises)
    })
    return allExercises
  },
}))

interface CoachStore {
  profile: CoachProfile
  setProfile: (profile: Partial<CoachProfile>) => void
  setTheme: (theme: "light" | "dark") => void
  setLanguage: (language: string) => void
}

function applyTheme(theme: "light" | "dark") {
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
    document.body.classList.remove("light")
  } else {
    document.documentElement.classList.remove("dark")
    document.body.classList.add("light")
  }
}

export const useCoachStore = create<CoachStore>((set) => ({
  profile: (() => {
    const stored = localStorage.getItem("visuball_coach_profile")
    const profile = stored
      ? JSON.parse(stored)
      : { name: "Coach", teamName: "Team", language: "en", theme: "dark" }
    applyTheme(profile.theme ?? "dark")
    return profile
  })(),

  setProfile: (updates: Partial<CoachProfile>) => {
    set((state) => {
      const updated = { ...state.profile, ...updates }
      localStorage.setItem("visuball_coach_profile", JSON.stringify(updated))
      return { profile: updated }
    })
  },

  setTheme: (theme: "light" | "dark") => {
    set((state) => {
      const updated = { ...state.profile, theme }
      localStorage.setItem("visuball_coach_profile", JSON.stringify(updated))
      applyTheme(theme)
      return { profile: updated }
    })
  },

  setLanguage: (language: string) => {
    set((state) => {
      const updated = { ...state.profile, language }
      localStorage.setItem("visuball_coach_profile", JSON.stringify(updated))
      return { profile: updated }
    })
  },
}))
