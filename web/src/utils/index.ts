import { TRANSLATIONS } from "@/constants"

const lookup = (lang: Record<string, any> | undefined, key: string): string | undefined => {
  let value: any = lang
  for (const k of key.split(".")) {
    value = value?.[k]
    if (!value) return undefined
  }
  return typeof value === "string" ? value : undefined
}

/** Translate `key`; falls back to English, then to the raw key (never shows a blank). */
const EXTRA: Record<string, Record<string, string>> = {
  en: { welcome: "Welcome", manageTraining: "Manage your training sessions and drills" },
  he: { welcome: "ברוך הבא", manageTraining: "נהל את האימונים והתרגילים שלך" },
  es: { welcome: "Bienvenido", manageTraining: "Gestiona tus entrenamientos y ejercicios" },
  pt: { welcome: "Bem-vindo", manageTraining: "Gerencie seus treinos e exercícios" },
  de: { welcome: "Willkommen", manageTraining: "Verwalte deine Trainings und Übungen" },
  it: { welcome: "Benvenuto", manageTraining: "Gestisci allenamenti ed esercizi" },
  ru: { welcome: "Добро пожаловать", manageTraining: "Управляйте тренировками и упражнениями" },
  ar: { welcome: "مرحباً", manageTraining: "أدر تدريباتك وتمارينك" },
}

export const t = (key: string, language: string = "en"): string =>
  lookup(TRANSLATIONS[language], key) ?? EXTRA[language]?.[key] ??
  lookup(TRANSLATIONS.en, key) ?? EXTRA.en[key] ?? key

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export const formatDate = (date: Date | string): string => {
  if (typeof date === "string") {
    const [year, month, day] = date.split("-")
    return new Date(Number(year), Number(month) - 1, Number(day))
      .toLocaleDateString()
  }
  return date.toLocaleDateString()
}

export const formatTime = (hours: number, minutes: number): string => {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export const calculateTrainingHours = (
  startTime?: string,
  endTime?: string
): number => {
  if (!startTime || !endTime) return 0

  const [startH, startM] = startTime.split(":").map(Number)
  const [endH, endM] = endTime.split(":").map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  return Math.round(((endMinutes - startMinutes) / 60) * 10) / 10
}

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const getCurrentDate = (): string => {
  const now = new Date()
  return now.toISOString().split("T")[0]
}

export const getMonthName = (month: number, language: string = "en"): string => {
  const months = {
    en: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    he: [
      "ינואר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני",
      "יולי",
      "אוגוסט",
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
    ],
  }
  return (months[language as keyof typeof months] || months.en)[month]
}

export const getDayName = (day: number, language: string = "en"): string => {
  const days = {
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    he: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
  }
  return (days[language as keyof typeof days] || days.en)[day]
}

export const isToday = (date: string): boolean => {
  return date === getCurrentDate()
}

export const isPastDate = (date: string): boolean => {
  return date < getCurrentDate()
}

export const isFutureDate = (date: string): boolean => {
  return date > getCurrentDate()
}
