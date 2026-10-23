"use client"

import { useEffect, useState } from "react"
import { Clock, RefreshCw, Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { cutoffTimeValueSchema } from "@/lib/contracts/settings"

function asInput(value: { hour: number; minute: number }) {
  return `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`
}
function asLabel(time: string) {
  const [hour, minute] = time.split(":").map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`
}

export function CancellationTimeSetting() {
  const { toast } = useToast()
  const [time, setTime] = useState("11:59")
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true); setError("")
    try {
      const response = await fetch("/api/settings?key=cancellationTime", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error("Unable to load the cancellation deadline. Please retry.")
      const value = cutoffTimeValueSchema.parse(data.data.value)
      setTime(asInput(value)); setSaved(asInput(value))
    } catch {
      setError("Unable to load the cancellation deadline. Please retry.")
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function save() {
    if (!/^\d{2}:\d{2}$/.test(time)) { setError("Enter a valid cancellation time."); return }
    const [hour, minute] = time.split(":").map(Number)
    const parsed = cutoffTimeValueSchema.safeParse({ hour, minute })
    if (!parsed.success) { setError("Enter a valid cancellation time."); return }
    setSaving(true); setError("")
    try {
      const response = await fetch("/api/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "cancellationTime", value: parsed.data, description: "Customer cancellation deadline: day before delivery, Toronto time." }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to save the cancellation deadline.")
      const stored = asInput(cutoffTimeValueSchema.parse(data.data.value))
      setTime(stored); setSaved(stored)
      toast({ title: "Cancellation deadline saved", description: `${asLabel(stored)} Toronto time, the day before delivery.` })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save the cancellation deadline.")
    } finally { setSaving(false) }
  }

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Cancellation Deadline</CardTitle>
      <CardDescription>Set when customers must cancel, on the day before delivery. This setting is independent of the order cutoff.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {loading ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Loading cancellation deadline…</p> : <>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {saved === null ? <Button variant="outline" onClick={() => void load()}>Retry</Button> : <>
          <div className="space-y-2">
            <Label htmlFor="cancellation-time">Cancellation time (Toronto)</Label>
            <Input id="cancellation-time" type="time" step="60" required value={time} disabled={saving} onChange={event => { setTime(event.target.value); setError("") }} aria-describedby="cancellation-time-help" className="max-w-xs" />
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Saved cancellation deadline (Toronto time)</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{asLabel(saved)}</p>
            <p className="mt-2 text-sm text-blue-800">The day before delivery</p>
          </div>
          <div id="cancellation-time-help" className="space-y-2 text-sm text-muted-foreground">
            <p>For a weekly group, the earliest delivery determines the cancellation deadline for the whole group.</p>
            <p>Applies to existing and new orders. Saving an earlier deadline can close cancellation immediately for affected deliveries.</p>
            <p>Ordering and address changes continue to use Order Cutoff Time.</p>
          </div>
          <Button className="w-full" onClick={() => void save()} disabled={saving || !time || time === saved}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving…" : "Save Cancellation Deadline"}
          </Button>
        </>}
      </>}
    </CardContent>
  </Card>
}
