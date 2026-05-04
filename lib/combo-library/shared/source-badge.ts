export function getComboLibrarySourceBadge(sourceComboLibraryId?: string | null) {
  if (!sourceComboLibraryId) {
    return null
  }

  return {
    label: "来源: 素材库",
    sourceComboLibraryId,
  }
}
