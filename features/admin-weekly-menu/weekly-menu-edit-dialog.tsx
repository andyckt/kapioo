"use client"

import type { KeyboardEvent } from "react"

import { Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { MealOption } from "@/lib/weekly-subscription"

import { WeeklyMealImageEditor } from "./weekly-meal-image-editor"

type WeeklyMenuEditDialogProps = {
  editingMeal: MealOption | null
  onOpenChange: (open: boolean) => void
  onRemoveTag: (index: number) => void
  onSave: () => void
  onSaveAsLibraryCombo?: () => void
  onUpdateMeal: (meal: MealOption) => void
  open: boolean
}

export function WeeklyMenuEditDialog({
  editingMeal,
  onOpenChange,
  onRemoveTag,
  onSave,
  onSaveAsLibraryCombo,
  onUpdateMeal,
  open,
}: WeeklyMenuEditDialogProps) {
  const handleEnterToSave = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      onSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Meal Option</DialogTitle>
          <DialogDescription>Make changes to the meal option details below.</DialogDescription>
        </DialogHeader>
        {editingMeal ? (
          <div className="grid gap-4 py-4">
            {editingMeal.sourceComboLibraryId ? (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                来源: 素材库 / {editingMeal.sourceComboLibraryId}
              </div>
            ) : null}
            <WeeklyMealImageEditor
              option={editingMeal}
              onChange={(updates) =>
                onUpdateMeal({
                  ...editingMeal,
                  imageUrl: updates.imageUrl || undefined,
                  imageKey: updates.imageKey || undefined,
                })
              }
            />
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
              <Label htmlFor="meal-name" className="sm:text-right">
                Name (Chinese)
              </Label>
              <Input
                id="meal-name"
                value={editingMeal.name}
                onChange={(event) => onUpdateMeal({ ...editingMeal, name: event.target.value })}
                onKeyDown={handleEnterToSave}
                className="sm:col-span-3"
                placeholder="e.g., 红烧肉"
              />
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
              <Label htmlFor="meal-name-en" className="sm:text-right">
                Name (English)
              </Label>
              <Input
                id="meal-name-en"
                value={editingMeal.nameEn || ""}
                onChange={(event) => onUpdateMeal({ ...editingMeal, nameEn: event.target.value })}
                onKeyDown={handleEnterToSave}
                className="sm:col-span-3"
                placeholder="e.g., Braised Pork Belly"
              />
            </div>
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:gap-4">
              <Label htmlFor="meal-tags" className="sm:pt-2 sm:text-right">
                Tags
              </Label>
              <div className="space-y-2 sm:col-span-3">
                <div className="flex flex-wrap gap-2">
                  {editingMeal.tags?.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => onRemoveTag(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="meal-tags"
                  placeholder="Type a tag and press Enter"
                  className="w-full"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && event.currentTarget.value.trim()) {
                      event.preventDefault()
                      const newTag = event.currentTarget.value.trim()
                      if (!editingMeal.tags || !editingMeal.tags.includes(newTag)) {
                        onUpdateMeal({
                          ...editingMeal,
                          tags: [...(editingMeal.tags || []), newTag],
                        })
                        event.currentTarget.value = ""
                      }
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Press Enter to add a tag</p>
              </div>
            </div>
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
              <Label htmlFor="meal-calories" className="sm:text-right">
                Calories
              </Label>
              <Input
                id="meal-calories"
                type="number"
                value={editingMeal.calories ?? ""}
                onChange={(event) =>
                  onUpdateMeal({
                    ...editingMeal,
                    calories: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:gap-4">
              <Label htmlFor="meal-allergens" className="sm:pt-2 sm:text-right">
                Allergens
              </Label>
              <Input
                id="meal-allergens"
                value={(editingMeal.allergens || []).join("; ")}
                onChange={(event) =>
                  onUpdateMeal({
                    ...editingMeal,
                    allergens: event.target.value
                      .split(";")
                      .map((allergen) => allergen.trim())
                      .filter(Boolean),
                  })
                }
                className="sm:col-span-3"
                placeholder="soy; sesame"
              />
            </div>
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:gap-4">
              <Label htmlFor="meal-description" className="sm:pt-2 sm:text-right">
                Description
              </Label>
              <Textarea
                id="meal-description"
                value={editingMeal.description || ""}
                onChange={(event) => onUpdateMeal({ ...editingMeal, description: event.target.value })}
                className="sm:col-span-3"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="meal-carousel-preview" className="pt-2 text-right">
                Carousel preview
              </Label>
              <div className="col-span-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="meal-carousel-preview"
                    checked={Boolean(editingMeal.featuredInMenuPreview)}
                    disabled={!editingMeal.imageUrl?.trim()}
                    onCheckedChange={(checked) =>
                      onUpdateMeal({ ...editingMeal, featuredInMenuPreview: checked })
                    }
                  />
                  <Label htmlFor="meal-carousel-preview" className="text-sm font-normal">
                    Include on weekly product carousel
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Turn on after the combo has a photo. When any combo is flagged in the Weekly Menu Box,
                  only flagged combos appear on the `/weekly-meal` preview strip. If none are flagged in the
                  current menu yet, photos with meals keep showing automatically (prior behaviour).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="meal-active" className="text-right">
                Active
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="meal-active"
                  checked={editingMeal.active}
                  onCheckedChange={(checked) => onUpdateMeal({ ...editingMeal, active: checked })}
                />
                <Label htmlFor="meal-active" className="ml-2">
                  {editingMeal.active ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          {editingMeal && onSaveAsLibraryCombo ? (
            <Button variant="outline" onClick={onSaveAsLibraryCombo}>
              Save as library combo
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
