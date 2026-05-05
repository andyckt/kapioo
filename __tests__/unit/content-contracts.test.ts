import { comboBodySchema, mealOptionSchema } from "@/lib/contracts/content"
import {
  createWeeklyMealOptionBodySchema,
  updateWeeklyMealOptionBodySchema,
} from "@/lib/contracts/weekly-subscription"

describe("content contracts", () => {
  describe("comboBodySchema", () => {
    const baseCombo = {
      comboId: "monday-combo-1",
      dayId: "monday",
      name: "套餐 1",
      calories: 650,
    }

    it("accepts combo image fields as optional", () => {
      expect(comboBodySchema.parse(baseCombo)).toEqual(baseCombo)
    })

    it("accepts a valid combo image URL and key", () => {
      const parsed = comboBodySchema.parse({
        ...baseCombo,
        imageUrl: "https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/combo-images/monday/image.jpg",
        imageKey: "combo-images/monday/image.jpg",
      })

      expect(parsed.imageUrl).toContain("/combo-images/monday/image.jpg")
      expect(parsed.imageKey).toBe("combo-images/monday/image.jpg")
    })

    it("accepts optional localized daily combo metadata", () => {
      const parsed = comboBodySchema.parse({
        ...baseCombo,
        proteinGrams: 32,
        featuredInMenuPreview: true,
        tags: ["高蛋白"],
        tagsEn: ["High protein"],
        allergensZh: ["大豆"],
        allergensEn: ["Soy"],
        descriptionZh: "清爽高蛋白组合。",
        descriptionEn: "A light high-protein combo.",
      })

      expect(parsed.proteinGrams).toBe(32)
      expect(parsed.featuredInMenuPreview).toBe(true)
      expect(parsed.tagsEn).toEqual(["High protein"])
      expect(parsed.descriptionEn).toBe("A light high-protein combo.")
    })

    it("accepts empty strings so admins can remove an image", () => {
      const parsed = comboBodySchema.parse({
        ...baseCombo,
        imageUrl: "",
        imageKey: "",
      })

      expect(parsed.imageUrl).toBe("")
      expect(parsed.imageKey).toBe("")
    })
  })

  describe("mealOptionSchema (weekly)", () => {
    const baseOption = {
      id: "option-1",
      name: "红烧肉",
      active: true,
    }

    it("accepts an option without image fields", () => {
      const parsed = mealOptionSchema.parse(baseOption)
      expect(parsed.imageUrl).toBeUndefined()
      expect(parsed.imageKey).toBeUndefined()
    })

    it("accepts an option with image fields", () => {
      const parsed = mealOptionSchema.parse({
        ...baseOption,
        imageUrl: "https://example.com/weekly-meal-images/option-1/photo.jpg",
        imageKey: "weekly-meal-images/option-1/photo.jpg",
      })
      expect(parsed.imageUrl).toContain("/weekly-meal-images/")
      expect(parsed.imageKey).toBe("weekly-meal-images/option-1/photo.jpg")
    })

    it("accepts optional combo library snapshot fields", () => {
      const parsed = mealOptionSchema.parse({
        ...baseOption,
        calories: 650,
        proteinGrams: 42,
        allergens: ["soy", "sesame"],
        description: "Library snapshot",
        sourceComboLibraryId: "combo-1",
        sourceComboLibraryUpdatedAt: "2026-05-03T00:00:00.000Z",
      })

      expect(parsed.calories).toBe(650)
      expect(parsed.proteinGrams).toBe(42)
      expect(parsed.sourceComboLibraryId).toBe("combo-1")
    })
  })

  describe("createWeeklyMealOptionBodySchema", () => {
    const baseBody = { name: "红烧肉", day: "sunday" }

    it("accepts a body without image fields", () => {
      const parsed = createWeeklyMealOptionBodySchema.parse(baseBody)
      expect(parsed.imageUrl).toBeUndefined()
      expect(parsed.imageKey).toBeUndefined()
    })

    it("accepts a body with valid image fields", () => {
      const parsed = createWeeklyMealOptionBodySchema.parse({
        ...baseBody,
        imageUrl: "https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/weekly-meal-images/x/y.jpg",
        imageKey: "weekly-meal-images/x/y.jpg",
        calories: 650,
        allergens: ["soy"],
        proteinGrams: 28,
        description: "Snapshot",
        sourceComboLibraryId: "combo-1",
        sourceComboLibraryUpdatedAt: "2026-05-03T00:00:00.000Z",
      })
      expect(parsed.imageUrl).toContain("/weekly-meal-images/")
      expect(parsed.imageKey).toBe("weekly-meal-images/x/y.jpg")
      expect(parsed.calories).toBe(650)
      expect(parsed.proteinGrams).toBe(28)
      expect(parsed.sourceComboLibraryUpdatedAt).toBeInstanceOf(Date)
    })

    it("accepts empty image strings (no-op create)", () => {
      const parsed = createWeeklyMealOptionBodySchema.parse({
        ...baseBody,
        imageUrl: "",
        imageKey: "",
      })
      expect(parsed.imageUrl).toBe("")
      expect(parsed.imageKey).toBe("")
    })

    it("rejects invalid image URLs", () => {
      expect(() =>
        createWeeklyMealOptionBodySchema.parse({
          ...baseBody,
          imageUrl: "not-a-url",
        })
      ).toThrow()
    })
  })

  describe("updateWeeklyMealOptionBodySchema", () => {
    it("treats every field including image fields as optional", () => {
      const parsed = updateWeeklyMealOptionBodySchema.parse({})
      expect(parsed.imageUrl).toBeUndefined()
      expect(parsed.imageKey).toBeUndefined()
    })

    it("accepts empty image strings so admins can remove an image", () => {
      const parsed = updateWeeklyMealOptionBodySchema.parse({
        imageUrl: "",
        imageKey: "",
      })
      expect(parsed.imageUrl).toBe("")
      expect(parsed.imageKey).toBe("")
    })

    it("accepts featuredInMenuPreview", () => {
      const parsed = updateWeeklyMealOptionBodySchema.parse({
        featuredInMenuPreview: true,
      })
      expect(parsed.featuredInMenuPreview).toBe(true)
    })

    it("accepts a valid image URL/key", () => {
      const parsed = updateWeeklyMealOptionBodySchema.parse({
        imageUrl: "https://example.com/weekly-meal-images/abc/xyz.jpg",
        imageKey: "weekly-meal-images/abc/xyz.jpg",
      })
      expect(parsed.imageUrl).toContain("/weekly-meal-images/")
      expect(parsed.imageKey).toBe("weekly-meal-images/abc/xyz.jpg")
    })

    it("accepts proteinGrams on update body", () => {
      const parsed = updateWeeklyMealOptionBodySchema.parse({
        proteinGrams: 30,
      })
      expect(parsed.proteinGrams).toBe(30)
    })
  })
})
