import { uploadMenuImage } from "@/lib/upload/menu-image-client"

export async function uploadComboImage(file: File, comboId?: string) {
  return uploadMenuImage({
    endpoint: "/api/admin/combo-image",
    file,
    identifier: comboId,
    identifierField: "comboId",
  })
}
