export const PITCH_WIDTH = 105
export const PITCH_HEIGHT = 68

export const FORMATIONS = {
  "4-4-2": {
    label: "4-4-2",
    positions: [
      { x: 5,  y: 34 }, // GK
      { x: 20, y: 10 }, // RB
      { x: 20, y: 24 }, // CB
      { x: 20, y: 44 }, // CB
      { x: 20, y: 58 }, // LB
      { x: 40, y: 10 }, // RM
      { x: 40, y: 24 }, // CM
      { x: 40, y: 44 }, // CM
      { x: 40, y: 58 }, // LM
      { x: 62, y: 27 }, // ST
      { x: 62, y: 41 }, // ST
    ],
  },
  "4-3-3": {
    label: "4-3-3",
    positions: [
      { x: 5,  y: 34 }, // GK
      { x: 20, y: 10 }, // RB
      { x: 20, y: 24 }, // CB
      { x: 20, y: 44 }, // CB
      { x: 20, y: 58 }, // LB
      { x: 40, y: 16 }, // CM
      { x: 40, y: 34 }, // CM
      { x: 40, y: 52 }, // CM
      { x: 62, y: 10 }, // RW
      { x: 62, y: 34 }, // ST
      { x: 62, y: 58 }, // LW
    ],
  },
  "4-2-3-1": {
    label: "4-2-3-1",
    positions: [
      { x: 5,  y: 34 }, // GK
      { x: 20, y: 10 }, // RB
      { x: 20, y: 24 }, // CB
      { x: 20, y: 44 }, // CB
      { x: 20, y: 58 }, // LB
      { x: 33, y: 26 }, // DM
      { x: 33, y: 42 }, // DM
      { x: 50, y: 10 }, // RAM
      { x: 50, y: 34 }, // CAM
      { x: 50, y: 58 }, // LAM
      { x: 65, y: 34 }, // ST
    ],
  },
  "4-3-2-1": {
    label: "4-3-2-1",
    positions: [
      { x: 5,  y: 34 }, // GK
      { x: 20, y: 10 }, // RB
      { x: 20, y: 24 }, // CB
      { x: 20, y: 44 }, // CB
      { x: 20, y: 58 }, // LB
      { x: 35, y: 17 }, // CM
      { x: 35, y: 34 }, // CM
      { x: 35, y: 51 }, // CM
      { x: 52, y: 25 }, // SS
      { x: 52, y: 43 }, // SS
      { x: 65, y: 34 }, // ST
    ],
  },
  "4-1-4-1": {
    label: "4-1-4-1",
    positions: [
      { x: 5,  y: 34 }, // GK
      { x: 20, y: 10 }, // RB
      { x: 20, y: 24 }, // CB
      { x: 20, y: 44 }, // CB
      { x: 20, y: 58 }, // LB
      { x: 32, y: 34 }, // DM
      { x: 46, y: 10 }, // RM
      { x: 46, y: 24 }, // CM
      { x: 46, y: 44 }, // CM
      { x: 46, y: 58 }, // LM
      { x: 65, y: 34 }, // ST
    ],
  },
  "3-5-2": {
    label: "3-5-2",
    positions: [
      { x: 5,  y: 34 }, // GK
      { x: 20, y: 17 }, // CB
      { x: 20, y: 34 }, // CB
      { x: 20, y: 51 }, // CB
      { x: 38, y: 8  }, // RWB
      { x: 38, y: 22 }, // CM
      { x: 38, y: 34 }, // CM
      { x: 38, y: 46 }, // CM
      { x: 38, y: 60 }, // LWB
      { x: 60, y: 27 }, // ST
      { x: 60, y: 41 }, // ST
    ],
  },
  "3-4-3": {
    label: "3-4-3",
    positions: [
      { x: 5,  y: 34 }, // GK
      { x: 20, y: 17 }, // CB
      { x: 20, y: 34 }, // CB
      { x: 20, y: 51 }, // CB
      { x: 40, y: 10 }, // RM
      { x: 40, y: 26 }, // CM
      { x: 40, y: 42 }, // CM
      { x: 40, y: 58 }, // LM
      { x: 62, y: 10 }, // RW
      { x: 62, y: 34 }, // ST
      { x: 62, y: 58 }, // LW
    ],
  },
  "5-3-2": {
    label: "5-3-2",
    positions: [
      { x: 5,  y: 34 }, // GK
      { x: 20, y: 8  }, // RWB
      { x: 20, y: 21 }, // CB
      { x: 20, y: 34 }, // CB
      { x: 20, y: 47 }, // CB
      { x: 20, y: 60 }, // LWB
      { x: 40, y: 17 }, // CM
      { x: 40, y: 34 }, // CM
      { x: 40, y: 51 }, // CM
      { x: 62, y: 27 }, // ST
      { x: 62, y: 41 }, // ST
    ],
  },
  "5-4-1": {
    label: "5-4-1",
    positions: [
      { x: 5,  y: 34 }, // GK
      { x: 20, y: 8  }, // RWB
      { x: 20, y: 21 }, // CB
      { x: 20, y: 34 }, // CB
      { x: 20, y: 47 }, // CB
      { x: 20, y: 60 }, // LWB
      { x: 42, y: 10 }, // RM
      { x: 42, y: 26 }, // CM
      { x: 42, y: 42 }, // CM
      { x: 42, y: 58 }, // LM
      { x: 65, y: 34 }, // ST
    ],
  },
}

