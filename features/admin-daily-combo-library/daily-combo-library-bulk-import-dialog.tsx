"use client"

import { useState } from "react"
import { Download, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { DAILY_COMBO_LIBRARY_FIELDS } from "@/lib/combo-library/daily/fields"
import { buildCsvTemplate } from "@/lib/combo-library/shared/fields"

type ImportRow = {
  rowIndex: number
  status: "valid" | "invalid" | "duplicate"
  data?: Record<string, unknown>
  errors: string[]
  warnings: string[]
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onImported?: () => void }

function downloadTemplate() {
  const csv = buildCsvTemplate(DAILY_COMBO_LIBRARY_FIELDS)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "daily-combo-library-template.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export function DailyComboLibraryBulkImportDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "create" | "update">("skip")
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const preview = async () => {
    if (!file) {
      toast({ title: "No file", description: "Choose a CSV or XLSX file first.", variant: "destructive" })
      return
    }
    setIsPreviewing(true)
    setSummary(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/admin/daily-combo-library/bulk-import/preview", { method: "POST", body: formData })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Preview failed")
      setRows(result.data.rows)
    } catch (error) {
      toast({ title: "Preview failed", description: error instanceof Error ? error.message : "Could not parse file", variant: "destructive" })
    } finally {
      setIsPreviewing(false)
    }
  }

  const commit = async () => {
    const commitRows = rows.filter((row) => row.data && (row.status === "valid" || row.status === "duplicate")).map((row) => row.data)
    if (commitRows.length === 0) {
      toast({ title: "No valid rows", description: "Fix import errors before saving.", variant: "destructive" })
      return
    }
    setIsCommitting(true)
    try {
      const response = await fetch("/api/admin/daily-combo-library/bulk-import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: commitRows, duplicatePolicy }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Import failed")
      const nextSummary = `Created ${result.data.created}, updated ${result.data.updated}, skipped ${result.data.skipped}, failed ${result.data.failed.length}.`
      setSummary(nextSummary)
      toast({ title: "Import complete", description: nextSummary })
      onImported?.()
    } catch (error) {
      toast({ title: "Import failed", description: error instanceof Error ? error.message : "Could not save import", variant: "destructive" })
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader><DialogTitle>Bulk Import Daily Combo Library</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="max-w-md" />
            <Button type="button" variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Download template</Button>
            <Button type="button" onClick={preview} disabled={isPreviewing || !file}><Upload className="mr-2 h-4 w-4" />{isPreviewing ? "Previewing..." : "Preview"}</Button>
          </div>
          {rows.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>Total: {rows.length}</span><span>Valid: {rows.filter((row) => row.status === "valid").length}</span><span>Duplicates: {rows.filter((row) => row.status === "duplicate").length}</span><span>Invalid: {rows.filter((row) => row.status === "invalid").length}</span>
                <label className="ml-auto flex items-center gap-2">Duplicate policy:<select className="h-9 rounded-md border bg-background px-2" value={duplicatePolicy} onChange={(event) => setDuplicatePolicy(event.target.value as typeof duplicatePolicy)}><option value="skip">Skip</option><option value="create">Create</option><option value="update">Update</option></select></label>
              </div>
              <div className="max-h-[420px] overflow-auto rounded-md border">
                <table className="w-full text-sm"><tbody>{rows.map((row) => <tr key={row.rowIndex} className="border-t"><td className="p-2">{row.rowIndex}</td><td className="p-2">{String(row.data?.internalName ?? "")}</td><td className="p-2 capitalize">{row.status}</td><td className="p-2 text-xs">{[...row.errors, ...row.warnings].map((message, index) => <div key={index}>{message}</div>)}</td></tr>)}</tbody></table>
              </div>
            </>
          ) : null}
          {summary ? <p className="rounded-md bg-muted p-3 text-sm">{summary}</p> : null}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button type="button" onClick={commit} disabled={isCommitting || rows.length === 0}>{isCommitting ? "Importing..." : "Confirm import"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
