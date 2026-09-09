"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import {
  addDaysToDateKey,
  getDailyDeliveryMinimumStatus,
  getTorontoDateKey,
  type DailyDeliveryMinimumOverride,
} from "@/lib/orders/daily-delivery-minimum"
import type { User } from "@/lib/utils"

type DailyDeliveryMinimumControlProps = {
  user: User
  onUserUpdated?: (user: User) => void
}

export function DailyDeliveryMinimumControl({
  user,
  onUserUpdated,
}: DailyDeliveryMinimumControlProps) {
  const { toast } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [startsOn, setStartsOn] = useState("")
  const [endsOn, setEndsOn] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const today = getTorontoDateKey()
    const existing = user.dailyDeliveryMinimumOverride
    const status = getDailyDeliveryMinimumStatus(existing, today)
    setEnabled(status === "active" || status === "scheduled")
    setStartsOn(existing?.startsOn || today)
    setEndsOn(existing?.endsOn || addDaysToDateKey(today, 6))
  }, [user])

  const status = enabled
    ? getDailyDeliveryMinimumStatus({ minimumMeals: 1, startsOn, endsOn })
    : "off"

  const handleToggle = (checked: boolean) => {
    if (checked && getDailyDeliveryMinimumStatus(user.dailyDeliveryMinimumOverride) === "expired") {
      const today = getTorontoDateKey()
      setStartsOn(today)
      setEndsOn(addDaysToDateKey(today, 6))
    }
    setEnabled(checked)
  }

  const save = async () => {
    if (enabled && (!startsOn || !endsOn)) {
      toast({
        title: "Dates required",
        description: "Choose the first and last delivery dates for this exception.",
        variant: "destructive",
      })
      return
    }
    if (enabled && startsOn > endsOn) {
      toast({
        title: "Check the date range",
        description: "The end date must be on or after the start date.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${user._id}/daily-delivery-minimum`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enabled
          ? { enabled: true, startsOn, endsOn }
          : { enabled: false }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update the exception")
      }

      const nextOverride = result.data.dailyDeliveryMinimumOverride as
        | DailyDeliveryMinimumOverride
        | undefined
      onUserUpdated?.({ ...user, dailyDeliveryMinimumOverride: nextOverride })
      toast({
        title: enabled ? "Single-meal exception saved" : "Single-meal exception turned off",
        description: enabled
          ? `One-meal daily deliveries are allowed from ${startsOn} through ${endsOn}.`
          : "The normal two-meal minimum now applies.",
      })
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-md border border-[#C2884E]/30 bg-[#FBF7F2] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label htmlFor="single-meal-exception" className="font-medium">
            Allow single-meal daily delivery
          </Label>
          <p className="mt-1 text-sm text-muted-foreground">
            This applies only to this customer and only to delivery dates in the selected range.
          </p>
        </div>
        <Switch
          id="single-meal-exception"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={saving}
        />
      </div>

      {enabled && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="single-meal-start">First delivery date</Label>
            <Input
              id="single-meal-start"
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="single-meal-end">Last delivery date</Label>
            <Input
              id="single-meal-end"
              type="date"
              min={startsOn}
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
              disabled={saving}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm capitalize text-muted-foreground">Status: {status}</span>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          Save exception
        </Button>
      </div>
    </div>
  )
}
