export type ComboType = "A" | "B"

export interface ComboDishState {
  dishes: string[]
  voucherType: "twoDish" | "threeDish"
}

export interface ComboItem {
  id: string
  comboId?: string
  name: string
  calories: number
  tags: string[]
  typeA: ComboDishState
  typeB: ComboDishState
  imageUrl?: string
  imageKey?: string
}

export interface DayData {
  date: string
  displayName: string
  week: number
  isActive: boolean
  combos: ComboItem[]
}

export interface DayHistoryEntry {
  _id?: string
  historyId?: string
  originalDayId?: string
  displayName?: string
  date?: string
  week?: number
  archivedReason?: string
  createdAt?: string
  combos?: ComboItem[]
  [key: string]: unknown
}

export interface NotificationLogEntry {
  type: string
  message: string
  timestamp: Date
  data?: unknown
}

export interface FailedNotificationEmail {
  email: string
  name: string
  error: string
}

export interface NotificationProgress {
  totalUsers: number
  emailsSent: number
  emailsFailed: number
  currentBatch: number
  totalBatches: number
  progress: number
  logs: NotificationLogEntry[]
  failedEmails: FailedNotificationEmail[]
  isComplete: boolean
}

export interface EditingDishState {
  comboId: string
  dish: string
  type: "typeA" | "typeB"
}

export interface EditingDishTranslationState {
  dish: string
}

export interface DailyMenuCalculatedDates {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  sunday: string
}

