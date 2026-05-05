"use client"

import { useState } from "react"
import { Check, Edit, Languages, Package, Plus, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DailyComboMetadataFields,
  DailyComboLibraryFormDialog,
  DailyComboLibraryPickerDialog,
} from "@/features/admin-daily-combo-library"
import { mapDailyMenuComboToDailyLibraryDraft } from "@/lib/combo-library/daily/adapters"
import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ComboImageEditor } from "./combo-image-editor"
import { sortDaysByWeekAndName } from "./helpers"
import type { ComboItem, DayData, EditingDishState, EditingDishTranslationState } from "./types"

interface DailyMenuCombosTabProps {
  days: Record<string, DayData>
  availableTags: string[]
  dishTranslations: Record<string, string>
  selectedDay: string
  setSelectedDay: (dayId: string) => void
  editingCombo: string | null
  setEditingCombo: (comboId: string | null) => void
  newTag: string
  setNewTag: (value: string) => void
  newDish: string
  setNewDish: (value: string) => void
  bulkDishes: string
  setBulkDishes: (value: string) => void
  editingDish: EditingDishState | null
  setEditingDish: (value: EditingDishState | null) => void
  editedDishName: string
  setEditedDishName: (value: string) => void
  editingDishTranslation: EditingDishTranslationState | null
  dishTranslationInput: string
  setDishTranslationInput: (value: string) => void
  updateCombo: (dayId: string, comboId: string, updatedCombo: Partial<ComboItem>) => void
  saveComboChanges: (dayId: string, comboId: string) => Promise<boolean>
  addTagToCombo: (dayId: string, comboId: string, tag: string) => void
  removeTagFromCombo: (dayId: string, comboId: string, tag: string) => void
  addDishToCombo: (dayId: string, comboId: string, dish: string, type: "typeA" | "typeB") => void
  removeDishFromCombo: (dayId: string, comboId: string, dish: string, type: "typeA" | "typeB") => void
  updateDishName: (
    dayId: string,
    comboId: string,
    oldDishName: string,
    nextDishName: string,
    type: "typeA" | "typeB"
  ) => Promise<void>
  handleStartDishTranslation: (dishName: string) => void
  handleCancelDishTranslation: () => void
  handleSaveDishTranslation: (dishName: string) => Promise<void>
  addNewTag: () => Promise<void>
  addCombo: () => Promise<void>
  addComboFromLibrary: (item: DailyComboLibraryItem) => Promise<void>
  deleteCombo: (comboId: string) => Promise<void>
  bulkAddDishes: (comboId: string, type: "typeA" | "typeB") => void
  syncDishesToTypeB: (dayId: string, comboId: string) => void
}

function DishEditor({
  comboId,
  dish,
  index,
  type,
  editingDish,
  setEditingDish,
  editedDishName,
  setEditedDishName,
  editingDishTranslation,
  dishTranslationInput,
  setDishTranslationInput,
  translatedLabel,
  onStartTranslation,
  onCancelTranslation,
  onSaveTranslation,
  onRename,
  onRemove,
}: {
  comboId: string
  dish: string
  index: number
  type: "typeA" | "typeB"
  editingDish: EditingDishState | null
  setEditingDish: (value: EditingDishState | null) => void
  editedDishName: string
  setEditedDishName: (value: string) => void
  editingDishTranslation: EditingDishTranslationState | null
  dishTranslationInput: string
  setDishTranslationInput: (value: string) => void
  translatedLabel?: string
  onStartTranslation: (dish: string) => void
  onCancelTranslation: () => void
  onSaveTranslation: (dish: string) => void
  onRename: (dish: string) => void
  onRemove: (dish: string) => void
}) {
  const isEditingDish =
    editingDish?.comboId === comboId && editingDish?.dish === dish && editingDish?.type === type
  const isEditingTranslation = editingDishTranslation?.dish === dish

  return (
    <div className="space-y-2 rounded-md border bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <span className="font-medium text-muted-foreground">{index + 1}.</span>
          {isEditingDish ? (
            <Input
              value={editedDishName}
              onChange={(e) => setEditedDishName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  onRename(dish)
                }
              }}
              autoFocus
            />
          ) : (
            <span>{dish}</span>
          )}
        </div>

        <div className="flex gap-1">
          {isEditingDish ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => onRename(dish)} className="text-green-600">
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingDish(null)
                  setEditedDishName("")
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={() => onStartTranslation(dish)}>
                <Languages className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingDish({ comboId, dish, type })
                  setEditedDishName(dish)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onRemove(dish)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditingTranslation ? (
        <div className="flex items-center gap-2 pl-7">
          <Input
            autoFocus
            placeholder="Enter English translation..."
            value={dishTranslationInput}
            onChange={(e) => setDishTranslationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onSaveTranslation(dish)
              } else if (e.key === "Escape") {
                onCancelTranslation()
              }
            }}
            className="h-8 text-sm"
          />
          <Button variant="ghost" size="sm" onClick={onCancelTranslation}>
            Cancel
          </Button>
        </div>
      ) : translatedLabel ? (
        <div className="pl-7 text-xs italic text-muted-foreground">{translatedLabel}</div>
      ) : null}
    </div>
  )
}

