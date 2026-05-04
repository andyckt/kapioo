"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { evaluateDailyInsertGuards } from "@/lib/combo-library/daily/adapters"
import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"
import { useToast } from "@/hooks/use-toast"

import { useDailyComboLibraryList } from "./use-daily-combo-library-list"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (item: DailyComboLibraryItem) => void | Promise<void>
}

export function DailyComboLibraryPickerDialog({ open, onOpenChange, onSelect }: Props) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { items, isLoading, error, filters, pagination, setFilters } = useDailyComboLibraryList({
    status: "active",
  })

  const insertSingle = async (item: DailyComboLibraryItem) => {
    const guard = evaluateDailyInsertGuards(item)
    if (guard.level === "block") {
      toast({ title: "Cannot insert", description: guard.message, variant: "destructive" })
      return
    }
    if (guard.level === "confirm" && !window.confirm(guard.message)) return
    if (guard.level === "warn") toast({ title: "Check Type B", description: guard.message })

    setIsSubmitting(true)
    try {
      await onSelect(item)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader><DialogTitle>Pick Daily Combo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input value={filters.q ?? ""} onChange={(event) => setFilters({ q: event.target.value })} placeholder="Search Daily combos..." />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Loading combos...</p> : null}
          {!isLoading && items.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No Daily combos yet.</div> : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const guard = evaluateDailyInsertGuards(item)
              return (
                <Card key={item.dailyComboLibraryId}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex gap-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={`${item.name} preview`} className="h-20 w-28 rounded-md object-cover" />
                      ) : <div className="flex h-20 w-28 items-center justify-center rounded-md bg-muted text-xs">No image</div>}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium leading-tight">{item.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{item.calories} kcal</p>
                        <div className="mt-2 flex flex-wrap gap-1">{item.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}</div>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>A ({item.typeADishes.length}): {item.typeADishes.slice(0, 3).join(" / ") || "-"}</p>
                      <p>B ({item.typeBDishes.length}): {item.typeBDishes.slice(0, 3).join(" / ") || "-"}</p>
                    </div>
                    {guard.level !== "ok" ? <p className="text-xs text-amber-700">{guard.message}</p> : null}
                    <Button type="button" className="w-full" onClick={() => void insertSingle(item)} disabled={isSubmitting || guard.level === "block"}>Insert</Button>
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
      </DialogContent>
    </Dialog>
  )
}
