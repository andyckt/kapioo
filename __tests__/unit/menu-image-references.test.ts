import { vi } from "vitest"

import Combo from "@/models/Combo"
import DailyComboLibraryItem from "@/models/DailyComboLibraryItem"
import WeeklyComboLibraryItem from "@/models/WeeklyComboLibraryItem"
import WeeklyMealOption from "@/models/WeeklyMealOption"
import { deleteMenuImageFromS3 } from "@/lib/upload/menu-image"
import {
  deleteDailyMenuImageFromS3IfUnused,
  deleteWeeklyMenuImageFromS3IfUnused,
  isDailyMenuImageKeyInUse,
  isWeeklyMenuImageKeyInUse,
} from "@/lib/upload/menu-image-references"

vi.mock("@/models/Combo", () => ({ default: { exists: vi.fn() } }))
vi.mock("@/models/DailyComboLibraryItem", () => ({ default: { exists: vi.fn() } }))
vi.mock("@/models/WeeklyComboLibraryItem", () => ({ default: { exists: vi.fn() } }))
vi.mock("@/models/WeeklyMealOption", () => ({ default: { exists: vi.fn() } }))
vi.mock("@/lib/upload/menu-image", () => ({ deleteMenuImageFromS3: vi.fn() }))

const mockedCombo = vi.mocked(Combo)
const mockedDailyLibrary = vi.mocked(DailyComboLibraryItem)
const mockedWeeklyLibrary = vi.mocked(WeeklyComboLibraryItem)
const mockedWeeklyMeal = vi.mocked(WeeklyMealOption)
const mockedDelete = vi.mocked(deleteMenuImageFromS3)

describe("menu image reference cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCombo.exists.mockResolvedValue(null)
    mockedDailyLibrary.exists.mockResolvedValue(null)
    mockedWeeklyMeal.exists.mockResolvedValue(null)
    mockedWeeklyLibrary.exists.mockResolvedValue(null)
  })

  it("detects daily image references outside the excluded combo", async () => {
    mockedCombo.exists.mockResolvedValueOnce({ _id: "other-combo" })

    await expect(
      isDailyMenuImageKeyInUse("daily/key.jpg", { comboId: "current-combo" })
    ).resolves.toBe(true)
    expect(mockedCombo.exists).toHaveBeenCalledWith({
      imageKey: "daily/key.jpg",
      comboId: { $ne: "current-combo" },
    })
  })

  it("does not delete a daily image while another record still references it", async () => {
    mockedDailyLibrary.exists.mockResolvedValueOnce({ _id: "library-item" })

    await deleteDailyMenuImageFromS3IfUnused("daily/key.jpg", { comboId: "copied-combo" })

    expect(mockedDelete).not.toHaveBeenCalled()
  })

  it("deletes a daily image when no daily combo or library item references it", async () => {
    await deleteDailyMenuImageFromS3IfUnused("daily/orphan.jpg")

    expect(mockedDelete).toHaveBeenCalledWith("daily/orphan.jpg")
  })

  it("detects weekly image references outside the excluded meal option", async () => {
    mockedWeeklyMeal.exists.mockResolvedValueOnce({ _id: "other-option" })

    await expect(
      isWeeklyMenuImageKeyInUse("weekly/key.jpg", { mealOptionId: "current-option" })
    ).resolves.toBe(true)
    expect(mockedWeeklyMeal.exists).toHaveBeenCalledWith({
      imageKey: "weekly/key.jpg",
      _id: { $ne: "current-option" },
    })
  })

  it("does not delete a weekly image while another record still references it", async () => {
    mockedWeeklyMeal.exists.mockResolvedValueOnce({ _id: "rolled-forward-copy" })

    await deleteWeeklyMenuImageFromS3IfUnused("weekly/key.jpg", {
      mealOptionId: "old-option",
    })

    expect(mockedDelete).not.toHaveBeenCalled()
  })

  it("deletes a weekly image when no weekly option or library item references it", async () => {
    await deleteWeeklyMenuImageFromS3IfUnused("weekly/orphan.jpg")

    expect(mockedDelete).toHaveBeenCalledWith("weekly/orphan.jpg")
  })
})
