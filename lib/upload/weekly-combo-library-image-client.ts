import { uploadMenuImage } from "@/lib/upload/menu-image-client"

export async function uploadWeeklyComboLibraryImage(file: File, weeklyComboLibraryId?: string) {
  return uploadMenuImage({
    endpoint: "/api/admin/weekly-combo-library/image",
    file,
    identifier: weeklyComboLibraryId,
    identifierField: "weeklyComboLibraryId",
  })
}
