type DateFormatOptions = Intl.DateTimeFormatOptions & {
  locale?: string
}

function toDate(date: Date | string) {
  const dateObj = date instanceof Date ? date : new Date(date)
  return Number.isNaN(dateObj.getTime()) ? null : dateObj
}

export function formatDate(date: Date | string, options: DateFormatOptions = {}): string {
  const dateObj = toDate(date)
  if (!dateObj) {
    return String(date)
  }

  const { locale = "en-US", ...formatOptions } = options

  try {
    return dateObj.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "America/Toronto",
      ...formatOptions,
    })
  } catch {
    return String(date)
  }
}

export function formatDateTime(date: Date | string, options: DateFormatOptions = {}): string {
  const dateObj = toDate(date)
  if (!dateObj) {
    return String(date)
  }

  const { locale = "en-US", ...formatOptions } = options

  try {
    return dateObj.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Toronto",
      ...formatOptions,
    })
  } catch {
    return String(date)
  }
}

export function formatDateForCSV(date: Date | string | undefined): string {
  if (!date) return ""

  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    return dateObj.toISOString().split("T")[0]
  } catch {
    return ""
  }
}
