"use client"

import { useState } from "react"
import { PackagePlus, Pencil, Trash2, Upload } from "lucide-react"

import { ComboLibraryThumbnail } from "@/components/admin/combo-library-thumbnail"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import type { WeeklyComboLibraryItem } from "@/lib/combo-library/weekly/types"

import { WeeklyComboLibraryBulkImportDialog } from "./weekly-combo-library-bulk-import-dialog"
import { WeeklyComboLibraryFormDialog } from "./weekly-combo-library-form-dialog"
import { useWeeklyComboLibraryList } from "./use-weekly-combo-library-list"

export function WeeklyComboLibraryTab() {
  const { toast } = useToast()
  const { items, isLoading, error, filters, pagination, setFilters, refresh } = useWeeklyComboLibraryList()
  const [formOpen, setFormOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<WeeklyComboLibraryItem> | null>(null)

  const editItem = async (item: WeeklyComboLibraryItem) => {
    try {
      const response = await fetch(`/api/admin/weekly-combo-library/${encodeURIComponent(item.weeklyComboLibraryId)}`)
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to load combo")
      setEditingItem(result.data)
      setFormOpen(true)
    } catch (error) {
      toast({ title: "Failed to load combo", description: error instanceof Error ? error.message : "Could not load combo", variant: "destructive" })
    }
  }

  const deleteItem = async (item: WeeklyComboLibraryItem) => {
    const itemName = item.internalName || item.name || item.weeklyComboLibraryId
    if (!window.confirm(`Delete "${itemName}" from the Weekly Combo Library? This cannot be undone.`)) {
      return
    }
    try {
      const response = await fetch(`/api/admin/weekly-combo-library/${encodeURIComponent(item.weeklyComboLibraryId)}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to delete combo")
      toast({ title: "Deleted", description: "Weekly combo removed from the library." })
      void refresh()
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Could not delete combo", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-2xl font-bold">Weekly Combo Library</h1><p className="text-sm text-muted-foreground">Reusable Weekly Delivery meal option content.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => { setEditingItem(null); setBulkOpen(true) }}><Upload className="mr-2 h-4 w-4" />Bulk import</Button>
          <Button type="button" onClick={() => { setEditingItem(null); setFormOpen(true) }}><PackagePlus className="mr-2 h-4 w-4" />New Weekly combo</Button>
        </div>
      </div>
      <Card><CardContent className="p-4">
        <Input value={filters.q ?? ""} onChange={(event) => setFilters({ q: event.target.value })} placeholder="Search Weekly combos..." />
      </CardContent></Card>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading Weekly combo library...</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.weeklyComboLibraryId} className="overflow-hidden">
            <CardHeader className="p-4 pb-3">
              <div className="flex gap-3">
                <ComboLibraryThumbnail item={item} />
                <div className="min-w-0 flex-1">
                  <CardTitle className="line-clamp-2 text-base leading-snug">
                    {item.internalName || item.name}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2 px-4 pb-4 pt-0">
              <Button type="button" size="sm" variant="outline" onClick={() => void editItem(item)}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => void deleteItem(item)}>
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {!isLoading && items.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No Weekly combos yet.</div> : null}
      <div className="flex items-center justify-between"><Button type="button" variant="outline" disabled={pagination.page <= 1} onClick={() => setFilters({ page: pagination.page - 1 })}>Previous</Button><span className="text-sm text-muted-foreground">Page {pagination.page} / {Math.max(1, pagination.pages)} · {pagination.total} combos</span><Button type="button" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => setFilters({ page: pagination.page + 1 })}>Next</Button></div>
      <WeeklyComboLibraryFormDialog open={formOpen} onOpenChange={setFormOpen} item={editingItem} onSaved={() => void refresh()} />
      <WeeklyComboLibraryBulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} onImported={() => void refresh()} />
    </div>
  )
}
