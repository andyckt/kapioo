"use client"

import { useEffect, useState } from "react"

import { MenuImageEditor } from "@/components/admin/menu-image-editor"
import { DelimitedArrayField } from "@/components/admin/delimited-array-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  DAILY_COMBO_LIBRARY_FIELDS,
  type DailyComboLibraryFieldKey,
} from "@/lib/combo-library/daily/fields"
import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"
import { getFieldDefinition } from "@/lib/combo-library/shared/fields"
import { uploadDailyComboLibraryImage } from "@/lib/upload/daily-combo-library-image-client"
import { DailyComboMetadataFields } from "./daily-combo-metadata-fields"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Partial<DailyComboLibraryItem> | null
  onSaved?: (item: DailyComboLibraryItem) => void
}

const EMPTY_FORM: Partial<DailyComboLibraryItem> = {
  internalName: "",
  typeADishes: [],
  typeADishesEn: [],
  typeBDishes: [],
  typeBDishesEn: [],
  tags: [],
  tagsEn: [],
  allergensZh: [],
  allergensEn: [],
  calories: 0,
  proteinGrams: undefined,
}

function field(key: DailyComboLibraryFieldKey) {
  return getFieldDefinition(DAILY_COMBO_LIBRARY_FIELDS, key)
}

export function DailyComboLibraryFormDialog({ open, onOpenChange, item, onSaved }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState<Partial<DailyComboLibraryItem>>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      ...EMPTY_FORM,
      ...(item ?? {}),
      typeADishes: item?.typeADishes ?? [],
      typeADishesEn: item?.typeADishesEn ?? [],
      typeBDishes: item?.typeBDishes ?? [],
      typeBDishesEn: item?.typeBDishesEn ?? [],
      tags: item?.tags ?? [],
      tagsEn: item?.tagsEn ?? [],
      allergensZh: item?.allergensZh ?? [],
      allergensEn: item?.allergensEn ?? [],
    })
  }, [item, open])

  const save = async () => {
    if (!form.internalName?.trim()) {
      toast({ title: "Missing internal name", description: "Internal name is required.", variant: "destructive" })
      return
    }
    if (!form.typeADishes?.length || !form.typeBDishes?.length) {
      toast({ title: "Missing dishes", description: "Daily combos require Type A and Type B dishes.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const isEdit = Boolean(form.dailyComboLibraryId)
      const response = await fetch(
        isEdit
          ? `/api/admin/daily-combo-library/${encodeURIComponent(form.dailyComboLibraryId!)}`
          : "/api/admin/daily-combo-library",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, name: form.internalName }),
        }
      )
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to save combo")
      toast({ title: "Saved", description: "Daily combo library item saved." })
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
          <DialogTitle>{form.dailyComboLibraryId ? "Edit Daily Combo" : "New Daily Combo"}</DialogTitle>
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
          </div>
          <MenuImageEditor
            label="Daily Library Image"
            altText={`${form.internalName || "combo"} preview`}
            imageUrl={form.imageUrl}
            uploadImage={(file) => uploadDailyComboLibraryImage(file, form.dailyComboLibraryId)}
            onChange={(next) => setForm((current) => ({ ...current, imageUrl: next.imageUrl, imageKey: next.imageKey }))}
          />
        </div>
        <DailyComboMetadataFields
          value={form}
          onChange={(updates) => setForm((current) => ({ ...current, ...updates }))}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{field("typeADishes").label}</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, typeBDishes: current.typeADishes ?? [] }))}>Copy A to B</Button>
            </div>
            <DelimitedArrayField multiline rows={6} value={form.typeADishes} placeholder={field("typeADishes").placeholder} onChange={(typeADishes) => setForm((current) => ({ ...current, typeADishes }))} />
          </div>
          <div className="space-y-2">
            <Label>{field("typeBDishes").label}</Label>
            <DelimitedArrayField multiline rows={6} value={form.typeBDishes} placeholder={field("typeBDishes").placeholder} onChange={(typeBDishes) => setForm((current) => ({ ...current, typeBDishes }))} />
          </div>
          <div className="space-y-2">
            <Label>{field("typeADishesEn").label}</Label>
            <DelimitedArrayField multiline rows={5} value={form.typeADishesEn} placeholder={field("typeADishesEn").placeholder} onChange={(typeADishesEn) => setForm((current) => ({ ...current, typeADishesEn }))} />
          </div>
          <div className="space-y-2">
            <Label>{field("typeBDishesEn").label}</Label>
            <DelimitedArrayField multiline rows={5} value={form.typeBDishesEn} placeholder={field("typeBDishesEn").placeholder} onChange={(typeBDishesEn) => setForm((current) => ({ ...current, typeBDishesEn }))} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
