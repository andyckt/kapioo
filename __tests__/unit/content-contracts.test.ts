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
      })
      expect(parsed.imageUrl).toContain("/weekly-meal-images/")
      expect(parsed.imageKey).toBe("weekly-meal-images/x/y.jpg")
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

    it("accepts a valid image URL/key", () => {
      const parsed = updateWeeklyMealOptionBodySchema.parse({
        imageUrl: "https://example.com/weekly-meal-images/abc/xyz.jpg",
        imageKey: "weekly-meal-images/abc/xyz.jpg",
      })
      expect(parsed.imageUrl).toContain("/weekly-meal-images/")
      expect(parsed.imageKey).toBe("weekly-meal-images/abc/xyz.jpg")
    })
  })
})
