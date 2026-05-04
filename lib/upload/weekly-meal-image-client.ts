import { uploadMenuImage } from "@/lib/upload/menu-image-client"

export async function uploadWeeklyMealImage(file: File, optionId?: string) {
  return uploadMenuImage({
    endpoint: "/api/admin/weekly-meal-image",
    file,
    identifier: optionId,
    identifierField: "optionId",
  })
}