export const LANGUAGES = {
  en: "English",
  he: "עברית",
  es: "Español",
  pt: "Português",
  de: "Deutsch",
  it: "Italiano",
  ru: "Русский",
  ar: "العربية",
}

export const TRANSLATIONS: Record<
  string,
  Record<string, string | Record<string, string>>
> = {
  en: {
    // Dashboard
    dashboard: "Dashboard",
    today: "Today",
    calendar: "Calendar",
    monthly: "Monthly",
    weekly: "Weekly",
    totalSessions: "Total Sessions",
    trainingHours: "Training Hours",
    drillsCreated: "Drills Created",
    createSession: "New Session",
    createDrill: "New Drill",
    editDrill: "Edit Drill",
    deleteDrill: "Delete Drill",

    // Tactical Editor
    tacticalEditor: "Tactical Editor",
    "2d": "2D View",
    "3d": "3D View",
    formation: "Formation",
    squad: "Squad",
    ballToggle: "Toggle Ball",
    clearBoard: "Clear Board",
    addPlayer: "Add Player",
    removePlayer: "Remove Player",
    drawArea: "Draw Area",
    drawPath: "Draw Path",
    resetView: "Reset View",
    pitchOverlay: "Pitch Overlay",
    thirds: "Thirds",
    quarters: "Quarters",
    channels: "Channels",
    pepsBoxes: "Pep's Boxes",
    grid: "Grid",
    wings: "Wings",

    // Timeline
    timeline: "Timeline",
    addStep: "Add Step",
    cloneStep: "Clone Step",
    deleteStep: "Delete Step",
    play: "Play",
    pause: "Pause",
    rewind: "Rewind",
    speed: "Speed",

    // AI Assistant
    aiAssistant: "AI Assistant",
    askAI: "Ask AI...",
    generateDrill: "Generate Drill",
    generateSession: "Generate Session",
    analyzeFormation: "Analyze Formation",
    analyzing: "Analyzing Tactics...",
    loadTacticalBoard: "Load to Board",
    rating: "AI Rating",

    // Drill Library
    drillLibrary: "Drill Library",
    filter: "Filter",
    byAgeGroup: "By Age Group",
    byCategory: "By Category",
    importToDrill: "Import to Schedule",

    // Analytics
    analytics: "Analytics",
    trainingDistribution: "Training Distribution",
    yearlyActivity: "Yearly Activity",

    // Settings
    settings: "Settings",
    profile: "Profile",
    coachName: "Coach Name",
    teamName: "Team Name",
    language: "Language",
    theme: "Theme",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    dataManagement: "Data Management",
    exportData: "Export Data",
    factoryReset: "Factory Reset",
    confirmReset: "Are you sure? This will delete all data.",

    drillSettings: "Drill Settings",
    fillRequired: "Please enter a drill name",
    confirmDelete: "Are you sure?"
  },
  he: {
    // Dashboard
    dashboard: "לוח בקרה",
    today: "היום",
    calendar: "יומן",
    monthly: "חודשי",
    weekly: "שבועי",
    totalSessions: "סה״כ אימונים",
    trainingHours: "שעות אימון",
    drillsCreated: "תרגילים שנוצרו",
    createSession: "אימון חדש",
    createDrill: "תרגיל חדש",
    editDrill: "עריכת תרגיל",
    deleteDrill: "מחיקת תרגיל",

    // Tactical Editor
    tacticalEditor: "עורך טקטי",
    "2d": "תצוגה 2D",
    "3d": "תצוגה 3D",
    formation: "מערך",
    squad: "סגל",
    ballToggle: "הצגת כדור",
    clearBoard: "ניקוי הלוח",
    addPlayer: "הוספת שחקן",
    removePlayer: "הסרת שחקן",
    drawArea: "ציור אזור",
    drawPath: "ציור נתיב",
    resetView: "איפוס תצוגה",
    pitchOverlay: "שכבות עזר",
    thirds: "שלישים",
    quarters: "רבעים",
    channels: "תעלות",
    pepsBoxes: "קופסאות פפ",
    grid: "רשת",
    wings: "כנפיים",

    // Timeline
    timeline: "ציר זמן",
    addStep: "הוספת שלב",
    cloneStep: "שכפול שלב",
    deleteStep: "מחיקת שלב",
    play: "הפעלה",
    pause: "הפסקה",
    rewind: "חזרה",
    speed: "מהירות",

    // AI Assistant
    aiAssistant: "עוזר מאמן",
    askAI: "שאל את העוזר...",
    generateDrill: "צור תרגיל",
    generateSession: "צור אימון",
    analyzeFormation: "נתח מערך",
    analyzing: "מנתח טקטיקה...",
    loadTacticalBoard: "טען ללוח",
    rating: "ציון בינה מלאכותית",

    // Drill Library
    drillLibrary: "ספריית תרגילים",
    filter: "סנן",
    byAgeGroup: "לפי גיל",
    byCategory: "לפי קטגוריה",
    importToDrill: "ייבא ללו״ז",

    // Analytics
    analytics: "סטטיסטיקה",
    trainingDistribution: "התפלגות אימונים",
    yearlyActivity: "פעילות שנתית",

    // Settings
    settings: "הגדרות",
    profile: "פרופיל",
    coachName: "שם המאמן",
    teamName: "שם הקבוצה",
    language: "שפה",
    theme: "ערכת נושא",
    lightMode: "מצב יום",
    darkMode: "מצב לילה",
    dataManagement: "ניהול נתונים",
    exportData: "ייצוא נתונים",
    factoryReset: "איפוס מלא",
    confirmReset: "האם אתה בטוח? זה ימחק את כל הנתונים.",

    // Common
    save: "שמור",
    cancel: "ביטול",
    delete: "מחק",
    edit: "ערוך",
    close: "סגור",
    loading: "טוען...",
    error: "שגיאה",
    success: "הצליח",
    name: "שם",
    number: "מספר",
    date: "תאריך",
    time: "שעה",
    duration: "משך",
    description: "תיאור",
    home: "בית",
    away: "חוץ",
    drillSettings: "הגדרות תרגיל",
    fillRequired: "אנא הזן שם תרגיל",
    confirmDelete: "האם אתה בטוח?",
  },
  es: {
    dashboard: "Panel de Control",
    today: "Hoy",
    calendar: "Calendario",
    totalSessions: "Total de Sesiones",
    trainingHours: "Horas de Entrenamiento",
    drillsCreated: "Ejercicios Creados",
    save: "Guardar",
    cancel: "Cancelar",
  },
  pt: {
    dashboard: "Painel de Controle",
    today: "Hoje",
    calendar: "Calendário",
    totalSessions: "Total de Sessões",
    trainingHours: "Horas de Treinamento",
    drillsCreated: "Exercícios Criados",
    save: "Salvar",
    cancel: "Cancelar",
  },
  de: {
    dashboard: "Dashboard",
    today: "Heute",
    calendar: "Kalender",
    totalSessions: "Gesamtsitzungen",
    trainingHours: "Trainingstunden",
    drillsCreated: "Übungen erstellt",
    save: "Speichern",
    cancel: "Abbrechen",
  },
  it: {
    dashboard: "Pannello di Controllo",
    today: "Oggi",
    calendar: "Calendario",
    totalSessions: "Sessioni Totali",
    trainingHours: "Ore di Allenamento",
    drillsCreated: "Esercizi Creati",
    save: "Salva",
    cancel: "Annulla",
  },
  ru: {
    dashboard: "Панель управления",
    today: "Сегодня",
    calendar: "Календарь",
    totalSessions: "Всего сеансов",
    trainingHours: "Часы тренировок",
    drillsCreated: "Созданные упражнения",
    save: "Сохранить",
    cancel: "Отмена",
  },
  ar: {
    dashboard: "لوحة التحكم",
    today: "اليوم",
    calendar: "التقويم",
    totalSessions: "إجمالي الجلسات",
    trainingHours: "ساعات التدريب",
    drillsCreated: "التدريبات المنشأة",
    save: "احفظ",
    cancel: "إلغاء",
  },
}

