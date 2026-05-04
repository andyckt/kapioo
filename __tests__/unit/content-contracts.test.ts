import { comboBodySchema } from "@/lib/contracts/content"

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
})
