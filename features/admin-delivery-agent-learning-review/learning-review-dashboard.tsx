"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type {
  DeliveryAgentLearningReviewCaseDetail,
  DeliveryAgentLearningReviewCaseSummary,
  DeliveryAgentLearningReviewListResponse,
  DeliveryAgentLearningReviewUpdateResponse,
} from "@/lib/contracts/delivery-agent-learning-review"
import type { DeliveryAgentLearningManualReviewAction } from "@/lib/contracts/delivery-agent-learning"

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string; details?: string }

const REVIEW_STATUS_OPTIONS = [
  { value: "all", label: "All review states" },
  { value: "pending", label: "Needs Donald review" },
  { value: "none", label: "Not reviewed" },
  { value: "reviewed", label: "Reviewed" },
]

const READINESS_OPTIONS = [
  { value: "all", label: "All data readiness" },
  { value: "needs_review", label: "Needs review" },
  { value: "ready", label: "Ready" },
  { value: "blocked", label: "Blocked" },
]

const LABEL_OPTIONS = [
  { value: "all", label: "All labels" },
  { value: "positive", label: "Positive" },
  { value: "weak_positive", label: "Weak positive" },
  { value: "negative", label: "Negative" },
  { value: "avoid_pattern", label: "Avoid pattern" },
  { value: "uncertain", label: "Uncertain" },
  { value: "excluded", label: "Excluded" },
]

function labelText(value: string) {
  return value.replace(/_/g, " ")
}

function ReadinessBadge({ readiness }: { readiness: string }) {
  if (readiness === "ready") {
    return (
      <Badge className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50">
        Ready
      </Badge>
    )
  }

  if (readiness === "blocked") {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">Blocked</Badge>
    )
  }

  return (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
      Needs review
    </Badge>
  )
}

function StatusBadge({ reviewStatus }: { reviewStatus: string }) {
  if (reviewStatus === "reviewed") {
    return <Badge variant="secondary">Reviewed</Badge>
  }

  if (reviewStatus === "pending") {
    return <Badge className="bg-amber-600 text-white hover:bg-amber-600">Pending</Badge>
  }

  return <Badge variant="outline">None</Badge>
}

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 pt-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-md border bg-muted/40 p-2 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  )
}

function formatMaybeMinutes(value: number | null) {
  if (typeof value !== "number") {
    return "Unknown"
  }

  if (value >= 0) {
    return `${value} min buffer`
  }

  return `${Math.abs(value)} min late`
}

function buildQuery(params: {
  reviewStatus: string
  readiness: string
  label: string
  search: string
  page: number
}) {
  const query = new URLSearchParams()
  query.set("reviewStatus", params.reviewStatus)
  query.set("readiness", params.readiness)
  query.set("label", params.label)
  query.set("search", params.search)
  query.set("page", String(params.page))
  query.set("limit", "20")
  return query.toString()
}

