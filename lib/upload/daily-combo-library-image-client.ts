import { uploadMenuImage } from "@/lib/upload/menu-image-client"

export async function uploadDailyComboLibraryImage(file: File, dailyComboLibraryId?: string) {
  return uploadMenuImage({
    endpoint: "/api/admin/daily-combo-library/image",
    file,
    identifier: dailyComboLibraryId,
    identifierField: "dailyComboLibraryId",
  })
}
