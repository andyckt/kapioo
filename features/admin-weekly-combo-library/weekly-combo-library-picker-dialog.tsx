"use client"

import { useMemo, useState } from "react"

import { ComboLibraryThumbnail } from "@/components/admin/combo-library-thumbnail"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { COMBO_LIBRARY_MULTI_INSERT_MAX } from "@/lib/combo-library/shared/constants"
import type { WeeklyComboLibraryItem } from "@/lib/combo-library/weekly/types"

import { useWeeklyComboLibraryList } from "./use-weekly-combo-library-list"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (items: WeeklyComboLibraryItem[]) => void | Promise<void>
}

export function WeeklyComboLibraryPickerDialog({ open, onOpenChange, onSelect }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedItems, setSelectedItems] = useState<Map<string, WeeklyComboLibraryItem>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { items, isLoading, error, filters, pagination, setFilters } = useWeeklyComboLibraryList()
  const selectedList = useMemo(() => Array.from(selectedItems.values()), [selectedItems])
  const tooManySelected = selectedIds.size > COMBO_LIBRARY_MULTI_INSERT_MAX

  const toggleItem = (item: WeeklyComboLibraryItem) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(item.weeklyComboLibraryId)) next.delete(item.weeklyComboLibraryId)
      else next.add(item.weeklyComboLibraryId)
      return next
    })
    setSelectedItems((current) => {
      const next = new Map(current)
      if (next.has(item.weeklyComboLibraryId)) next.delete(item.weeklyComboLibraryId)
      else next.set(item.weeklyComboLibraryId, item)
      return next
    })
  }

  const insertMulti = async () => {
    if (selectedList.length === 0 || tooManySelected) return
    setIsSubmitting(true)
    try {
      await onSelect(selectedList)
      setSelectedIds(new Set())
      setSelectedItems(new Map())
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader><DialogTitle>Pick Weekly Combos</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input value={filters.q ?? ""} onChange={(event) => setFilters({ q: event.target.value })} placeholder="Search Weekly combos..." />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Loading combos...</p> : null}
          {!isLoading && items.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No Weekly combos yet.</div> : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const selected = selectedIds.has(item.weeklyComboLibraryId)
              return (
                <Card
                  key={item.weeklyComboLibraryId}
                  className={selected ? "ring-2 ring-primary" : ""}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <ComboLibraryThumbnail item={item} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 font-medium leading-tight">
                            {item.internalName || item.name}
                          </h3>
                          <Checkbox checked={selected} onCheckedChange={() => toggleItem(item)} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <div className="flex items-center justify-between text-sm">
            <Button type="button" variant="outline" disabled={pagination.page <= 1} onClick={() => setFilters({ page: pagination.page - 1 })}>Previous</Button>
            <span>Page {pagination.page} / {Math.max(1, pagination.pages)}</span>
            <Button type="button" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => setFilters({ page: pagination.page + 1 })}>Next</Button>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 border-t bg-background pt-4">
          <div className="mr-auto text-sm">{selectedIds.size} selected{tooManySelected ? <span className="ml-2 text-red-600">Maximum {COMBO_LIBRARY_MULTI_INSERT_MAX}</span> : null}</div>
          <Button type="button" variant="outline" onClick={() => { setSelectedIds(new Set()); setSelectedItems(new Map()) }} disabled={isSubmitting}>Clear</Button>
          <Button type="button" onClick={() => void insertMulti()} disabled={isSubmitting || selectedIds.size === 0 || tooManySelected}>{isSubmitting ? "Inserting..." : `Insert ${selectedIds.size}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
