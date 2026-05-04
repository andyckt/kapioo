"use client"

import { useEffect, useState } from "react"

import { MenuImageEditor } from "@/components/admin/menu-image-editor"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  DAILY_COMBO_LIBRARY_FIELDS,
  type DailyComboLibraryFieldKey,
} from "@/lib/combo-library/daily/fields"
import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"
import { getFieldDefinition } from "@/lib/combo-library/shared/fields"
import { uploadDailyComboLibraryImage } from "@/lib/upload/daily-combo-library-image-client"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Partial<DailyComboLibraryItem> | null
  onSaved?: (item: DailyComboLibraryItem) => void
}

const EMPTY_FORM: Partial<DailyComboLibraryItem> = {
  internalName: "",
  typeADishes: [],
  typeBDishes: [],
  tags: [],
  calories: 0,
  status: "active",
}

function joinLines(values?: string[]) {
  return (values ?? []).join("\n")
}

function splitLines(value: string) {
  return value.split(/\n|;/).map((item) => item.trim()).filter(Boolean)
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
      typeBDishes: item?.typeBDishes ?? [],
      tags: item?.tags ?? [],
      status: item?.status ?? "active",
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
            <div className="space-y-2">
              <Label>{field("calories").label}</Label>
              <Input type="number" value={form.calories ?? 0} onChange={(event) => setForm((current) => ({ ...current, calories: Number(event.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>{field("tags").label}</Label>
              <Input
                value={(form.tags ?? []).join("; ")}
                onChange={(event) => setForm((current) => ({ ...current, tags: splitLines(event.target.value) }))}
                placeholder={field("tags").placeholder}
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{field("typeADishes").label}</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, typeBDishes: current.typeADishes ?? [] }))}>Copy A to B</Button>
            </div>
            <Textarea rows={6} value={joinLines(form.typeADishes)} placeholder={field("typeADishes").placeholder} onChange={(event) => setForm((current) => ({ ...current, typeADishes: splitLines(event.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label>{field("typeBDishes").label}</Label>
            <Textarea rows={6} value={joinLines(form.typeBDishes)} placeholder={field("typeBDishes").placeholder} onChange={(event) => setForm((current) => ({ ...current, typeBDishes: splitLines(event.target.value) }))} />
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
