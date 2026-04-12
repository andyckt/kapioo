type CutoffTimeLike = {
  hour: number
  minute: number
}

type DeliveryDayAvailabilityParams = {
  dateLabel?: string | null
  cutoffTime: CutoffTimeLike
  language: "en" | "zh"
}

function formatCutoffTime(cutoffTime: CutoffTimeLike) {
  const period = cutoffTime.hour >= 12 ? "PM" : "AM"
  const displayHour =
    cutoffTime.hour === 0 ? 12 : cutoffTime.hour > 12 ? cutoffTime.hour - 12 : cutoffTime.hour
  const displayMinute = cutoffTime.minute.toString().padStart(2, "0")

  return `${displayHour}:${displayMinute} ${period}`
}

export function getDeliveryDayAvailability({
  dateLabel,
  cutoffTime,
  language,
}: DeliveryDayAvailabilityParams) {
  try {
    const torontoDateString = new Date().toLocaleString("en-US", {
      timeZone: "America/Toronto",
    })
    const torontoDate = new Date(torontoDateString)

    const currentHour = torontoDate.getHours()
    const currentMinute = torontoDate.getMinutes()

    if (!dateLabel) {
      return {
        unavailable: true,
        reason: language === "zh" ? "此餐点无可用日期" : "Date not available for this meal",
      }
    }

    const parts = dateLabel.split(" ")
    if (parts.length !== 2) {
      return {
        unavailable: true,
        reason: language === "zh" ? "日期格式无效" : "Invalid date format",
      }
    }

    const monthStr = parts[0]
    const dayStr = parts[1]
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthIndex = shortMonths.findIndex(
      (month) => monthStr.toLowerCase() === month.toLowerCase()
    )
    const dayNum = parseInt(dayStr, 10)

    if (monthIndex === -1 || Number.isNaN(dayNum)) {
      return {
        unavailable: true,
        reason: language === "zh" ? "日期格式无效" : "Invalid date format",
      }
    }

    const mealSpecificDate = new Date(
      torontoDate.getFullYear(),
      monthIndex,
      dayNum
    )
    const todayYMD = new Date(
      torontoDate.getFullYear(),
      torontoDate.getMonth(),
      torontoDate.getDate()
    )
    const tomorrowYMD = new Date(
      torontoDate.getFullYear(),
      torontoDate.getMonth(),
      torontoDate.getDate() + 1
    )
    const timeStr = formatCutoffTime(cutoffTime)

    if (mealSpecificDate < todayYMD) {
      return {
        unavailable: true,
        reason: language === "zh" ? "此日期已过" : "This specific date has already passed",
      }
    }

    const afterCutoff =
      currentHour > cutoffTime.hour ||
      (currentHour === cutoffTime.hour && currentMinute > cutoffTime.minute)

    if (mealSpecificDate.getTime() === tomorrowYMD.getTime() && afterCutoff) {
      return {
        unavailable: true,
        reason:
          language === "zh"
            ? `订单必须在配送前一天的${timeStr}前下单`
            : `Orders must be placed by ${timeStr} the day before delivery`,
      }
    }

    if (mealSpecificDate.getTime() === todayYMD.getTime()) {
      return {
        unavailable: true,
        reason:
          language === "zh"
            ? `订单必须在配送前一天的${timeStr}前下单`
            : `Orders must be placed by ${timeStr} the day before delivery`,
      }
    }

    return { unavailable: false, reason: "" }
  } catch (error) {
    console.error("Error checking delivery day availability:", error)
    return { unavailable: false, reason: "" }
  }
}
