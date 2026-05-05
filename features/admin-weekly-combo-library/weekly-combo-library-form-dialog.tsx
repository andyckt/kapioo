"use client"

import { useEffect, useState } from "react"

import { MenuImageEditor } from "@/components/admin/menu-image-editor"
import { DelimitedArrayField } from "@/components/admin/delimited-array-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getFieldDefinition } from "@/lib/combo-library/shared/fields"
import {
  WEEKLY_COMBO_LIBRARY_FIELDS,
  type WeeklyComboLibraryFieldKey,
} from "@/lib/combo-library/weekly/fields"
import type { WeeklyComboLibraryItem } from "@/lib/combo-library/weekly/types"
import { uploadWeeklyComboLibraryImage } from "@/lib/upload/weekly-combo-library-image-client"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Partial<WeeklyComboLibraryItem> | null
  onSaved?: (item: WeeklyComboLibraryItem) => void
}

const EMPTY_FORM: Partial<WeeklyComboLibraryItem> = {
  internalName: "",
  name: "",
  nameEn: "",
  tags: [],
  allergens: [],
}

function field(key: WeeklyComboLibraryFieldKey) {
  return getFieldDefinition(WEEKLY_COMBO_LIBRARY_FIELDS, key)
}

export function WeeklyComboLibraryFormDialog({ open, onOpenChange, item, onSaved }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState<Partial<WeeklyComboLibraryItem>>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      ...EMPTY_FORM,
      ...(item ?? {}),
      tags: item?.tags ?? [],
      allergens: item?.allergens ?? [],
    })
  }, [item, open])

  const save = async () => {
    if (!form.internalName?.trim()) {
      toast({ title: "Missing internal name", description: "Internal name is required.", variant: "destructive" })
      return
    }
    if (!form.name?.trim()) {
      toast({ title: "Missing Chinese name", description: "Name (Chinese) is required.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const isEdit = Boolean(form.weeklyComboLibraryId)
      const response = await fetch(
        isEdit
          ? `/api/admin/weekly-combo-library/${encodeURIComponent(form.weeklyComboLibraryId!)}`
          : "/api/admin/weekly-combo-library",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      )
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to save combo")
      toast({ title: "Saved", description: "Weekly combo library item saved." })
      onSaved?.(result.data)
      onOpenChange(false)
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Failed to save combo", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{form.weeklyComboLibraryId ? "Edit Weekly Combo" : "New Weekly Combo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{field("internalName").label}</Label>
              <Input
                value={form.internalName ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, internalName: event.target.value }))}
                placeholder={field("internalName").placeholder}
              />
            </div>
            <div className="space-y-2">
              <Label>{field("name").label}</Label>
              <Input
                value={form.name ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={field("name").placeholder}
              />
            </div>
            <div className="space-y-2">
              <Label>{field("nameEn").label}</Label>
              <Input
                value={form.nameEn ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))}
                placeholder={field("nameEn").placeholder}
              />
            </div>
            <div className="space-y-2">
              <Label>{field("calories").label}</Label>
              <Input type="number" value={form.calories ?? ""} onChange={(event) => setForm((current) => ({ ...current, calories: event.target.value ? Number(event.target.value) : undefined }))} />
            </div>
            <div className="space-y-2">
              <Label>{field("tags").label}</Label>
              <DelimitedArrayField
                value={form.tags}
                onChange={(tags) => setForm((current) => ({ ...current, tags }))}
                placeholder={field("tags").placeholder}
              />
            </div>
            <div className="space-y-2">
              <Label>{field("allergens").label}</Label>
              <DelimitedArrayField
                value={form.allergens}
                onChange={(allergens) => setForm((current) => ({ ...current, allergens }))}
                placeholder={field("allergens").placeholder}
              />
            </div>
          </div>
          <MenuImageEditor
            label="Weekly Library Image"
            altText={`${form.internalName || "combo"} preview`}
            imageUrl={form.imageUrl}
            uploadImage={(file) => uploadWeeklyComboLibraryImage(file, form.weeklyComboLibraryId)}
            onChange={(next) => setForm((current) => ({ ...current, imageUrl: next.imageUrl, imageKey: next.imageKey }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{field("description").label}</Label>
          <Textarea value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
