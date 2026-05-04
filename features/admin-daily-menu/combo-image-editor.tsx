"use client"

import { MenuImageEditor } from "@/components/admin/menu-image-editor"
import { uploadComboImage } from "@/lib/upload/combo-image-client"

import type { ComboItem } from "./types"

type ComboImageEditorProps = {
  combo: ComboItem
  onChange: (updates: Pick<ComboItem, "imageUrl" | "imageKey">) => void
}

/**
 * Thin wrapper around MenuImageEditor for daily combos. Delegates the actual
 * UI/UX to the shared component so daily and weekly stay perfectly aligned.
 */
export function ComboImageEditor({ combo, onChange }: ComboImageEditorProps) {
  return (
    <MenuImageEditor
      label="Combo Image"
      altText={`${combo.name} combo preview`}
      imageUrl={combo.imageUrl}
      uploadImage={(file) => uploadComboImage(file, combo.comboId || combo.id)}
      onChange={onChange}
      emptyTitle="Upload combo photo"
    />
  )
}
