"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { AlertCircle, Loader2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime } from "@/lib/format"
import type {
  DeliveryAgentGenerateCandidatePlansResponse,
  DeliveryAgentGetReviewPlanResponse,
  DeliveryAgentPlanningProfileSummary,
  DeliveryAgentPreviewCandidatePlansResponse,
  DeliveryAgentPreviewResponse,
  DeliveryAgentSimpleRoutePreviewResponse,
} from "@/lib/contracts/delivery-agent"
import {
  DeliveryAgentReviewPanel,
  DeliveryAgentSelectCandidateButton,
} from "@/features/admin-delivery-agent/delivery-agent-review-panel"

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "warning" | "danger" | "muted"
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground"

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function SectionBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {children}
    </div>
  )
}

function formatPreviewDateTime(value?: string): string {
  if (!value?.trim()) {
    return "—"
  }

  return formatDateTime(value)
}

export function AdminDeliveryAgentTab() {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const previewAbortRef = useRef<AbortController | null>(null)
  const routePreviewAbortRef = useRef<AbortController | null>(null)
  const candidatePlansAbortRef = useRef<AbortController | null>(null)
  const candidateRoutePreviewAbortRef = useRef<AbortController | null>(null)
  const profileAbortRef = useRef<AbortController | null>(null)

  const [deliveryDate, setDeliveryDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [routePreviewLoading, setRoutePreviewLoading] = useState(false)
  const [candidatePlansLoading, setCandidatePlansLoading] = useState(false)
  const [candidateRoutePreviewLoading, setCandidateRoutePreviewLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [planningProfile, setPlanningProfile] = useState<DeliveryAgentPlanningProfileSummary | null>(
    null
  )
  const [preview, setPreview] = useState<DeliveryAgentPreviewResponse | null>(null)
  const [routePreview, setRoutePreview] = useState<DeliveryAgentSimpleRoutePreviewResponse | null>(
    null
  )
  const [candidatePlans, setCandidatePlans] =
    useState<DeliveryAgentGenerateCandidatePlansResponse | null>(null)
  const [candidateRoutePreview, setCandidateRoutePreview] =
    useState<DeliveryAgentPreviewCandidatePlansResponse | null>(null)
  const [savedReview, setSavedReview] =
    useState<DeliveryAgentGetReviewPlanResponse["review"]>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("")
  const reviewAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    profileAbortRef.current?.abort()
    const controller = new AbortController()
    profileAbortRef.current = controller
    setProfileLoading(true)

    void (async () => {
      try {
        const response = await fetch("/api/admin/delivery-agent/planning-profile", {
          signal: controller.signal,
        })

        const payload = (await response.json()) as {
          success?: boolean
          data?: DeliveryAgentPlanningProfileSummary
          error?: string
        }

        if (controller.signal.aborted) {
          return
        }

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || "Failed to load planning profile")
        }

        setPlanningProfile(payload.data)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }

        setPlanningProfile(null)
        toastRef.current({
          title: "Planning profile unavailable",
          description: error instanceof Error ? error.message : "Could not load planning profile",
          variant: "destructive",
        })
      } finally {
        if (!controller.signal.aborted) {
          setProfileLoading(false)
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [])

  const handlePreview = () => {
    const trimmedDate = deliveryDate.trim()
    if (!trimmedDate) {
      toastRef.current({
        title: "Delivery date required",
        description: "Select a delivery date before previewing orders.",
        variant: "destructive",
      })
      return
    }

    previewAbortRef.current?.abort()
    routePreviewAbortRef.current?.abort()
    candidatePlansAbortRef.current?.abort()
    candidateRoutePreviewAbortRef.current?.abort()
    const controller = new AbortController()
    previewAbortRef.current = controller
    setRoutePreview(null)
    setCandidatePlans(null)
    setCandidateRoutePreview(null)
    setSavedReview(null)
    setSelectedCandidateId("")
    setLoading(true)

    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/delivery-agent/preview-orders?deliveryDate=${encodeURIComponent(trimmedDate)}`,
          { signal: controller.signal }
        )

        const payload = (await response.json()) as {
          success?: boolean
          data?: DeliveryAgentPreviewResponse
          error?: string
        }

        if (controller.signal.aborted) {
          return
        }

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || "Failed to preview orders")
        }

        setPreview(payload.data)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }

        setPreview(null)
        toastRef.current({
          title: "Preview failed",
          description: error instanceof Error ? error.message : "Could not load order preview",
          variant: "destructive",
        })
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    })()
  }

  const handleRoutePreview = () => {
    const trimmedDate = deliveryDate.trim()
    if (!trimmedDate || !preview?.canContinueToPlanning) {
      return
    }

    routePreviewAbortRef.current?.abort()
    const controller = new AbortController()
    routePreviewAbortRef.current = controller
    setRoutePreviewLoading(true)

    void (async () => {
      try {
        const response = await fetch("/api/admin/delivery-agent/preview-simple-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryDate: trimmedDate }),
          signal: controller.signal,
        })

        const payload = (await response.json()) as {
          success?: boolean
          data?: DeliveryAgentSimpleRoutePreviewResponse
          error?: string
        }

        if (controller.signal.aborted) {
          return
        }

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || "Failed to run route preview")
        }

        setRoutePreview(payload.data)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }

        setRoutePreview(null)
        toastRef.current({
          title: "Route preview failed",
          description: error instanceof Error ? error.message : "Could not run route preview",
          variant: "destructive",
        })
      } finally {
        if (!controller.signal.aborted) {
          setRoutePreviewLoading(false)
        }
      }
    })()
  }

  const handleGenerateCandidatePlans = () => {
    const trimmedDate = deliveryDate.trim()
    if (!trimmedDate || !preview?.canContinueToPlanning) {
      return
    }

    candidatePlansAbortRef.current?.abort()
    candidateRoutePreviewAbortRef.current?.abort()
    reviewAbortRef.current?.abort()
    const controller = new AbortController()
    candidatePlansAbortRef.current = controller
    setCandidateRoutePreview(null)
    setSavedReview(null)
    setSelectedCandidateId("")
    setCandidatePlansLoading(true)

    void (async () => {
      try {
        const response = await fetch("/api/admin/delivery-agent/generate-candidate-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryDate: trimmedDate }),
          signal: controller.signal,
        })

        const payload = (await response.json()) as {
          success?: boolean
          data?: DeliveryAgentGenerateCandidatePlansResponse
          error?: string
        }

        if (controller.signal.aborted) {
          return
        }

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || "Failed to generate candidate plans")
        }

        setCandidatePlans(payload.data)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }

        setCandidatePlans(null)
        toastRef.current({
          title: "Candidate plan generation failed",
          description:
            error instanceof Error ? error.message : "Could not generate candidate plans",
          variant: "destructive",
        })
      } finally {
        if (!controller.signal.aborted) {
          setCandidatePlansLoading(false)
        }
      }
    })()
  }

  const loadSavedReview = (input: {
    deliveryDate: string
    profileId: string
    recommendedCandidateId: string | null
  }) => {
    reviewAbortRef.current?.abort()
    const controller = new AbortController()
    reviewAbortRef.current = controller

    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/delivery-agent/review-plan?deliveryDate=${encodeURIComponent(input.deliveryDate)}&profileId=${encodeURIComponent(input.profileId)}`,
          { signal: controller.signal }
        )

        const payload = (await response.json()) as {
          success?: boolean
          data?: DeliveryAgentGetReviewPlanResponse
          error?: string
        }

        if (controller.signal.aborted) {
          return
        }

        if (!response.ok || !payload.success) {
          return
        }

        setSavedReview(payload.data?.review ?? null)
        setSelectedCandidateId(
          payload.data?.review?.selectedCandidateId ?? input.recommendedCandidateId ?? ""
        )
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }
      }
    })()
  }

  const handlePreviewCandidateRoutes = () => {
    const trimmedDate = deliveryDate.trim()
    if (!trimmedDate || !candidatePlans) {
      return
    }

    candidateRoutePreviewAbortRef.current?.abort()
    const controller = new AbortController()
    candidateRoutePreviewAbortRef.current = controller
    setCandidateRoutePreviewLoading(true)

    void (async () => {
      try {
        const response = await fetch("/api/admin/delivery-agent/preview-candidate-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryDate: trimmedDate }),
          signal: controller.signal,
        })

        const payload = (await response.json()) as {
          success?: boolean
          data?: DeliveryAgentPreviewCandidatePlansResponse
          error?: string
        }

        if (controller.signal.aborted) {
          return
        }

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || "Failed to preview candidate routes")
        }

        setCandidateRoutePreview(payload.data)
        setSelectedCandidateId(payload.data.recommendedCandidateId ?? "")
        loadSavedReview({
          deliveryDate: payload.data.deliveryDate,
          profileId: payload.data.profileId,
          recommendedCandidateId: payload.data.recommendedCandidateId,
        })
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }

        setCandidateRoutePreview(null)
        toastRef.current({
          title: "Candidate route preview failed",
          description:
            error instanceof Error ? error.message : "Could not preview candidate routes",
          variant: "destructive",
        })
      } finally {
        if (!controller.signal.aborted) {
          setCandidateRoutePreviewLoading(false)
        }
      }
    })()
  }

  const areaEntries = preview
    ? Object.entries(preview.confirmed.byArea).sort(([a], [b]) => a.localeCompare(b))
    : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Planning profile</CardTitle>
          <CardDescription>
            Read-only active profile used for future route planning assumptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading planning profile...
            </div>
          ) : planningProfile ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Profile</p>
                  <p className="font-medium">{planningProfile.name}</p>
                  <p className="text-xs text-muted-foreground">{planningProfile.profileId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="font-medium">{planningProfile.profileVersion}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Normal start</p>
                  <p className="font-medium">{planningProfile.normalStartTime}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hard deadline</p>
                  <p className="font-medium">{planningProfile.hardDeliveryDeadline}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{planningProfile.description}</p>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run slot</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Starts from</TableHead>
                    <TableHead>Backup only</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planningProfile.drivers.map((driver) => (
                    <TableRow key={driver.runSlot}>
                      <TableCell>{driver.runSlot}</TableCell>
                      <TableCell>{driver.defaultDriverName}</TableCell>
                      <TableCell>{driver.role}</TableCell>
                      <TableCell>{driver.startsFrom}</TableCell>
                      <TableCell>{driver.isBackupOnly ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Planning profile is not available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Agent</CardTitle>
          <CardDescription>
            Preview confirmed and pending daily delivery orders before route planning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="delivery-agent-date">Delivery date</Label>
              <Input
                id="delivery-agent-date"
                type="date"
                value={deliveryDate}
                onChange={(event) => {
                  setDeliveryDate(event.target.value)
                  setPreview(null)
                  setRoutePreview(null)
                  setCandidatePlans(null)
                  setCandidateRoutePreview(null)
                  setSavedReview(null)
                  setSelectedCandidateId("")
                }}
              />
            </div>
            <Button onClick={handlePreview} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Previewing...
                </>
              ) : (
                "Preview Orders"
              )}
            </Button>
          </div>

          {preview && (
            <div className="space-y-2 rounded-md border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  Preview for <strong>{preview.deliveryDate}</strong>
                </span>
                {!preview.canContinueToPlanning && (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Not ready for planning
                  </span>
                )}
              </div>
              {preview.blockingReasons.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {preview.blockingReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
              <p className="text-muted-foreground">{preview.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Confirmed valid stops" value={preview.confirmed.validStops} />
            <SummaryCard
              label="Invalid confirmed orders"
              value={preview.confirmed.invalidStops}
              tone={preview.confirmed.invalidStops > 0 ? "danger" : "default"}
            />
            <SummaryCard
              label="Pending orders"
              value={preview.pending.count}
              tone={preview.pending.count > 0 ? "warning" : "default"}
            />
            <SummaryCard
              label="Warnings"
              value={preview.confirmed.warningStops}
              tone={preview.confirmed.warningStops > 0 ? "warning" : "muted"}
            />
            <SummaryCard label="Total meals (valid stops)" value={preview.confirmed.totalMealQuantity} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Area breakdown (valid stops)</CardTitle>
              <CardDescription>Rough area labels for confirmed valid stops only.</CardDescription>
            </CardHeader>
            <CardContent>
              {areaEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No valid confirmed stops.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {areaEntries.map(([area, count]) => (
                    <div key={area} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{area}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SectionBanner>
                Pending orders are not included in planning. Please confirm them before creating
                delivery runs.
              </SectionBanner>
              {preview.pending.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending orders for this date.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Meals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.pending.orders.map((order) => (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                        <TableCell>{order.customerName || "—"}</TableCell>
                        <TableCell>{order.area || "—"}</TableCell>
                        <TableCell className="max-w-md truncate">{order.formattedAddress || "—"}</TableCell>
                        <TableCell className="text-right">{order.totalMealQuantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invalid confirmed orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SectionBanner>These orders must be fixed before planning.</SectionBanner>
              {preview.confirmed.invalid.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invalid confirmed orders.</p>
              ) : (
                <div className="space-y-3">
                  {preview.confirmed.invalid.map((order) => (
                    <div key={order.orderId} className="rounded-md border p-3 text-sm">
                      <div className="font-medium">
                        {order.orderId}
                        {order.customerName ? ` — ${order.customerName}` : ""}
                        {order.area ? ` (${order.area})` : ""}
                      </div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                        {order.errors.map((error) => (
                          <li key={`${order.orderId}-${error.code}-${error.message}`}>{error.message}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Warnings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SectionBanner>
                Warnings do not block planning but should be reviewed.
              </SectionBanner>
              {preview.confirmed.warnings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No warnings on valid confirmed stops.</p>
              ) : (
                <div className="space-y-3">
                  {preview.confirmed.warnings.map((entry) => (
                    <div key={entry.orderId} className="rounded-md border p-3 text-sm">
                      <div className="font-medium">{entry.orderId}</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                        {entry.warnings.map((warning) => (
                          <li key={`${entry.orderId}-${warning.code}-${warning.message}`}>
                            {warning.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Valid confirmed stops</CardTitle>
              <CardDescription>One confirmed valid order equals one stop for MVP preview.</CardDescription>
            </CardHeader>
            <CardContent>
              {preview.confirmed.stops.length === 0 ? (
                <p className="text-sm text-muted-foreground">No valid confirmed stops.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Meals</TableHead>
                      <TableHead className="text-right">Warnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.confirmed.stops.map((stop) => (
                      <TableRow key={stop.orderId}>
                        <TableCell className="font-mono text-xs">{stop.orderId}</TableCell>
                        <TableCell>{stop.customerName}</TableCell>
                        <TableCell>{stop.customerPhone}</TableCell>
                        <TableCell>{stop.area}</TableCell>
                        <TableCell className="max-w-md truncate">{stop.formattedAddress}</TableCell>
                        <TableCell className="text-right">{stop.totalMealQuantity}</TableCell>
                        <TableCell className="text-right">{stop.warningsCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Candidate plans</CardTitle>
              <CardDescription>
                Generate draft DT / Marco / Self split candidates from confirmed valid stops.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!preview.canContinueToPlanning ? (
                <>
                  <SectionBanner>
                    Candidate plan generation is blocked until all planning issues are resolved.
                  </SectionBanner>
                  <div className="flex justify-end">
                    <Button disabled>Generate Candidate Plans</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {preview.confirmed.validStops} valid stop(s) will be split into draft
                    candidates.
                  </p>
                  <div className="flex justify-end">
                    <Button onClick={handleGenerateCandidatePlans} disabled={candidatePlansLoading}>
                      {candidatePlansLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating candidates...
                        </>
                      ) : (
                        "Generate Candidate Plans"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {candidatePlans && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{candidatePlans.notes}</p>

                  <div className="flex justify-end">
                    <Button
                      onClick={handlePreviewCandidateRoutes}
                      disabled={candidateRoutePreviewLoading}
                    >
                      {candidateRoutePreviewLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Previewing routes...
                        </>
                      ) : (
                        "Preview Candidate Routes"
                      )}
                    </Button>
                  </div>

                  {candidateRoutePreview && (
                    <p className="text-sm text-muted-foreground">{candidateRoutePreview.notes}</p>
                  )}

                  {candidateRoutePreview?.recommendedPlanSummary && (
                    <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">Recommended Plan Summary</p>
                          <p className="text-sm">
                            {candidateRoutePreview.recommendedPlanSummary.candidateName}
                            {candidateRoutePreview.recommendedPlanSummary.recommendationStatus ===
                            "recommended" ? (
                              <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                Recommended
                              </span>
                            ) : candidateRoutePreview.recommendedPlanSummary.recommendationStatus ===
                              "risky" ? (
                              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                                Risky
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Score {candidateRoutePreview.recommendedPlanSummary.score}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Latest finish</p>
                          <p className="text-sm font-medium">
                            {candidateRoutePreview.recommendedPlanSummary.formattedLatestFinishTime ||
                              "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Deadline</p>
                          <p className="text-sm font-medium">
                            {candidateRoutePreview.recommendedPlanSummary.allRunsFinishBeforeDeadline
                              ? "Before 1 PM"
                              : candidateRoutePreview.recommendedPlanSummary
                                    .minutesBeforeOrAfterDeadline !== undefined
                                ? `Late by ${Math.abs(candidateRoutePreview.recommendedPlanSummary.minutesBeforeOrAfterDeadline)} min`
                                : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Self used</p>
                          <p className="text-sm font-medium">
                            {candidateRoutePreview.recommendedPlanSummary.selfUsed ? "Yes" : "No"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Route repair</p>
                          <p className="text-sm font-medium">
                            {candidateRoutePreview.recommendedPlanSummary.routeRepairStatus}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        {Object.entries(candidateRoutePreview.recommendedPlanSummary.runFinishTimes).map(
                          ([runSlot, finishIso]) => (
                            <div key={runSlot}>
                              <span className="text-muted-foreground">Run {runSlot}: </span>
                              {formatPreviewDateTime(finishIso)}
                            </div>
                          )
                        )}
                      </div>

                      <p className="text-sm">{candidateRoutePreview.recommendedPlanSummary.decisionSummary}</p>
                      <p className="text-sm text-muted-foreground">{candidateRoutePreview.selectionNotes}</p>
                      {candidateRoutePreview.selectionWarnings.length > 0 && (
                        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                          {candidateRoutePreview.selectionWarnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs text-muted-foreground">
                        This is a recommendation only. Final run creation will be added later.
                      </p>
                    </div>
                  )}

                  {candidateRoutePreview?.recommendedCandidateId && (
                    <DeliveryAgentReviewPanel
                      candidateRoutePreview={candidateRoutePreview}
                      orderPreview={preview}
                      savedReview={savedReview}
                      selectedCandidateId={
                        selectedCandidateId || candidateRoutePreview.recommendedCandidateId
                      }
                      onSelectedCandidateIdChange={setSelectedCandidateId}
                      onReviewSaved={setSavedReview}
                    />
                  )}

                  {candidateRoutePreview?.expansionWarnings &&
                    candidateRoutePreview.expansionWarnings.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                        {candidateRoutePreview.expansionWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    )}

                  <div id="delivery-agent-alternative-candidates" className="space-y-3">
                  {(candidateRoutePreview?.candidates?.length
                    ? [...candidateRoutePreview.candidates].sort((left, right) => left.rank - right.rank)
                    : candidatePlans.candidates
                  ).map((entry) => {
                    const routePreviewCandidate = candidateRoutePreview?.candidates?.length
                      ? (entry as (typeof candidateRoutePreview.candidates)[number])
                      : undefined
                    const baseSplit = routePreviewCandidate?.combination
                      ? candidatePlans.candidates.find(
                          (split) =>
                            split.candidateId === routePreviewCandidate.combination?.baseSplitCandidateId
                        )
                      : (entry as (typeof candidatePlans.candidates)[number])
                    const candidate = baseSplit ?? (entry as (typeof candidatePlans.candidates)[number])
                    const displayName = routePreviewCandidate?.name ?? candidate.name
                    const isRecommended =
                      candidateRoutePreview?.recommendedCandidateId ===
                      (routePreviewCandidate?.candidateId ?? candidate.candidateId)

                    const cardKey = routePreviewCandidate?.candidateId ?? candidate.candidateId
                    const cardBody = (
                      <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{displayName}</p>
                            {routePreviewCandidate && (
                              <>
                                <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                                  #{routePreviewCandidate.rank}
                                </span>
                                <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                                  Score {routePreviewCandidate.score}
                                </span>
                                {routePreviewCandidate.recommendationStatus === "recommended" && (
                                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                    Recommended
                                  </span>
                                )}
                                {routePreviewCandidate.recommendationStatus === "risky" && (
                                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                                    Risky
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {routePreviewCandidate?.combination?.splitStrategyType ?? candidate.strategyType}
                          </p>
                          {routePreviewCandidate?.combination && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Base split: {candidate.name}
                              {routePreviewCandidate.combination.meetupVariantId !== "no-handoff"
                                ? ` · meet-up stop #${routePreviewCandidate.combination.meetupFixedStopPosition}`
                                : " · no handoff"}
                            </p>
                          )}
                          {routePreviewCandidate?.decisionSummary && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {routePreviewCandidate.decisionSummary}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <p>{candidate.summary.runCount} run(s)</p>
                          <p>{candidate.summary.totalStops} stop(s)</p>
                          <p>Self used: {candidate.summary.selfUsed ? "Yes" : "No"}</p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">{candidate.description}</p>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {candidate.runs.map((run) => (
                          <div key={`${candidate.candidateId}-${run.runSlot}`} className="rounded border p-3">
                            <p className="font-medium">
                              Run {run.runSlot} — {run.driverName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {run.stopCount} stop(s), {run.totalMealQuantity} meal(s)
                            </p>
                            {Object.keys(run.areaBreakdown).length > 0 && (
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                {Object.entries(run.areaBreakdown)
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([area, count]) => (
                                    <li key={area}>
                                      {area}: {count}
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>

                      {candidate.assumptions.length > 0 && (
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">Assumptions</p>
                          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            {candidate.assumptions.map((assumption) => (
                              <li key={assumption}>{assumption}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {candidate.warnings.length > 0 && (
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-amber-700">Warnings</p>
                          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            {candidate.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {routePreviewCandidate && (
                        <div className="space-y-3 rounded-md border border-dashed p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="font-medium">Route preview</p>
                            <p className="text-xs uppercase text-muted-foreground">
                              {routePreviewCandidate.status}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Latest finish</p>
                              <p className="font-medium">
                                {routePreviewCandidate.summary.formattedLatestEstimatedFinishTime ||
                                  "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Deadline status</p>
                              <p
                                className={
                                  routePreviewCandidate.summary.allRunsFinishBeforeDeadline
                                    ? "font-medium text-green-700"
                                    : "font-medium text-destructive"
                                }
                              >
                                {routePreviewCandidate.summary.allRunsFinishBeforeDeadline
                                  ? "All runs finish before 1 PM"
                                  : routePreviewCandidate.summary.minutesBeforeOrAfterDeadline !==
                                      undefined
                                    ? `Late by ${Math.abs(routePreviewCandidate.summary.minutesBeforeOrAfterDeadline)} minutes`
                                    : "Deadline status unavailable"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total duration</p>
                              <p className="font-medium">
                                {routePreviewCandidate.summary.totalDurationMinutes ?? "—"} min
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total distance</p>
                              <p className="font-medium">
                                {routePreviewCandidate.summary.totalDistanceKm ?? "—"} km
                              </p>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {routePreviewCandidate.summary.comparisonNotes}
                          </p>

                          <div className="space-y-2 rounded-md border p-3">
                            <p className="font-medium">Meet-up / handoff</p>
                            {routePreviewCandidate.handoffPlan.handoffSkipped ? (
                              <p className="text-sm text-muted-foreground">
                                Synthetic handoff stop used: No
                                {routePreviewCandidate.handoffPlan.skipReason
                                  ? ` — ${routePreviewCandidate.handoffPlan.skipReason}`
                                  : ""}
                              </p>
                            ) : (
                              <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Meet-up location</p>
                                    <p className="text-sm">
                                      {routePreviewCandidate.handoffPlan.selectedMeetup
                                        ?.meetupAddress || "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Provider reaches meet-up at
                                    </p>
                                    <p className="text-sm">
                                      {routePreviewCandidate.handoffPlan.formattedMeetupEta || "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Receiver starts from meet-up at
                                    </p>
                                    <p className="text-sm">
                                      {routePreviewCandidate.handoffPlan.receiverStartTime || "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Meet-up fixed as stop
                                    </p>
                                    <p className="text-sm">
                                      #
                                      {routePreviewCandidate.handoffPlan.selectedMeetup
                                        ?.meetupFixedStopPosition ?? "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Synthetic handoff stop used
                                    </p>
                                    <p className="text-sm">Yes</p>
                                  </div>
                                  {routePreviewCandidate.handoffPlan.selectedMeetup
                                    ?.selectionConfidence && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Selection confidence
                                      </p>
                                      <p className="text-sm capitalize">
                                        {routePreviewCandidate.handoffPlan.selectedMeetup
                                          .selectionConfidence}
                                        {typeof routePreviewCandidate.handoffPlan.selectedMeetup
                                          .score === "number"
                                          ? ` (score ${routePreviewCandidate.handoffPlan.selectedMeetup.score})`
                                          : ""}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {routePreviewCandidate.handoffPlan.selectedMeetup?.reasoning && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Meet-up reason</p>
                                    <p className="text-sm">
                                      {routePreviewCandidate.handoffPlan.selectedMeetup.reasoning}
                                    </p>
                                  </div>
                                )}
                                {(routePreviewCandidate.handoffPlan.selectedMeetup?.warnings
                                  ?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Meet-up warnings</p>
                                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                      {routePreviewCandidate.handoffPlan.selectedMeetup?.warnings?.map(
                                        (warning) => (
                                          <li key={warning}>{warning}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                                {(routePreviewCandidate.handoffPlan.selectedMeetup?.scoreBreakdown
                                  ?.length ?? 0) > 0 && (
                                  <details className="text-sm">
                                    <summary className="cursor-pointer font-medium">
                                      Meet-up score breakdown
                                    </summary>
                                    <ul className="mt-2 space-y-2">
                                      {routePreviewCandidate.handoffPlan.selectedMeetup?.scoreBreakdown?.map(
                                        (item) => (
                                          <li key={item.key} className="rounded border p-2">
                                            <p className="font-medium">
                                              {item.label}: {item.points} pts (weight {item.weight})
                                            </p>
                                            <p className="text-muted-foreground">{item.reason}</p>
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </details>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 rounded-md border p-3">
                            <p className="font-medium">Route repair</p>
                            {routePreviewCandidate.candidateRepairSummary.repairAttempted ? (
                              <>
                                {routePreviewCandidate.candidateRepairSummary.repairAttempted &&
                                  !routePreviewCandidate.candidateRepairSummary.repairSucceeded && (
                                  <p className="text-sm text-destructive">
                                    Repair re-preview failed — showing original preview.
                                  </p>
                                )}
                                {routePreviewCandidate.candidateRepairSummary.issuesDetected
                                  .length > 0 ? (
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Issues detected</p>
                                    <ul className="list-disc space-y-1 pl-5 text-sm">
                                      {routePreviewCandidate.candidateRepairSummary.issuesDetected.map(
                                        (issue) => (
                                          <li key={`${issue.issueType}-${issue.runSlot}`}>
                                            Run {issue.runSlot}: {issue.message}
                                            <span className="text-muted-foreground">
                                              {" "}
                                              ({issue.severity})
                                            </span>
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No route shape issues detected.
                                  </p>
                                )}
                                {routePreviewCandidate.candidateRepairSummary.repairActionsApplied
                                  .length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Repairs applied</p>
                                    <ul className="list-disc space-y-1 pl-5 text-sm">
                                      {routePreviewCandidate.candidateRepairSummary.repairActionsApplied.map(
                                        (action, index) => (
                                          <li key={`${action.actionType}-${action.runSlot}-${index}`}>
                                            Run {action.runSlot}: {action.reason}
                                            {action.fixedStopPosition !== undefined
                                              ? ` (fixed stop #${action.fixedStopPosition})`
                                              : ""}
                                            {action.targetStopName
                                              ? ` — ${action.targetStopName}`
                                              : ""}
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                                {routePreviewCandidate.candidateRepairSummary.beforeSummary
                                  ?.formattedLatestEstimatedFinishTime &&
                                  routePreviewCandidate.candidateRepairSummary.afterSummary
                                    ?.formattedLatestEstimatedFinishTime &&
                                  routePreviewCandidate.candidateRepairSummary.beforeSummary
                                    .formattedLatestEstimatedFinishTime !==
                                    routePreviewCandidate.candidateRepairSummary.afterSummary
                                      .formattedLatestEstimatedFinishTime && (
                                    <p className="text-sm text-muted-foreground">
                                      Latest finish:{" "}
                                      {
                                        routePreviewCandidate.candidateRepairSummary.beforeSummary
                                          .formattedLatestEstimatedFinishTime
                                      }{" "}
                                      →{" "}
                                      {
                                        routePreviewCandidate.candidateRepairSummary.afterSummary
                                          .formattedLatestEstimatedFinishTime
                                      }
                                    </p>
                                  )}
                                {routePreviewCandidate.candidateRepairSummary.repairSucceeded && (
                                  <p className="text-sm text-green-700">
                                    Re-previewed successfully after repair.
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No route shape repair needed.
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              These are still previews only. Final plan selection and run creation
                              will be added later.
                            </p>
                          </div>

                          <div className="space-y-2 rounded-md border p-3">
                            <p className="font-medium">Plan scoring</p>
                            {routePreviewCandidate.pros.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground">Pros</p>
                                <ul className="list-disc space-y-1 pl-5 text-sm">
                                  {routePreviewCandidate.pros.map((pro) => (
                                    <li key={pro}>{pro}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {routePreviewCandidate.cons.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground">Cons</p>
                                <ul className="list-disc space-y-1 pl-5 text-sm">
                                  {routePreviewCandidate.cons.map((con) => (
                                    <li key={con}>{con}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {routePreviewCandidate.blockingIssues.length > 0 && (
                              <div>
                                <p className="text-sm text-destructive">Blocking issues</p>
                                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                  {routePreviewCandidate.blockingIssues.map((issue) => (
                                    <li key={issue}>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {routePreviewCandidate.scoreBreakdown.length > 0 && (
                              <details className="text-sm">
                                <summary className="cursor-pointer font-medium">Score breakdown</summary>
                                <ul className="mt-2 space-y-2">
                                  {routePreviewCandidate.scoreBreakdown.map((item) => (
                                    <li key={item.key} className="rounded border p-2">
                                      <p className="font-medium">
                                        {item.label}: {item.points} pts (weight {item.weight})
                                      </p>
                                      <p className="text-muted-foreground">{item.reason}</p>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            {routePreviewCandidate.runs.map((run) => (
                              <div
                                key={`${routePreviewCandidate?.candidateId ?? candidate.candidateId}-preview-${run.runSlot}`}
                                className="rounded border p-3"
                              >
                                <p className="font-medium">
                                  Run {run.runSlot} — {run.driverName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {run.previewStatus}
                                  {run.repairStatus ? ` · repair: ${run.repairStatus}` : ""}
                                </p>
                                <p className="mt-2 text-sm">
                                  Finish:{" "}
                                  {run.formattedEstimatedFinishTime ||
                                    formatPreviewDateTime(run.estimatedFinishTime)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {run.totalDurationMinutes ?? "—"} min,{" "}
                                  {run.totalDistanceKm ?? "—"} km, {run.optimizedStopCount}{" "}
                                  optimized stop(s)
                                </p>
                                {run.syntheticMeetupIncluded && (
                                  <p className="text-xs text-muted-foreground">
                                    Synthetic meet-up at stop #{run.meetupSequence ?? "—"}
                                    {run.formattedMeetupEta
                                      ? ` (${run.formattedMeetupEta})`
                                      : ""}
                                  </p>
                                )}
                                {run.previewError && (
                                  <p className="mt-1 text-xs text-destructive">{run.previewError}</p>
                                )}
                              </div>
                            ))}
                          </div>

                          {routePreviewCandidate.assumptions.length > 0 && (
                            <div className="space-y-1 text-sm">
                              <p className="font-medium">Route assumptions</p>
                              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                                {routePreviewCandidate.assumptions.map((assumption) => (
                                  <li key={assumption}>{assumption}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {routePreviewCandidate.errors.length > 0 && (
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-destructive">Route errors</p>
                              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                                {routePreviewCandidate.errors.map((entry) => (
                                  <li key={entry}>{entry}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {routePreviewCandidate.warnings.length > 0 && (
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-amber-700">Route warnings</p>
                              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                                {routePreviewCandidate.warnings.map((warning) => (
                                  <li key={warning}>{warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      </>
                    )

                    if (!isRecommended && routePreviewCandidate) {
                      return (
                        <details
                          key={cardKey}
                          className="rounded-md border border-muted/60 bg-muted/10 p-4"
                        >
                          <summary className="cursor-pointer list-none space-y-2 marker:content-none">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{displayName}</p>
                                <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                                  #{routePreviewCandidate.rank}
                                </span>
                                <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                                  Score {routePreviewCandidate.score}
                                </span>
                                <span className="text-xs text-muted-foreground">Alternative candidate</span>
                              </div>
                              <DeliveryAgentSelectCandidateButton
                                candidateId={routePreviewCandidate.candidateId}
                                candidateName={displayName}
                                selectedCandidateId={
                                  selectedCandidateId || candidateRoutePreview?.recommendedCandidateId || ""
                                }
                                recommendedCandidateId={candidateRoutePreview?.recommendedCandidateId ?? null}
                                onSelect={setSelectedCandidateId}
                              />
                            </div>
                          </summary>
                          <div className="mt-4 space-y-3">{cardBody}</div>
                        </details>
                      )
                    }

                    return (
                      <div
                        key={cardKey}
                        className={`space-y-3 rounded-md border p-4 ${isRecommended ? "border-primary shadow-sm" : ""}`}
                      >
                        {cardBody}
                      </div>
                    )
                  })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Simple route preview</CardTitle>
              <CardDescription>
                Send all confirmed valid stops to Route Optimizer for a one-run optimize-preview
                test.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!preview.canContinueToPlanning ? (
                <>
                  <SectionBanner>
                    Route preview is blocked until all planning issues are resolved.
                  </SectionBanner>
                  {preview.blockingReasons.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {preview.blockingReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex justify-end">
                    <Button disabled>Run Simple Route Preview</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {preview.confirmed.validStops} valid stop(s) will be sent to Route Optimizer.
                  </p>
                  <div className="flex justify-end">
                    <Button onClick={handleRoutePreview} disabled={routePreviewLoading}>
                      {routePreviewLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Running preview...
                        </>
                      ) : (
                        "Run Simple Route Preview"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {routePreview && (
                <div className="space-y-4 rounded-md border p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">{routePreview.routePreview.status || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration (min)</p>
                      <p className="font-medium">
                        {routePreview.routePreview.totalDurationMinutes ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Distance (km)</p>
                      <p className="font-medium">
                        {routePreview.routePreview.totalDistanceKm ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated finish</p>
                      <p className="font-medium">
                        {formatPreviewDateTime(routePreview.routePreview.estimatedFinishTime)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {routePreview.routePreview.stopCount} optimized stop(s)
                  </p>

                  {routePreview.routePreview.optimizedStops.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>ETA</TableHead>
                          <TableHead>Order IDs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routePreview.routePreview.optimizedStops.map((stop) => (
                          <TableRow key={`${stop.sequence}-${stop.address ?? stop.name ?? "stop"}`}>
                            <TableCell>{stop.sequence}</TableCell>
                            <TableCell>{stop.name || "—"}</TableCell>
                            <TableCell className="max-w-md truncate">
                              {stop.address || "—"}
                            </TableCell>
                            <TableCell>{formatPreviewDateTime(stop.eta)}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {stop.orderIds.length > 0 ? stop.orderIds.join(", ") : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {routePreview.routePreview.warnings.length > 0 && (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Warnings</p>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {routePreview.routePreview.warnings.map((warning, index) => (
                          <li key={`warning-${index}`}>{String(warning)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {routePreview.routePreview.validationErrors.length > 0 && (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-destructive">Validation errors</p>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {routePreview.routePreview.validationErrors.map((entry, index) => (
                          <li key={`validation-${index}`}>{String(entry)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {routePreview.routePreview.geocodeFailures.length > 0 && (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-destructive">Geocode failures</p>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {routePreview.routePreview.geocodeFailures.map((entry, index) => (
                          <li key={`geocode-${index}`}>{String(entry)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">{routePreview.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
