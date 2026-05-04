"use client"

import { useCallback, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

import { useToast } from "@/hooks/use-toast"

import { createDefaultCombo } from "./helpers"
import type {
  ComboItem,
  DayData,
  EditingDishState,
  EditingDishTranslationState,
} from "./types"

interface UseComboEditingArgs {
  days: Record<string, DayData>
  setDays: Dispatch<SetStateAction<Record<string, DayData>>>
  availableTags: string[]
  setAvailableTags: Dispatch<SetStateAction<string[]>>
  dishTranslations: Record<string, string>
  setDishTranslations: Dispatch<SetStateAction<Record<string, string>>>
}

type DishSlot = "typeA" | "typeB"

function parseBulkDishes(input: string) {
  const lines = input.split("\n").filter((line) => line.trim())
  const allDishes: string[] = []

  lines.forEach((line) => {
    const parts = line.includes("\t")
      ? line.split("\t")
      : line.includes(",")
        ? line.split(/,(?![^(]*\))/)
        : [line]

    parts.forEach((dish) => {
      const cleaned = dish.trim()
      if (cleaned) {
        allDishes.push(cleaned)
      }
    })
  })

  return allDishes
}

export function useComboEditing({
  days,
  setDays,
  availableTags,
  setAvailableTags,
  dishTranslations,
  setDishTranslations,
}: UseComboEditingArgs) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [selectedDay, setSelectedDay] = useState<string>("")
  const [editingCombo, setEditingCombo] = useState<string | null>(null)
  const [newTag, setNewTag] = useState("")
  const [newDish, setNewDish] = useState("")
  const [bulkDishes, setBulkDishes] = useState("")
  const [editingDish, setEditingDish] = useState<EditingDishState | null>(null)
  const [editedDishName, setEditedDishName] = useState("")
  const [editingDishTranslation, setEditingDishTranslation] =
    useState<EditingDishTranslationState | null>(null)
  const [dishTranslationInput, setDishTranslationInput] = useState("")

  const updateCombo = useCallback((dayId: string, comboId: string, updatedCombo: Partial<ComboItem>) => {
    setDays((prevDays) => {
      const day = prevDays[dayId]
      if (!day) return prevDays

      return {
        ...prevDays,
        [dayId]: {
          ...day,
          combos: day.combos.map((combo) =>
            combo.id === comboId ? { ...combo, ...updatedCombo } : combo
          ),
        },
      }
    })
  }, [setDays])

  const saveComboChanges = useCallback(async (dayId: string, comboId: string) => {
    try {
      const day = days[dayId]
      const combo = day?.combos.find((item) => item.id === comboId)
      if (!combo) return false

      const response = await fetch(`/api/combos/${comboId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: combo.name,
          calories: combo.calories,
          tags: combo.tags,
          typeA: combo.typeA,
          typeB: combo.typeB,
          imageUrl: combo.imageUrl ?? "",
          imageKey: combo.imageKey ?? "",
        }),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to update combo")
      }

      toastRef.current({
        title: "Success",
        description: "Combo updated successfully",
      })
      return true
    } catch (error) {
      console.error("Error updating combo:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to update combo: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
      return false
    }
  }, [days])

  const addTagToCombo = useCallback((dayId: string, comboId: string, tag: string) => {
    if (!tag) return

    setDays((prev) => {
      const day = prev[dayId]
      if (!day) return prev

      return {
        ...prev,
        [dayId]: {
          ...day,
          combos: day.combos.map((combo) =>
            combo.id === comboId && !combo.tags.includes(tag)
              ? { ...combo, tags: [...combo.tags, tag] }
              : combo
          ),
        },
      }
    })
  }, [setDays])

  const removeTagFromCombo = useCallback((dayId: string, comboId: string, tagToRemove: string) => {
    setDays((prev) => {
      const day = prev[dayId]
      if (!day) return prev

      return {
        ...prev,
        [dayId]: {
          ...day,
          combos: day.combos.map((combo) =>
            combo.id === comboId
              ? { ...combo, tags: combo.tags.filter((tag) => tag !== tagToRemove) }
              : combo
          ),
        },
      }
    })
  }, [setDays])

  const addDishToCombo = useCallback((dayId: string, comboId: string, dish: string, type: DishSlot) => {
    if (!dish.trim()) return

    setDays((prev) => {
      const day = prev[dayId]
      if (!day) return prev

      return {
        ...prev,
        [dayId]: {
          ...day,
          combos: day.combos.map((combo) =>
            combo.id === comboId && !combo[type].dishes.includes(dish)
              ? {
                  ...combo,
                  [type]: {
                    ...combo[type],
                    dishes: [...combo[type].dishes, dish],
                  },
                }
              : combo
          ),
        },
      }
    })
  }, [setDays])

  const removeDishFromCombo = useCallback((dayId: string, comboId: string, dishToRemove: string, type: DishSlot) => {
    setDays((prev) => {
      const day = prev[dayId]
      if (!day) return prev

      return {
        ...prev,
        [dayId]: {
          ...day,
          combos: day.combos.map((combo) =>
            combo.id === comboId
              ? {
                  ...combo,
                  [type]: {
                    ...combo[type],
                    dishes: combo[type].dishes.filter((dish) => dish !== dishToRemove),
                  },
                }
              : combo
          ),
        },
      }
    })
  }, [setDays])

  const updateDishName = useCallback(async (dayId: string, comboId: string, oldDishName: string, nextDishName: string, type: DishSlot) => {
    if (oldDishName === nextDishName) {
      setEditingDish(null)
      setEditedDishName("")
      return
    }

    try {
      if (dishTranslations[oldDishName]) {
        const translation = dishTranslations[oldDishName]
        await fetch(`/api/dishes/${encodeURIComponent(nextDishName)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nameEn: translation }),
        })
        setDishTranslations((prev) => {
          const next = { ...prev }
          delete next[oldDishName]
          next[nextDishName] = translation
          return next
        })
      }

      setDays((prev) => {
        const day = prev[dayId]
        if (!day) return prev

        return {
          ...prev,
          [dayId]: {
            ...day,
            combos: day.combos.map((combo) =>
              combo.id === comboId
                ? {
                    ...combo,
                    [type]: {
                      ...combo[type],
                      dishes: combo[type].dishes.map((dish) =>
                        dish === oldDishName ? nextDishName : dish
                      ),
                    },
                  }
                : combo
            ),
          },
        }
      })

      await saveComboChanges(dayId, comboId)
      toastRef.current({
        title: "Success",
        description: "Dish updated successfully",
      })
    } catch (error) {
      console.error("Error updating dish:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to update dish: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    } finally {
      setEditingDish(null)
      setEditedDishName("")
    }
  }, [dishTranslations, saveComboChanges, setDays, setDishTranslations])

  const handleStartDishTranslation = useCallback((dishName: string) => {
    setEditingDishTranslation({ dish: dishName })
    setDishTranslationInput(dishTranslations[dishName] || "")
  }, [dishTranslations])

  const handleCancelDishTranslation = useCallback(() => {
    setEditingDishTranslation(null)
    setDishTranslationInput("")
  }, [])

  const handleSaveDishTranslation = useCallback(async (dishName: string) => {
    const trimmedTranslation = dishTranslationInput.trim()
    try {
      const response = await fetch(`/api/dishes/${encodeURIComponent(dishName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameEn: trimmedTranslation }),
      })
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to save translation")
      }

      setDishTranslations((prev) => ({
        ...prev,
        [dishName]: trimmedTranslation,
      }))
      toastRef.current({
        title: "Success",
        description: "English translation saved successfully",
      })
    } catch (error) {
      console.error("Error saving translation:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to save translation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    } finally {
      handleCancelDishTranslation()
    }
  }, [dishTranslationInput, handleCancelDishTranslation, setDishTranslations])

  const addNewTag = useCallback(async () => {
    if (!newTag || availableTags.includes(newTag)) {
      return
    }

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTag }),
      })
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to create tag")
      }

      setAvailableTags((prev) => [...prev, newTag])
      setNewTag("")
      toastRef.current({
        title: "Success",
        description: "Tag created successfully",
      })
    } catch (error) {
      console.error("Error creating tag:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to create tag: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    }
  }, [availableTags, newTag, setAvailableTags])

  const addCombo = useCallback(async () => {
    if (!selectedDay) {
      toastRef.current({
        title: "Error",
        description: "Please select a day first",
        variant: "destructive",
      })
      return
    }

    try {
      const newComboId = `${selectedDay}-combo-${Date.now()}`
      const defaultCombo = createDefaultCombo(newComboId)
      const response = await fetch("/api/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comboId: newComboId,
          dayId: selectedDay,
          name: "新套餐",
          calories: 650,
          tags: ["New"],
          typeA: defaultCombo.typeA,
          typeB: defaultCombo.typeB,
        }),
      })
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to create combo")
      }

      setDays((prev) => {
        const day = prev[selectedDay]
        if (!day) return prev
        return {
          ...prev,
          [selectedDay]: {
            ...day,
            combos: [
              ...day.combos,
              {
                ...defaultCombo,
                name: "新套餐",
                tags: ["New"],
              },
            ],
          },
        }
      })

      setEditingCombo(newComboId)
      toastRef.current({
        title: "Success",
        description: "New combo created successfully",
      })
    } catch (error) {
      console.error("Error creating combo:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to create combo: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    }
  }, [selectedDay, setDays])

  const deleteCombo = useCallback(async (comboId: string) => {
    if (!selectedDay) return

    try {
      const response = await fetch(`/api/combos/${comboId}`, { method: "DELETE" })
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to delete combo")
      }

      setDays((prev) => {
        const day = prev[selectedDay]
        if (!day) return prev
        return {
          ...prev,
          [selectedDay]: {
            ...day,
            combos: day.combos.filter((combo) => combo.id !== comboId),
          },
        }
      })

      toastRef.current({
        title: "Success",
        description: "Combo deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting combo:", error)
      toastRef.current({
        title: "Error",
        description: `Failed to delete combo: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      })
    }
  }, [selectedDay, setDays])

  const bulkAddDishes = useCallback((comboId: string, type: DishSlot) => {
    if (!selectedDay || !bulkDishes.trim()) {
      return
    }

    const dishes = parseBulkDishes(bulkDishes)
    dishes.forEach((dish) => addDishToCombo(selectedDay, comboId, dish, type))
    setBulkDishes("")
    toastRef.current({
      title: "Success",
      description: `Added ${dishes.length} dishes`,
    })
  }, [addDishToCombo, bulkDishes, selectedDay])

  const syncDishesToTypeB = useCallback((dayId: string, comboId: string) => {
    const day = days[dayId]
    const combo = day?.combos.find((item) => item.id === comboId)
    if (!combo) {
      return
    }

    const newTypeBDishes = [...combo.typeA.dishes]
    combo.typeB.dishes.forEach((dish) => {
      if (!newTypeBDishes.includes(dish)) {
        newTypeBDishes.push(dish)
      }
    })

    setDays((prev) => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        combos: prev[dayId].combos.map((item) =>
          item.id === comboId
            ? {
                ...item,
                typeB: {
                  ...item.typeB,
                  dishes: newTypeBDishes,
                },
              }
            : item
        ),
      },
    }))

    void saveComboChanges(dayId, comboId)
    toastRef.current({
      title: "Success",
      description: "Synced 2-dish items to 3-dish option",
    })
  }, [days, saveComboChanges, setDays])

  return {
    selectedDay,
    setSelectedDay,
    editingCombo,
    setEditingCombo,
    newTag,
    setNewTag,
    newDish,
    setNewDish,
    bulkDishes,
    setBulkDishes,
    editingDish,
    setEditingDish,
    editedDishName,
    setEditedDishName,
    editingDishTranslation,
    dishTranslationInput,
    setDishTranslationInput,
    updateCombo,
    saveComboChanges,
    addTagToCombo,
    removeTagFromCombo,
    addDishToCombo,
    removeDishFromCombo,
    updateDishName,
    handleStartDishTranslation,
    handleCancelDishTranslation,
    handleSaveDishTranslation,
    addNewTag,
    addCombo,
    deleteCombo,
    bulkAddDishes,
    syncDishesToTypeB,
  }
}
