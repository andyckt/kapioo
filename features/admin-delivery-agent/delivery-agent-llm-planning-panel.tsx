"use client"

import { useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import type {
  DeliveryAgentLlmCandidatePlanningFinalistSummary,
  DeliveryAgentLlmCandidatePlanningResponse,
} from "@/lib/contracts/delivery-agent"

function centsDisplay(cents: number | undefined): string {
  if (cents === undefined) return "—"
  if (cents < 1) return "<1¢"
  return `${Math.round(cents)}¢`
}

function GateRow({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={ok ? "text-green-700" : "text-destructive"}>{ok ? "✓" : "✗"}</span>
        {value && <span className="font-mono text-xs">{value}</span>}
      </span>
    </div>
  )
}

function ReadinessPanel({
  result,
}: {
  result: DeliveryAgentLlmCandidatePlanningResponse
}) {
  const gate = result.liveCallGate
  const prompt = result.prompt

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Provider readiness</p>
        <GateRow label="Model configured" ok={gate.modelConfigured} value={gate.modelId ?? gate.modelTier} />
        <GateRow label="API key configured" ok={gate.apiKeyConfigured} value={gate.apiKeyEnvVar} />
        <GateRow label="Pricing configured" ok={gate.pricingConfigured} value={gate.pricingVersion} />
        {gate.withinTarget !== undefined && (
          <GateRow
            label="Within cost target"
            ok={gate.withinTarget}
            value={`${centsDisplay(gate.estimatedCostCents)} / ${centsDisplay(gate.targetCents)} target`}
          />
        )}
      </div>

      {prompt && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Prompt</p>
          <GateRow
            label="Token status"
            ok={prompt.tokenStatus === "within_limit"}
            value={`${prompt.estimatedInputTokens.toLocaleString()} in + ${prompt.estimatedOutputTokens.toLocaleString()} out`}
          />
          <GateRow
            label="Historical package"
            ok={result.historicalPackage.status === "included"}
            value={`${result.historicalPackage.selectedCaseCount} case(s) — ${result.historicalPackage.status}`}
          />
          <GateRow
            label="Order coverage"
            ok={result.orderSummary.validStops > 0}
            value={`${result.orderSummary.validStops} valid stops, ${result.orderSummary.coordinateCoveragePercent}% with coords`}
          />
        </div>
      )}

      {gate.blockingReasons.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-red-50 p-3 text-sm">
          <p className="mb-1 font-medium text-destructive">Blocking issues</p>
          <ul className="list-disc space-y-0.5 pl-5 text-destructive/80">
            {gate.blockingReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {gate.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-amber-700">
          {gate.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FinalistCard({
  finalist,
  index,
}: {
  finalist: DeliveryAgentLlmCandidatePlanningFinalistSummary
  index: number
}) {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">
            #{index + 1} {finalist.name}
          </p>
          <p className="text-xs text-muted-foreground font-mono">{finalist.strategyType}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="secondary">Score {finalist.localScore}</Badge>
          {finalist.usesHandoff && <Badge variant="outline">Handoff</Badge>}
          {finalist.usesSelfRun && <Badge variant="outline">Self</Badge>}
        </div>
      </div>

      <div className="grid gap-2">
        {finalist.runs.map((run) => (
          <div key={run.runSlot} className="rounded bg-muted/50 p-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {run.runSlot} — {run.driverName}
              </span>
              <span className="text-muted-foreground">{run.stopCount} stop(s)</span>
            </div>
            {run.orderIds.length > 0 && (
              <p className="font-mono text-muted-foreground break-all">{run.orderIds.join(", ")}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{finalist.totalStops} stop(s)</span>
        <span>{finalist.totalMeals} meal(s)</span>
      </div>

      {finalist.blockingIssues.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
          {finalist.blockingIssues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}

      {finalist.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700">
          {finalist.warnings.slice(0, 3).map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LiveResultPanel({
  result,
}: {
  result: DeliveryAgentLlmCandidatePlanningResponse
}) {
  const finalists = result.localCandidates.finalists ?? []
  const gate = result.liveCallGate
  const estimatedCostCents = gate.estimatedCostCents

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge
          variant={result.provider.apiCallMade ? "default" : "secondary"}
        >
          {result.provider.apiCallMade ? "LLM called" : result.provider.status}
        </Badge>
        <Badge variant="outline">Cache: {result.cache.readStatus}</Badge>
        {estimatedCostCents !== undefined && (
          <Badge variant="outline">~{centsDisplay(estimatedCostCents)}</Badge>
        )}
        <Badge variant="secondary">Status: {result.status}</Badge>
      </div>

      {result.provider.reason && (
        <p className="text-xs text-muted-foreground font-mono">{result.provider.reason}</p>
      )}

      {finalists.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {finalists.length} finalist plan(s)
          </p>
          {finalists.map((finalist, i) => (
            <FinalistCard key={finalist.candidateId} finalist={finalist} index={i} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {result.provider.apiCallMade
            ? "No valid finalist plans were produced. Check warnings."
            : "No live provider call was made. Check readiness status."}
        </div>
      )}

      {result.localCandidates.parsedRejectedCandidateIds.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Rejected by parser:</p>
          <p className="font-mono">{result.localCandidates.parsedRejectedCandidateIds.join(", ")}</p>
        </div>
      )}

      {result.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-amber-700">
          {result.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {result.errors.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-destructive">
          {result.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DeliveryAgentLlmPlanningPanel({
  deliveryDate,
}: {
  deliveryDate: string
}) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [readinessLoading, setReadinessLoading] = useState(false)
  const [liveLoading, setLiveLoading] = useState(false)
  const [readinessResult, setReadinessResult] =
    useState<DeliveryAgentLlmCandidatePlanningResponse | null>(null)
  const [liveResult, setLiveResult] =
    useState<DeliveryAgentLlmCandidatePlanningResponse | null>(null)

  const canRunLive =
    readinessResult?.liveCallGate.readinessStatus === "ready" && !readinessLoading && !liveLoading

  async function checkReadiness() {
    if (!deliveryDate.trim()) {
      toastRef.current({ title: "No delivery date selected", variant: "destructive" })
      return
    }

    setReadinessLoading(true)
    setReadinessResult(null)
    setLiveResult(null)

    try {
      const res = await fetch("/api/admin/delivery-agent/llm-candidate-planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate,
          includeHistoricalPackage: true,
          allowProviderCall: false,
        }),
      })

      const json: { data?: DeliveryAgentLlmCandidatePlanningResponse; error?: string } =
        await res.json()

      if (!res.ok || !json.data) {
        toastRef.current({
          title: "Readiness check failed",
          description: json.error ?? `HTTP ${res.status}`,
          variant: "destructive",
        })
        return
      }

      setReadinessResult(json.data)
    } catch (err) {
      toastRef.current({
        title: "Readiness check error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setReadinessLoading(false)
    }
  }

  async function runLiveDryRun() {
    if (!deliveryDate.trim()) return

    setLiveLoading(true)
    setLiveResult(null)

    try {
      const res = await fetch("/api/admin/delivery-agent/llm-candidate-planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate,
          includeHistoricalPackage: true,
          allowProviderCall: true,
          liveDryRunConfirmation: "LIVE_LLM_DRY_RUN",
        }),
      })

      const json: { data?: DeliveryAgentLlmCandidatePlanningResponse; error?: string } =
        await res.json()

      if (!res.ok || !json.data) {
        toastRef.current({
          title: "Live dry run failed",
          description: json.error ?? `HTTP ${res.status}`,
          variant: "destructive",
        })
        return
      }

      setLiveResult(json.data)
      toastRef.current({
        title: json.data.provider.apiCallMade
          ? "Live DeepSeek call complete"
          : "Dry run complete (no provider call)",
        description: `${json.data.localCandidates.finalistCandidateCount} finalist(s) produced`,
      })
    } catch (err) {
      toastRef.current({
        title: "Live dry run error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLiveLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">LLM Candidate Planning</CardTitle>
            <CardDescription>
              Experimental — does not create routes or prove plans via Route Optimizer
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            DeepSeek dry run
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkReadiness}
            disabled={readinessLoading || liveLoading || !deliveryDate}
          >
            {readinessLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Check LLM readiness
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                disabled={!canRunLive}
              >
                {liveLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run live LLM dry run
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Run live DeepSeek dry run?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will make one real API call to DeepSeek for{" "}
                  <strong>{deliveryDate}</strong> and spend real tokens. No Route Optimizer calls
                  will be made and no routes will be created.
                  {readinessResult?.liveCallGate.estimatedCostCents !== undefined && (
                    <span className="block mt-2">
                      Estimated cost:{" "}
                      <strong>{centsDisplay(readinessResult.liveCallGate.estimatedCostCents)}</strong>
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runLiveDryRun}>
                  Confirm — run live
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {readinessResult && !liveResult && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Readiness:{" "}
              <span
                className={
                  readinessResult.liveCallGate.readinessStatus === "ready"
                    ? "text-green-700"
                    : "text-destructive"
                }
              >
                {readinessResult.liveCallGate.readinessStatus}
              </span>
            </p>
            <ReadinessPanel result={readinessResult} />
          </div>
        )}

        {liveLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calling DeepSeek…
          </div>
        )}

        {liveResult && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Live run result</p>
            <LiveResultPanel result={liveResult} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
