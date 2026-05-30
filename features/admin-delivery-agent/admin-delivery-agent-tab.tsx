"use client"

import { useRef, useState, type ReactNode } from "react"
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
  DeliveryAgentPreviewResponse,
  DeliveryAgentSimpleRoutePreviewResponse,
} from "@/lib/contracts/delivery-agent"

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

  const [deliveryDate, setDeliveryDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [routePreviewLoading, setRoutePreviewLoading] = useState(false)
  const [preview, setPreview] = useState<DeliveryAgentPreviewResponse | null>(null)
  const [routePreview, setRoutePreview] = useState<DeliveryAgentSimpleRoutePreviewResponse | null>(
    null
  )

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
    const controller = new AbortController()
    previewAbortRef.current = controller
    setRoutePreview(null)
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

  const areaEntries = preview
    ? Object.entries(preview.confirmed.byArea).sort(([a], [b]) => a.localeCompare(b))
    : []

  return (
    <div className="space-y-6">
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
