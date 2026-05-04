"use client"

import { useEffect, useState } from "react"

import { MenuImageEditor } from "@/components/admin/menu-image-editor"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"
import { uploadDailyComboLibraryImage } from "@/lib/upload/daily-combo-library-image-client"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Partial<DailyComboLibraryItem> | null
  onSaved?: (item: DailyComboLibraryItem) => void
}

const EMPTY_FORM: Partial<DailyComboLibraryItem> = {
  name: "",
  typeADishes: [],
  typeBDishes: [],
  tags: [],
  allergens: [],
  dietaryTags: [],
  vegetables: [],
  calories: 0,
  status: "active",
}

function joinLines(values?: string[]) {
  return (values ?? []).join("\n")
}

function splitLines(value: string) {
  return value.split(/\n|;/).map((item) => item.trim()).filter(Boolean)
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
      allergens: item?.allergens ?? [],
      dietaryTags: item?.dietaryTags ?? [],
      vegetables: item?.vegetables ?? [],
      status: item?.status ?? "active",
    })
  }, [item, open])

  const save = async () => {
    if (!form.name?.trim()) {
      toast({ title: "Missing name", description: "Combo name is required.", variant: "destructive" })
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
          body: JSON.stringify(form),
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
              <Label>Name</Label>
              <Input value={form.name ?? ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>English Name</Label>
              <Input value={form.nameEn ?? ""} onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Calories</Label>
              <Input type="number" value={form.calories ?? 0} onChange={(event) => setForm((current) => ({ ...current, calories: Number(event.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Tags (semicolon separated)</Label>
              <Input value={(form.tags ?? []).join("; ")} onChange={(event) => setForm((current) => ({ ...current, tags: splitLines(event.target.value) }))} />
            </div>
          </div>
          <MenuImageEditor
            label="Daily Library Image"
            altText={`${form.name || "combo"} preview`}
            imageUrl={form.imageUrl}
            uploadImage={(file) => uploadDailyComboLibraryImage(file, form.dailyComboLibraryId)}
            onChange={(next) => setForm((current) => ({ ...current, imageUrl: next.imageUrl, imageKey: next.imageKey }))}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Type A · 2-dish voucher</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, typeBDishes: current.typeADishes ?? [] }))}>Copy A to B</Button>
            </div>
            <Textarea rows={6} value={joinLines(form.typeADishes)} onChange={(event) => setForm((current) => ({ ...current, typeADishes: splitLines(event.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label>Type B · 3-dish voucher</Label>
            <Textarea rows={6} value={joinLines(form.typeBDishes)} onChange={(event) => setForm((current) => ({ ...current, typeBDishes: splitLines(event.target.value) }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
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