function ComboDishPreview({ combo }: { combo: ComboItem }) {
  return (
    <CardContent className="grid gap-4 pt-4 lg:grid-cols-2">
      {(["typeA", "typeB"] as const).map((type) => (
        <div
          key={type}
          className={`space-y-3 rounded-md p-4 ${
            type === "typeA" ? "bg-blue-50" : "bg-green-50"
          }`}
        >
          <h4 className="flex items-center font-medium">
            <Package className="mr-2 h-4 w-4" />
            {type === "typeA" ? "2-Dish Voucher Option" : "3-Dish Voucher Option"}
          </h4>
          {combo[type].dishes.length > 0 ? (
            <ol className="space-y-2">
              {combo[type].dishes.map((dish, index) => (
                <li key={`${combo.id}-${type}-${dish}-${index}`} className="rounded-md border bg-white p-2 text-sm">
                  <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                  {dish}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No dishes added.</p>
          )}
        </div>
      ))}
    </CardContent>
  )
}

export function DailyMenuCombosTab(props: DailyMenuCombosTabProps) {
  const sortedDays = sortDaysByWeekAndName(Object.entries(props.days))
  const selectedDayData = props.days[props.selectedDay]
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saveAsLibraryCombo, setSaveAsLibraryCombo] = useState<Partial<DailyComboLibraryItem> | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Combo & Dish Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <Label htmlFor="day-select" className="font-medium">
                Select Day
              </Label>
              <Select value={props.selectedDay} onValueChange={props.setSelectedDay}>
                <SelectTrigger id="day-select" className="mt-1 w-full sm:w-[280px]">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {sortedDays.map(([dayId, day]) => (
                    <SelectItem key={dayId} value={dayId}>
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{day.displayName}</span>
                        <Badge variant="outline">{day.week === 1 ? "This Week" : "Next Week"}</Badge>
                        <span className="text-xs text-muted-foreground">{day.date}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPickerOpen(true)}
                disabled={!props.selectedDay}
              >
                <Package className="mr-2 h-4 w-4" />
                从套餐素材库选择
              </Button>
              <Button onClick={() => void props.addCombo()}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Combo
              </Button>
            </div>
          </div>

          {!selectedDayData ? (
            <p className="text-sm text-muted-foreground">Select a day to manage combos.</p>
          ) : (
            selectedDayData.combos.map((combo) => (
              <Card key={combo.id} className="border">
                <CardHeader className="bg-muted/50 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{combo.name}</CardTitle>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">{combo.calories} KCAL</span>
                        {combo.sourceComboLibraryId ? (
                          <Badge variant="outline">来源: 素材库 / {combo.sourceComboLibraryId}</Badge>
                        ) : null}
                        {combo.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {props.editingCombo === combo.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600"
                            onClick={async () => {
                              if (combo.calories === 0) {
                                return
                              }
                              const success = await props.saveComboChanges(props.selectedDay, combo.id)
                              if (success) {
                                props.setEditingCombo(null)
                              }
                            }}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => props.setEditingCombo(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => props.setEditingCombo(combo.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSaveAsLibraryCombo(
                                mapDailyMenuComboToDailyLibraryDraft(combo, props.dishTranslations)
                              )
                            }
                          >
                            另存为素材库套餐
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${combo.name}?`)) {
                                void props.deleteCombo(combo.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {props.editingCombo === combo.id ? (
                  <CardContent className="space-y-6 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Combo Name</Label>
                        <Input
                          value={combo.name}
                          onChange={(e) =>
                            props.updateCombo(props.selectedDay, combo.id, { name: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <ComboImageEditor
                      combo={combo}
                      onChange={(updates) => props.updateCombo(props.selectedDay, combo.id, updates)}
                    />

                    <DailyComboMetadataFields
                      value={combo}
                      onChange={(updates) => props.updateCombo(props.selectedDay, combo.id, updates)}
                    />

                    <div className="grid gap-6 lg:grid-cols-2">
                      {(["typeA", "typeB"] as const).map((type) => (
                        <div
                          key={type}
                          className={`space-y-3 rounded-md p-4 ${
                            type === "typeA" ? "bg-blue-50" : "bg-green-50"
                          }`}
                        >
                          <h4 className="flex items-center font-medium">
                            <Package className="mr-2 h-4 w-4" />
                            {type === "typeA" ? "2-Dish Voucher Option" : "3-Dish Voucher Option"}
                          </h4>

                          <div className="space-y-2">
                            {combo[type].dishes.map((dish, index) => (
                              <DishEditor
                                key={`${combo.id}-${type}-${dish}`}
                                comboId={combo.id}
                                dish={dish}
                                index={index}
                                type={type}
                                editingDish={props.editingDish}
                                setEditingDish={props.setEditingDish}
                                editedDishName={props.editedDishName}
                                setEditedDishName={props.setEditedDishName}
                                editingDishTranslation={props.editingDishTranslation}
                                dishTranslationInput={props.dishTranslationInput}
                                setDishTranslationInput={props.setDishTranslationInput}
                                translatedLabel={props.dishTranslations[dish]}
                                onStartTranslation={props.handleStartDishTranslation}
                                onCancelTranslation={props.handleCancelDishTranslation}
                                onSaveTranslation={(currentDish) =>
                                  void props.handleSaveDishTranslation(currentDish)
                                }
                                onRename={(currentDish) =>
                                  void props.updateDishName(
                                    props.selectedDay,
                                    combo.id,
                                    currentDish,
                                    props.editedDishName,
                                    type
                                  )
                                }
                                onRemove={(currentDish) =>
                                  props.removeDishFromCombo(props.selectedDay, combo.id, currentDish, type)
                                }
                              />
                            ))}
                          </div>

                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                placeholder={`Add new dish to ${type === "typeA" ? "2" : "3"}-dish option`}
                                value={props.newDish}
                                onChange={(e) => props.setNewDish(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && props.newDish.trim()) {
                                    e.preventDefault()
                                    props.addDishToCombo(props.selectedDay, combo.id, props.newDish, type)
                                    props.setNewDish("")
                                  }
                                }}
                              />
                              <Button
                                variant="outline"
                                onClick={() => {
                                  if (props.newDish.trim()) {
                                    props.addDishToCombo(props.selectedDay, combo.id, props.newDish, type)
                                    props.setNewDish("")
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>

                            {type === "typeA" && (
                              <>
                                <textarea
                                  placeholder="Paste multiple dishes separated by tab, comma, or newline"
                                  value={props.bulkDishes}
                                  onChange={(e) => props.setBulkDishes(e.target.value)}
                                  className="h-20 w-full rounded-md border px-3 py-2 text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => props.bulkAddDishes(combo.id, type)}>
                                    <Plus className="mr-1 h-3 w-3" />
                                    Add All Dishes
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => props.syncDishesToTypeB(props.selectedDay, combo.id)}
                                  >
                                    Sync to 3-Dish Option
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                ) : (
                  <ComboDishPreview combo={combo} />
                )}
              </Card>
            ))
          )}
        </div>

        <DailyComboLibraryPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={props.addComboFromLibrary}
        />
        <DailyComboLibraryFormDialog
          open={Boolean(saveAsLibraryCombo)}
          onOpenChange={(open) => {
            if (!open) setSaveAsLibraryCombo(null)
          }}
          item={saveAsLibraryCombo}
        />
      </CardContent>
    </Card>
  )
}
