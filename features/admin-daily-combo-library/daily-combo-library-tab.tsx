"use client"

import { useState } from "react"
import { PackagePlus, Pencil, Trash2, Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import type { DailyComboLibraryItem } from "@/lib/combo-library/daily/types"

import { DailyComboLibraryBulkImportDialog } from "./daily-combo-library-bulk-import-dialog"
import { DailyComboLibraryFormDialog } from "./daily-combo-library-form-dialog"
import { useDailyComboLibraryList } from "./use-daily-combo-library-list"

export function DailyComboLibraryTab() {
  const { toast } = useToast()
  const { items, isLoading, error, filters, pagination, setFilters, refresh } = useDailyComboLibraryList()
  const [formOpen, setFormOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<DailyComboLibraryItem> | null>(null)

  const editItem = async (item: DailyComboLibraryItem) => {
    try {
      const response = await fetch(`/api/admin/daily-combo-library/${encodeURIComponent(item.dailyComboLibraryId)}`)
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to load combo")
      setEditingItem(result.data)
      setFormOpen(true)
    } catch (error) {
      toast({ title: "Failed to load combo", description: error instanceof Error ? error.message : "Could not load combo", variant: "destructive" })
    }
  }

  const deleteItem = async (item: DailyComboLibraryItem) => {
    const itemName = item.internalName || item.name || item.dailyComboLibraryId
    if (!window.confirm(`Delete "${itemName}" from the Daily Combo Library? This cannot be undone.`)) {
      return
    }
    try {
      const response = await fetch(`/api/admin/daily-combo-library/${encodeURIComponent(item.dailyComboLibraryId)}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to delete combo")
      toast({ title: "Deleted", description: "Daily combo removed from the library." })
      void refresh()
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Could not delete combo", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-2xl font-bold">Daily Combo Library</h1><p className="text-sm text-muted-foreground">Reusable Daily Delivery combos with Type A and Type B dish snapshots.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => { setEditingItem(null); setBulkOpen(true) }}><Upload className="mr-2 h-4 w-4" />Bulk import</Button>
          <Button type="button" onClick={() => { setEditingItem(null); setFormOpen(true) }}><PackagePlus className="mr-2 h-4 w-4" />New Daily combo</Button>
        </div>
      </div>
      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-3">
        <Input value={filters.q ?? ""} onChange={(event) => setFilters({ q: event.target.value })} placeholder="Search Daily combos..." className="md:col-span-2" />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filters.status ?? ""} onChange={(event) => setFilters({ status: event.target.value as "active" | "archived" | "draft" | "" })}><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
      </CardContent></Card>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading Daily combo library...</p> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <Card key={item.dailyComboLibraryId}>
            <CardHeader className="pb-3"><div className="flex gap-4">{item.imageUrl ? <img src={item.imageUrl} alt={`${item.internalName || item.name} preview`} className="h-24 w-32 rounded-lg object-cover" /> : <div className="flex h-24 w-32 items-center justify-center rounded-lg bg-muted text-xs">No image</div>}<div className="min-w-0 flex-1"><CardTitle className="text-lg">{item.internalName || item.name}</CardTitle><p className="text-xs text-muted-foreground">{item.dailyComboLibraryId}</p><div className="mt-2 flex flex-wrap gap-1"><Badge>{item.status}</Badge><Badge variant="outline">{item.calories} kcal</Badge></div></div></div></CardHeader>
            <CardContent className="space-y-3"><div className="grid gap-2 text-sm md:grid-cols-2"><p><span className="font-medium">A:</span> {item.typeADishes.slice(0, 4).join(" / ") || "-"}</p><p><span className="font-medium">B:</span> {item.typeBDishes.slice(0, 4).join(" / ") || "-"}</p></div><div className="flex flex-wrap gap-1">{item.tags.slice(0, 5).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void editItem(item)}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Button type="button" size="sm" variant="destructive" onClick={() => void deleteItem(item)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button></div></CardContent>
          </Card>
        ))}
      </div>
      {!isLoading && items.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">No Daily combos yet.</div> : null}
      <div className="flex items-center justify-between"><Button type="button" variant="outline" disabled={pagination.page <= 1} onClick={() => setFilters({ page: pagination.page - 1 })}>Previous</Button><span className="text-sm text-muted-foreground">Page {pagination.page} / {Math.max(1, pagination.pages)} · {pagination.total} combos</span><Button type="button" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => setFilters({ page: pagination.page + 1 })}>Next</Button></div>
      <DailyComboLibraryFormDialog open={formOpen} onOpenChange={setFormOpen} item={editingItem} onSaved={() => void refresh()} />
      <DailyComboLibraryBulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} onImported={() => void refresh()} />
    </div>
  )
}