export const DRILLS_LIBRARY = [
  {
    id: "drill-001",
    name: "Build-out from Back",
    description: "Possession pattern to escape pressing",
    category: "TACTICS",
    ageGroup: "ADULT",
    steps: [],
  },
  {
    id: "drill-002",
    name: "High Press Escape",
    description: "Tactical drill for beating aggressive pressing",
    category: "TACTICS",
    ageGroup: "U17",
    steps: [],
  },
  {
    id: "drill-003",
    name: "Finishing Drills",
    description: "Shooting practice in game-realistic situations",
    category: "TECHNIQUE",
    ageGroup: "U13",
    steps: [],
  },
  {
    id: "drill-004",
    name: "Rondo Possession",
    description: "Keep-possession game with defensive pressure",
    category: "POSSESSION",
    ageGroup: "U10",
    steps: [],
  },
  {
    id: "drill-005",
    name: "Corner Kick Set Piece",
    description: "Practice offensive corner routines",
    category: "SET_PIECES",
    ageGroup: "ADULT",
    steps: [],
  },
]

export const AREA_COLORS = [
  "rgba(239, 68, 68, 0.3)", // red
  "rgba(59, 130, 246, 0.3)", // blue
  "rgba(34, 197, 94, 0.3)", // green
  "rgba(234, 179, 8, 0.3)", // yellow
  "rgba(139, 92, 246, 0.3)", // purple
]

export const DEFAULT_PLAYERS = {
  HOME: 11,
  AWAY: 11,
}
