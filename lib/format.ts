export function formatDate(date: Date | string): string {
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "America/Toronto",
    })
  } catch {
    return String(date)
  }
}

export function formatDateTime(date: Date | string): string {
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    return dateObj.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Toronto",
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