function CaseDetailDialog({
  detail,
  loading,
  savingAction,
  notes,
  onNotesChange,
  onClose,
  onReview,
}: {
  detail: DeliveryAgentLearningReviewCaseDetail | null
  loading: boolean
  savingAction: DeliveryAgentLearningManualReviewAction | null
  notes: string
  onNotesChange: (value: string) => void
  onClose: () => void
  onReview: (action: DeliveryAgentLearningManualReviewAction) => void
}) {
  return (
    <Dialog open={Boolean(detail) || loading} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[min(1100px,96vw)] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historical case review</DialogTitle>
          <DialogDescription>
            Check whether this old delivery day should teach the Delivery Agent.
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Date" value={detail.deliveryDate} icon={<Clock className="h-4 w-4" />} />
              <MetricCard
                label="Orders matched"
                value={`${detail.matchedOrders}/${detail.orderCount}`}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              <MetricCard
                label="Coordinates"
                value={`${detail.coordinateCoveragePercent}%`}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <MetricCard
                label="1 PM result"
                value={formatMaybeMinutes(detail.deadlineBufferMinutes)}
                icon={
                  detail.completedBefore1pm === false ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )
                }
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-md border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ReadinessBadge readiness={detail.readiness} />
                  <StatusBadge reviewStatus={detail.reviewStatus} />
                  <Badge variant="outline">{labelText(detail.learningLabel)}</Badge>
                  {detail.positiveRetrievalReady && (
                    <Badge className="bg-green-600 text-white hover:bg-green-600">
                      Trusted good example
                    </Badge>
                  )}
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <p>
                    <span className="font-medium">Main route shape:</span>{" "}
                    {detail.majorClusterSummary || "No cluster summary"}
                  </p>
                  <p>
                    <span className="font-medium">Runs:</span> {detail.runCount}; handoff{" "}
                    {detail.handoffStopsUsed ? "used" : "not detected"}; support{" "}
                    {detail.supportRunUsed || detail.selfRunUsed ? "used" : "not used"}.
                  </p>
                  {detail.manualReview && (
                    <p>
                      <span className="font-medium">Last manual review:</span>{" "}
                      {labelText(detail.manualReview.learningLabel)} by{" "}
                      {detail.manualReview.reviewedBy || "admin"}
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-md border p-4">
                <h3 className="text-sm font-semibold">Why it needs attention</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {(detail.readinessReasons.length > 0
                    ? detail.readinessReasons
                    : ["No readiness issue detected."]
                  ).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-md border p-4">
                <h3 className="text-sm font-semibold">Route runs</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {detail.runSummaries.length === 0 ? (
                    <p className="text-muted-foreground">No run summary saved.</p>
                  ) : (
                    detail.runSummaries.map((run) => (
                      <div key={run.roRunId} className="rounded-md bg-muted/40 p-3">
                        <p className="font-medium">{run.driverName || run.roRunId}</p>
                        <p className="text-muted-foreground">
                          {labelText(run.role)} · {run.stopCount} stop(s)
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-md border p-4">
                <h3 className="text-sm font-semibold">Area spread</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {Object.keys(detail.areaDistribution).length === 0 ? (
                    <p className="text-muted-foreground">No area distribution saved.</p>
                  ) : (
                    Object.entries(detail.areaDistribution).map(([area, count]) => (
                      <div key={area} className="flex justify-between gap-3">
                        <span className="min-w-0 break-words">{area}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-md border p-4">
                <h3 className="text-sm font-semibold">Data warnings</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {[...detail.warnings, ...detail.coordinateWarnings].slice(0, 8).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                  {detail.warnings.length === 0 && detail.coordinateWarnings.length === 0 && (
                    <li>No warning saved.</li>
                  )}
                </ul>
              </section>
            </div>

            {(detail.unmatchedOrderSummaries.length > 0 ||
              detail.unmatchedRoStopSummaries.length > 0 ||
              detail.dynamicOutliers.length > 0) && (
              <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <h3 className="text-sm font-semibold">Review carefully</h3>
                <div className="mt-3 grid gap-4 text-sm lg:grid-cols-3">
                  <div>
                    <p className="font-medium">Unmatched orders</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {detail.unmatchedOrderSummaries.slice(0, 6).map((order) => (
                        <li key={order.orderId}>
                          {order.orderId}: {order.reason}
                        </li>
                      ))}
                      {detail.unmatchedOrderSummaries.length === 0 && <li>None</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Unmatched RO stops</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {detail.unmatchedRoStopSummaries.slice(0, 6).map((stop) => (
                        <li key={`${stop.roRunId}-${stop.sequence}`}>
                          {stop.customerName || stop.roRunId}: {stop.reason}
                        </li>
                      ))}
                      {detail.unmatchedRoStopSummaries.length === 0 && <li>None</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Outliers</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {detail.dynamicOutliers.slice(0, 6).map((outlier) => (
                        <li key={outlier.ref}>
                          {outlier.orderId || outlier.ref}:{" "}
                          {outlier.distanceFromCenterKm.toFixed(1)} km
                        </li>
                      ))}
                      {detail.dynamicOutliers.length === 0 && <li>None</li>}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-md border p-4">
              <Label htmlFor="learning-review-notes">Review reason</Label>
              <Textarea
                id="learning-review-notes"
                className="mt-2 min-h-24"
                placeholder="Example: Good downtown/North York split, but handoff was late. Use as weak positive only."
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
              />
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {detail.reviewActions.map((action) => (
                  <Button
                    key={action.action}
                    variant={
                      action.action === "approve_positive" || action.action === "approve_weak_positive"
                        ? "default"
                        : action.action === "mark_avoid_pattern" || action.action === "exclude"
                          ? "destructive"
                          : "outline"
                    }
                    className="h-auto min-h-11 whitespace-normal text-left"
                    disabled={action.disabled || Boolean(savingAction)}
                    title={action.disabledReason || action.description}
                    onClick={() => onReview(action.action)}
                  >
                    {savingAction === action.action && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function AdminDeliveryAgentLearningReviewDashboard() {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [reviewStatus, setReviewStatus] = useState("pending")
  const [readiness, setReadiness] = useState("all")
  const [label, setLabel] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<DeliveryAgentLearningReviewListResponse | null>(null)
  const [selectedCase, setSelectedCase] = useState<DeliveryAgentLearningReviewCaseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [savingAction, setSavingAction] =
    useState<DeliveryAgentLearningManualReviewAction | null>(null)
  const [notes, setNotes] = useState("")

  const query = useMemo(
    () => buildQuery({ reviewStatus, readiness, label, search, page }),
    [reviewStatus, readiness, label, search, page]
  )

  const loadCases = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/delivery-agent/learning-cases?${query}`)
      const payload = (await response.json()) as ApiEnvelope<DeliveryAgentLearningReviewListResponse>
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to load historical cases")
      }
      setList(payload.data)
    } catch (error) {
      toastRef.current({
        title: "Historical review unavailable",
        description: error instanceof Error ? error.message : "Could not load historical cases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void loadCases()
  }, [loadCases])

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const openCase = async (learningCase: DeliveryAgentLearningReviewCaseSummary) => {
    setSelectedCase(null)
    setNotes("")
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/admin/delivery-agent/learning-cases/${learningCase.id}`)
      const payload = (await response.json()) as ApiEnvelope<DeliveryAgentLearningReviewCaseDetail>
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to load case detail")
      }
      setSelectedCase(payload.data)
      setNotes(payload.data.manualReview?.notes ?? "")
    } catch (error) {
      toastRef.current({
        title: "Case detail unavailable",
        description: error instanceof Error ? error.message : "Could not load case detail",
        variant: "destructive",
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const saveReview = async (action: DeliveryAgentLearningManualReviewAction) => {
    if (!selectedCase) {
      return
    }

    setSavingAction(action)
    try {
      const response = await fetch(`/api/admin/delivery-agent/learning-cases/${selectedCase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      })
      const payload = (await response.json()) as ApiEnvelope<DeliveryAgentLearningReviewUpdateResponse>
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.details || payload.error || "Failed to save review")
      }

      setSelectedCase(payload.data.case)
      setNotes(payload.data.case.manualReview?.notes ?? "")
      toastRef.current({ title: "Review saved", description: payload.data.message })
      await loadCases()
    } catch (error) {
      toastRef.current({
        title: "Review not saved",
        description: error instanceof Error ? error.message : "Could not save review",
        variant: "destructive",
      })
    } finally {
      setSavingAction(null)
    }
  }

  const cases = list?.cases ?? []
  const summary = list?.summary

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Historical Review Dashboard</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Review old delivery days before they become trusted examples for the Delivery Agent.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadCases()} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total cases" value={summary?.total ?? 0} icon={<Search className="h-4 w-4" />} />
        <MetricCard label="Pending review" value={summary?.pending ?? 0} icon={<AlertTriangle className="h-4 w-4" />} />
        <MetricCard label="Ready data" value={summary?.ready ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard label="Blocked data" value={summary?.blocked ?? 0} icon={<XCircle className="h-4 w-4" />} />
        <MetricCard label="Trusted examples" value={summary?.trustedPositiveReady ?? 0} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px]">
            <div>
              <Label htmlFor="learning-case-search">Search</Label>
              <Input
                id="learning-case-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Date, profile, or case key"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Review state</Label>
              <Select value={reviewStatus} onValueChange={handleFilterChange(setReviewStatus)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REVIEW_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Readiness</Label>
              <Select value={readiness} onValueChange={handleFilterChange(setReadiness)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {READINESS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Learning label</Label>
              <Select value={label} onValueChange={handleFilterChange(setLabel)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LABEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>1 PM</TableHead>
                  <TableHead>Shape</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                      Loading historical cases
                    </TableCell>
                  </TableRow>
                ) : cases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No historical cases match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  cases.map((learningCase) => (
                    <TableRow key={learningCase.id}>
                      <TableCell className="font-medium">{learningCase.deliveryDate}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge reviewStatus={learningCase.reviewStatus} />
                          <ReadinessBadge readiness={learningCase.readiness} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>{labelText(learningCase.learningLabel)}</p>
                          <p className="text-muted-foreground">Score {learningCase.dataQualityScore}/100</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>{learningCase.matchedOrders}/{learningCase.orderCount} matched</p>
                          <p className="text-muted-foreground">{learningCase.coordinateCoveragePercent}% coordinates</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatMaybeMinutes(learningCase.deadlineBufferMinutes)}</TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="truncate text-sm">{learningCase.majorClusterSummary || "No summary"}</p>
                        <p className="text-xs text-muted-foreground">{learningCase.runCount} run(s)</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => void openCase(learningCase)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {list?.pagination.page ?? 1} of {list?.pagination.pages ?? 1};{" "}
              {list?.pagination.total ?? 0} case(s)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={loading || page >= (list?.pagination.pages ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CaseDetailDialog
        detail={selectedCase}
        loading={detailLoading}
        savingAction={savingAction}
        notes={notes}
        onNotesChange={setNotes}
        onClose={() => {
          setSelectedCase(null)
          setDetailLoading(false)
        }}
        onReview={(action) => void saveReview(action)}
      />
    </div>
  )
}
