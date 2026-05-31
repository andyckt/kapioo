"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DELIVERY_AGENT_REVIEW_FEEDBACK_TAGS } from "@/lib/agents/delivery/review-feedback-tags";
import {
  buildApproveReviewCandidateIds,
  isImprovedGeneration,
  resolveActiveRecommendationCandidateId,
  resolveReviewPanelActionVisibility,
} from "@/lib/agents/delivery/review-plan/review-panel-state";
import type {
  DeliveryAgentCreateFinalRouteRunResponse,
  DeliveryAgentGenerateImprovedCandidatePlansResponse,
  DeliveryAgentGetReviewPlanResponse,
  DeliveryAgentOperationalReviewState,
  DeliveryAgentPreviewCandidatePlansResponse,
  DeliveryAgentPreviewResponse,
  DeliveryAgentReviewPlanResponse,
} from "@/lib/contracts/delivery-agent";
import { CoordinateCoverageBanner } from "@/features/admin-delivery-agent/coordinate-coverage-banner";
import { formatDateTime } from "@/lib/format";

type ReviewSubmitMode = "approve" | "request_improvement";

const FINAL_ROUTE_SCOPE_COPY =
  "Final runs are created in the Route Optimization dashboard. Driver communication is handled manually outside the Delivery Agent.";

function buildOrderSnapshot(preview: DeliveryAgentPreviewResponse) {
  const orderIds = preview.confirmed.stops.map((stop) => stop.orderId);
  return {
    orderCount: preview.confirmed.totalStops,
    validStopCount: preview.confirmed.validStops,
    invalidStopCount: preview.confirmed.invalidStops,
    warningCount: preview.confirmed.warningStops,
    orderIds,
    invalidOrders: preview.confirmed.invalid.map((entry) => ({
      orderId: entry.orderId,
      area: entry.area,
      errors: entry.errors.map((issue) => ({
        code: issue.code,
        message: issue.message,
        field: issue.field,
      })),
    })),
    warnings: preview.confirmed.warnings.map((entry) => ({
      orderId: entry.orderId,
      warnings: entry.warnings.map((issue) => ({
        code: issue.code,
        message: issue.message,
        field: issue.field,
      })),
    })),
  };
}

function resolveOperationalState(
  savedReview: DeliveryAgentGetReviewPlanResponse["review"]
): DeliveryAgentOperationalReviewState {
  if (savedReview?.operationalState) {
    return savedReview.operationalState;
  }

  if (
    savedReview?.reviewStatus === "improvement_requested" ||
    savedReview?.reviewStatus === "rejected" ||
    savedReview?.reviewStatus === "edited"
  ) {
    return "improvement_requested";
  }

  if (savedReview?.reviewStatus === "approved") {
    const status = savedReview.finalRouteOptimizerMetadata?.finalRouteOptimizerStatus;
    if (status === "partial_created") {
      return "final_route_partial_created";
    }
    if (status === "created") {
      return savedReview.finalRouteRunsMarkedMissingAt
        ? "final_route_missing_or_deleted"
        : "final_route_created";
    }
    return "approved";
  }

  return "pending_review";
}

function formatPreviewStatus(status: string): string {
  switch (status) {
    case "previewed":
      return "Previewed";
    case "partial_failed":
      return "Partially previewed";
    case "failed":
      return "Preview failed";
    default:
      return status;
  }
}

export function DeliveryAgentReviewPanel({
  candidateRoutePreview,
  orderPreview,
  savedReview,
  onReviewSaved,
  onImprovedCandidatesGenerated,
  improvedGenerationNotice,
}: {
  candidateRoutePreview: DeliveryAgentPreviewCandidatePlansResponse;
  orderPreview: DeliveryAgentPreviewResponse | null;
  savedReview: DeliveryAgentGetReviewPlanResponse["review"];
  onReviewSaved: (review: DeliveryAgentGetReviewPlanResponse["review"]) => void;
  onImprovedCandidatesGenerated?: (
    result: DeliveryAgentGenerateImprovedCandidatePlansResponse
  ) => void;
  improvedGenerationNotice?: DeliveryAgentGenerateImprovedCandidatePlansResponse | null;
}) {
  const { toast } = useToast();
  const activeRecommendationCandidateId = resolveActiveRecommendationCandidateId(
    candidateRoutePreview.recommendedCandidateId
  );
  const activeRecommendation = candidateRoutePreview.candidates.find(
    (candidate) => candidate.candidateId === activeRecommendationCandidateId
  );
  const planSummary = candidateRoutePreview.recommendedPlanSummary;
  const generationNumber = savedReview?.activeCandidateGenerationNumber ?? 1;
  const isImproved = isImprovedGeneration(generationNumber);

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMode, setSubmitMode] = useState<ReviewSubmitMode | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [finalRouteLoading, setFinalRouteLoading] = useState(false);
  const [finalRouteMessage, setFinalRouteMessage] = useState<string | null>(null);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetRunsDeleted, setResetRunsDeleted] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  const operationalState = useMemo(() => resolveOperationalState(savedReview), [savedReview]);
  const submittedFeedback = savedReview?.submittedFeedbackSummary;
  const actionVisibility = resolveReviewPanelActionVisibility({
    operationalState,
    feedbackFormOpen: feedbackOpen,
  });

  useEffect(() => {
    if (operationalState !== "pending_review") {
      return;
    }

    setFeedbackText("");
    setFeedbackTags([]);
    setFeedbackOpen(false);
  }, [generationNumber, operationalState]);

  if (!activeRecommendationCandidateId || !activeRecommendation) {
    return null;
  }

  const toggleTag = (tagId: string, checked: boolean) => {
    setFeedbackTags((current) =>
      checked ? [...new Set([...current, tagId])] : current.filter((tag) => tag !== tagId)
    );
  };

  const hasFeedback = feedbackText.trim().length > 0 || feedbackTags.length > 0;
  const finalRouteMetadata = savedReview?.finalRouteOptimizerMetadata;
  const showFinalRouteSection =
    operationalState === "approved" ||
    operationalState === "final_route_created" ||
    operationalState === "final_route_partial_created" ||
    operationalState === "final_route_missing_or_deleted";
  const canCreateFinalRoute =
    operationalState === "approved" ||
    operationalState === "final_route_partial_created" ||
    operationalState === "final_route_missing_or_deleted" ||
    finalRouteMetadata?.finalRouteOptimizerStatus === "failed";
  const finalRouteCreated = operationalState === "final_route_created";
  const finalRoutePartial = operationalState === "final_route_partial_created";
  const finalRouteMissing = operationalState === "final_route_missing_or_deleted";

  const submitReview = async (mode: ReviewSubmitMode) => {
    if (mode === "request_improvement" && !hasFeedback) {
      toast({
        title: "Feedback required",
        description: "Add at least one feedback tag or some text before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!orderPreview) {
      toast({
        title: "Order preview required",
        description: "Run order preview first so the review log can store order snapshot data.",
        variant: "destructive",
      });
      return;
    }

    const reviewStatus = mode === "request_improvement" ? "improvement_requested" : "approved";
    const approveIds =
      mode === "approve"
        ? buildApproveReviewCandidateIds(activeRecommendationCandidateId)
        : null;

    const activeSummary = {
      candidateId: activeRecommendation.candidateId,
      candidateName: activeRecommendation.name,
      score: activeRecommendation.score,
      rank: activeRecommendation.rank,
      recommendationStatus: activeRecommendation.recommendationStatus,
      decisionSummary: activeRecommendation.decisionSummary,
    };

    setSubmitLoading(true);
    setSubmitMode(mode);

    try {
      const response = await fetch("/api/admin/delivery-agent/review-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate: candidateRoutePreview.deliveryDate,
          profileId: candidateRoutePreview.profileId,
          profileVersion: candidateRoutePreview.profileVersion,
          reviewStatus,
          feedbackText: feedbackText.trim() || undefined,
          feedbackTags: feedbackTags.length > 0 ? feedbackTags : undefined,
          recommendedCandidateId:
            approveIds?.recommendedCandidateId ?? activeRecommendationCandidateId,
          selectedCandidateId: approveIds?.selectedCandidateId ?? activeRecommendationCandidateId,
          didDonaldOverrideRecommendation:
            approveIds?.didDonaldOverrideRecommendation ?? false,
          recommendedPlanSummary: candidateRoutePreview.recommendedPlanSummary ?? undefined,
          selectedPlanSummary: activeSummary,
          candidatePreviewSnapshot: candidateRoutePreview,
          orderSnapshot: buildOrderSnapshot(orderPreview),
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: DeliveryAgentReviewPlanResponse;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to save review");
      }

      setSavedMessage(payload.data.message);
      setFeedbackOpen(false);
      onReviewSaved({
        deliveryAgentRunId: payload.data.deliveryAgentRunId,
        deliveryDate: candidateRoutePreview.deliveryDate,
        profileId: candidateRoutePreview.profileId,
        profileVersion: candidateRoutePreview.profileVersion,
        reviewStatus: payload.data.reviewStatus,
        operationalState: payload.data.operationalState,
        reviewedAt: payload.data.reviewedAt,
        recommendedCandidateId: payload.data.recommendedCandidateId,
        selectedCandidateId: payload.data.selectedCandidateId,
        didDonaldOverrideRecommendation: payload.data.didDonaldOverrideRecommendation,
        donaldFeedbackText: mode === "request_improvement" ? feedbackText.trim() || undefined : undefined,
        donaldFeedbackTags: mode === "request_improvement" ? feedbackTags : undefined,
        submittedFeedbackSummary:
          mode === "request_improvement"
            ? {
                feedbackText: feedbackText.trim() || undefined,
                feedbackTags: feedbackTags.length > 0 ? feedbackTags : undefined,
                reviewedAt: payload.data.reviewedAt,
              }
            : undefined,
        selectedPlanSummary: activeSummary,
        activeCandidateGenerationNumber: generationNumber,
      });

      toast({
        title: "Review saved",
        description: payload.data.message,
      });
    } catch (error) {
      toast({
        title: "Review failed",
        description: error instanceof Error ? error.message : "Could not save review",
        variant: "destructive",
      });
    } finally {
      setSubmitLoading(false);
      setSubmitMode(null);
    }
  };

  const createFinalRouteRun = async () => {
    if (!savedReview || !canCreateFinalRoute) {
      return;
    }

    setFinalRouteLoading(true);
    try {
      const response = await fetch("/api/admin/delivery-agent/create-final-route-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate: savedReview.deliveryDate,
          profileId: savedReview.profileId,
          deliveryAgentRunId: savedReview.deliveryAgentRunId,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: DeliveryAgentCreateFinalRouteRunResponse;
        error?: string;
        errorCode?: string;
        finalRouteOptimizerMetadata?: DeliveryAgentCreateFinalRouteRunResponse["finalRouteOptimizerMetadata"];
        routeSummaries?: DeliveryAgentCreateFinalRouteRunResponse["routeSummaries"];
      };

      if (
        !response.ok &&
        payload.errorCode === "ROUTE_OPTIMIZER_PARTIAL_CREATED" &&
        payload.finalRouteOptimizerMetadata
      ) {
        setFinalRouteMessage(payload.error ?? payload.finalRouteOptimizerMetadata.creationError?.message);
        onReviewSaved({
          ...savedReview,
          operationalState: "final_route_partial_created",
          finalRouteOptimizerMetadata: payload.finalRouteOptimizerMetadata,
        });
        toast({
          title: "Partial final route creation",
          description:
            payload.error ??
            "Some final Route Optimizer runs were created. Retry missing final route runs.",
          variant: "destructive",
        });
        return;
      }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to create final Route Optimizer run");
      }

      setFinalRouteMessage(payload.data.message);
      onReviewSaved({
        ...savedReview,
        operationalState: "final_route_created",
        finalRouteRunsMarkedMissingAt: undefined,
        finalRouteOptimizerMetadata: payload.data.finalRouteOptimizerMetadata,
      });
      toast({
        title: "Final route created",
        description: payload.data.message,
      });
    } catch (error) {
      toast({
        title: "Final route creation failed",
        description:
          error instanceof Error ? error.message : "Could not create final Route Optimizer run",
        variant: "destructive",
      });
    } finally {
      setFinalRouteLoading(false);
    }
  };

  const reopenReview = async () => {
    if (!savedReview) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/delivery-agent/reopen-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate: savedReview.deliveryDate,
          profileId: savedReview.profileId,
          deliveryAgentRunId: savedReview.deliveryAgentRunId,
          confirmed: true,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; data?: { message: string }; error?: string };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to reopen review");
      }

      onReviewSaved({
        ...savedReview,
        reviewStatus: "pending",
        operationalState: "pending_review",
        donaldFeedbackText: undefined,
        donaldFeedbackTags: [],
      });
      setSavedMessage(payload.data.message);
      toast({ title: "Review reopened", description: payload.data.message });
    } catch (error) {
      toast({
        title: "Reopen review failed",
        description: error instanceof Error ? error.message : "Could not reopen review",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setReopenDialogOpen(false);
    }
  };

  const resetFinalRouteMetadata = async () => {
    if (!savedReview) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/delivery-agent/reset-final-route-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate: savedReview.deliveryDate,
          profileId: savedReview.profileId,
          deliveryAgentRunId: savedReview.deliveryAgentRunId,
          confirmed: true,
          markMissing: resetRunsDeleted,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { message: string; finalRouteGeneration: number };
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to reset final route metadata");
      }

      onReviewSaved({
        ...savedReview,
        operationalState: "approved",
        finalRouteGeneration: payload.data.finalRouteGeneration,
        finalRouteRunsMarkedMissingAt: undefined,
        finalRouteOptimizerMetadata: {
          finalRouteOptimizerStatus: "pending",
          systemRecommendedCandidateId: savedReview.recommendedCandidateId ?? "",
          selectedCandidateId: savedReview.selectedCandidateId ?? "",
          didDonaldOverrideRecommendation: savedReview.didDonaldOverrideRecommendation ?? false,
        },
      });
      setFinalRouteMessage(payload.data.message);
      toast({ title: "Final route metadata reset", description: payload.data.message });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Could not reset final route metadata",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setResetDialogOpen(false);
      setResetRunsDeleted(false);
    }
  };

  const generateImprovedCandidatePlans = async () => {
    setGenerateLoading(true);
    setSavedMessage(null);

    try {
      const response = await fetch("/api/admin/delivery-agent/generate-improved-candidate-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate: candidateRoutePreview.deliveryDate,
          profileId: candidateRoutePreview.profileId,
          deliveryAgentRunId: savedReview?.deliveryAgentRunId,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: DeliveryAgentGenerateImprovedCandidatePlansResponse;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to generate improved candidate plans");
      }

      onImprovedCandidatesGenerated?.(payload.data);
      setFeedbackText("");
      setFeedbackTags([]);
      setFeedbackOpen(false);
      setSavedMessage("Improved recommendation ready for review.");
      toast({
        title: "Improved candidates generated",
        description: `Generation ${payload.data.generationNumber} — ${payload.data.applicationStatus.replace("_", " ")}`,
      });
    } catch (error) {
      toast({
        title: "Generate failed",
        description:
          error instanceof Error ? error.message : "Could not generate improved candidate plans",
        variant: "destructive",
      });
    } finally {
      setGenerateLoading(false);
    }
  };

  const formatFeedbackTagLabel = (tagId: string) =>
    DELIVERY_AGENT_REVIEW_FEEDBACK_TAGS.find((tag) => tag.id === tagId)?.label ?? tagId;

  const meetupAddress = activeRecommendation.handoffPlan?.selectedMeetup?.meetupAddress;
  const operationalNotes =
    activeRecommendation.operationalNotes ??
    planSummary?.operationalNotes ??
    [];
  const selfReasonNote = (() => {
    const reason =
      activeRecommendation.selfRecommendationReason ?? planSummary?.selfRecommendationReason;
    if (!activeRecommendation.summary.selfUsed) {
      return reason === "not_necessary" || !reason || reason === "not_applicable"
        ? "Self not used — 2-driver plan preferred when operationally safe."
        : undefined;
    }
    if (reason === "required_for_deadline") {
      return "Self recommended because 2-driver plans are late or lack safe buffer.";
    }
    if (reason === "meaningful_deadline_improvement") {
      return "Self recommended because it meaningfully improves deadline safety.";
    }
    if (reason === "not_necessary") {
      return "Self is used but may not be necessary — review alternatives.";
    }
    return undefined;
  })();
  const meetupBalanceNote =
    activeRecommendation.meetupBalanceNote ?? planSummary?.meetupBalanceNote;
  const bufferMinutes = planSummary?.minutesBeforeOrAfterDeadline;
  const heroWarnings = [
    ...activeRecommendation.warnings.slice(0, 5),
    ...candidateRoutePreview.selectionWarnings.slice(0, 3),
  ];

  return (
    <div
      id="delivery-agent-review-zone"
      className="space-y-4 rounded-md border border-primary/30 bg-primary/5 p-4"
    >
      <div>
        <p className="font-medium">Donald review</p>
        <p className="text-sm text-muted-foreground">
          Review the active recommendation, approve it, or request improvement. {FINAL_ROUTE_SCOPE_COPY}
        </p>
      </div>

      {(isImproved || improvedGenerationNotice) && operationalState === "pending_review" && (
        <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-medium">Improved recommendation ready for review</p>
          <p>This recommendation was generated using your feedback.</p>
          {improvedGenerationNotice && (
            <>
              <p>
                Generation {improvedGenerationNotice.generationNumber} —{" "}
                {improvedGenerationNotice.applicationStatus.replace("_", " ")}.
              </p>
              {improvedGenerationNotice.applicationNotes.length > 0 && (
                <ul className="list-disc space-y-1 pl-5">
                  {improvedGenerationNotice.applicationNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
              {improvedGenerationNotice.warnings.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-amber-900">
                  {improvedGenerationNotice.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <div className="space-y-4 rounded-md border border-primary bg-background p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active recommendation</p>
            <p className="text-lg font-semibold">{activeRecommendation.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {generationNumber > 1 && (
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-900">
                  Generation {generationNumber}
                </span>
              )}
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                Score {activeRecommendation.score}
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                Rank #{activeRecommendation.rank}
              </span>
              {activeRecommendation.recommendationStatus === "recommended" && (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Recommended
                </span>
              )}
              {activeRecommendation.recommendationStatus === "risky" && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  Risky
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatPreviewStatus(activeRecommendation.status)}
          </p>
        </div>

        {candidateRoutePreview.coordinateCoverage && (
          <CoordinateCoverageBanner coverage={candidateRoutePreview.coordinateCoverage} />
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Latest finish</p>
            <p className="text-sm font-medium">
              {planSummary?.formattedLatestFinishTime || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Deadline</p>
            <p className="text-sm font-medium">
              {planSummary?.allRunsFinishBeforeDeadline
                ? "Before 1 PM"
                : planSummary?.minutesBeforeOrAfterDeadline !== undefined
                  ? `Late by ${Math.abs(planSummary.minutesBeforeOrAfterDeadline)} min`
                  : "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Run split</p>
            <p className="text-sm font-medium">
              {activeRecommendation.summary.runCount} run(s), {activeRecommendation.summary.totalStops}{" "}
              stop(s)
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Self used</p>
            <p className="text-sm font-medium">
              {activeRecommendation.summary.selfUsed ? "Yes" : "No"}
            </p>
            {selfReasonNote && (
              <p className="text-xs text-muted-foreground mt-0.5">{selfReasonNote}</p>
            )}
          </div>
        </div>

        {planSummary?.allRunsFinishBeforeDeadline &&
          bufferMinutes !== undefined &&
          bufferMinutes >= 0 && (
            <p className="text-sm">
              <span className="text-muted-foreground">Buffer before 1 PM: </span>
              {bufferMinutes} min
            </p>
          )}

        {meetupBalanceNote && (
          <p className="text-sm text-muted-foreground">{meetupBalanceNote}</p>
        )}

        {planSummary?.runFinishTimes && (
          <div className="grid gap-2 sm:grid-cols-3 text-sm">
            {Object.entries(planSummary.runFinishTimes).map(([runSlot, finishIso]) => (
              <div key={runSlot}>
                <span className="text-muted-foreground">Run {runSlot}: </span>
                {finishIso ? formatDateTime(finishIso) : "—"}
              </div>
            ))}
          </div>
        )}

        {meetupAddress && (
          <div className="text-sm">
            <span className="text-muted-foreground">Meet-up / handoff: </span>
            {meetupAddress}
            {activeRecommendation.handoffPlan?.selectedMeetup?.meetupFixedStopPosition !==
              undefined && (
              <span className="text-muted-foreground">
                {" "}
                (stop #{activeRecommendation.handoffPlan.selectedMeetup.meetupFixedStopPosition})
              </span>
            )}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium">Why this plan</p>
          <p className="text-sm">{activeRecommendation.decisionSummary}</p>
          {operationalNotes.length > 1 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {operationalNotes.slice(1, 4).map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          {activeRecommendation.cons.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900/90">
              {activeRecommendation.cons.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {candidateRoutePreview.selectionNotes && (
            <p className="text-sm text-muted-foreground">{candidateRoutePreview.selectionNotes}</p>
          )}
        </div>

        {heroWarnings.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
            {heroWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </div>

      {(actionVisibility.showApproveButton || actionVisibility.showRequestImprovementButton) && (
        <div className="flex flex-wrap gap-2">
          {actionVisibility.showApproveButton && (
            <Button
              type="button"
              disabled={submitLoading}
              onClick={() => void submitReview("approve")}
            >
              {submitLoading && submitMode === "approve" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Approve Plan
            </Button>
          )}
          {actionVisibility.showRequestImprovementButton && !actionVisibility.showFeedbackFormAllowed && (
            <Button
              type="button"
              variant="outline"
              disabled={submitLoading}
              onClick={() => {
                setFeedbackText("");
                setFeedbackTags([]);
                setFeedbackOpen(true);
              }}
            >
              Request Improvement
            </Button>
          )}
        </div>
      )}

      {(actionVisibility.showFeedbackFormAllowed ||
        actionVisibility.showSubmittedFeedbackSummary) && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          {actionVisibility.showFeedbackFormAllowed ? (
            <>
              <p className="text-sm font-medium">Tell the agent how to improve this plan.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DELIVERY_AGENT_REVIEW_FEEDBACK_TAGS.map((tag) => (
                  <label key={tag.id} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={feedbackTags.includes(tag.id)}
                      onCheckedChange={(checked) => toggleTag(tag.id, checked === true)}
                    />
                    <span>{tag.label}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-agent-review-feedback">Additional notes</Label>
                <Textarea
                  id="delivery-agent-review-feedback"
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  placeholder="Explain what should change in the next candidate plan..."
                  rows={4}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitLoading}
                  onClick={() => void submitReview("request_improvement")}
                >
                  {submitLoading && submitMode === "request_improvement" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Submit Feedback
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setFeedbackOpen(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Feedback submitted</p>
              {submittedFeedback?.reviewedAt && (
                <p className="text-xs text-muted-foreground">
                  Submitted {formatDateTime(submittedFeedback.reviewedAt)}
                </p>
              )}
              {(submittedFeedback?.feedbackTags?.length ?? 0) > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {submittedFeedback?.feedbackTags?.map((tagId) => (
                    <li key={tagId}>{formatFeedbackTagLabel(tagId)}</li>
                  ))}
                </ul>
              )}
              {submittedFeedback?.feedbackText?.trim() && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {submittedFeedback.feedbackText}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {actionVisibility.showGenerateImprovedButton && (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">Next step</p>
          <p className="text-sm text-amber-800">
            Generate improved candidate plans from your submitted feedback.
          </p>
          <Button
            type="button"
            variant="default"
            disabled={generateLoading}
            onClick={() => void generateImprovedCandidatePlans()}
          >
            {generateLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Improved Candidate Plans
          </Button>
        </div>
      )}

      {savedMessage && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {savedMessage}
        </p>
      )}

      {operationalState === "approved" && (
        <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-900">Plan approved</p>
          <p className="text-sm text-green-800">{FINAL_ROUTE_SCOPE_COPY}</p>
        </div>
      )}

      {(operationalState === "approved" ||
        operationalState === "final_route_created" ||
        operationalState === "final_route_partial_created" ||
        operationalState === "final_route_missing_or_deleted") && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={() => setReopenDialogOpen(true)}
          >
            Reopen Review
          </Button>
        </div>
      )}

      {showFinalRouteSection && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          <div>
            <p className="font-medium">Final Route Optimizer runs</p>
            <p className="text-sm text-muted-foreground">{FINAL_ROUTE_SCOPE_COPY}</p>
          </div>

          {finalRouteMissing && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              These final Route Optimizer runs appear to be missing or deleted. Reset metadata, then
              regenerate final runs.
            </p>
          )}

          {finalRouteCreated && !finalRouteMissing && (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              Final Route Optimizer runs created.
            </p>
          )}

          {finalRoutePartial && (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Partial final Route Optimizer run creation</p>
              <p>
                {finalRouteMetadata?.creationError?.message ??
                  "Some final Route Optimizer runs were created. Retry missing final route runs."}
              </p>
            </div>
          )}

          {finalRouteMetadata?.finalRouteOptimizerStatus === "failed" && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {finalRouteMetadata.creationError?.message ??
                "Final Route Optimizer run creation failed."}
            </p>
          )}

          {(finalRouteMetadata?.routeSummaries?.length ?? 0) > 0 && !finalRouteMissing && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Created runs</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {finalRouteMetadata?.routeSummaries?.map((summary) => (
                  <div
                    key={summary.runSlot}
                    className="rounded border border-green-200 bg-green-50/50 p-3 text-sm"
                  >
                    <p className="font-medium">{summary.driverName}</p>
                    <p className="text-muted-foreground">{summary.stopCount} stop(s)</p>
                    {summary.detailsLink && (
                      <a
                        href={summary.detailsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        Open Route Optimizer details
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(finalRouteMetadata?.failedRouteSummaries?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Failed or missing runs</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {finalRouteMetadata?.failedRouteSummaries?.map((summary) => (
                  <div
                    key={summary.runSlot}
                    className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm"
                  >
                    <p className="font-medium">{summary.driverName}</p>
                    {summary.errorMessage && (
                      <p className="text-destructive">{summary.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {finalRouteMessage && <p className="text-sm text-muted-foreground">{finalRouteMessage}</p>}

          <div className="flex flex-wrap gap-2">
            {canCreateFinalRoute && !finalRouteCreated && (
              <Button
                type="button"
                onClick={() => void createFinalRouteRun()}
                disabled={finalRouteLoading}
                className="w-fit"
              >
                {finalRouteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {finalRoutePartial
                  ? "Retry Missing Final Route Runs"
                  : finalRouteMissing
                    ? "Regenerate Final Route Optimizer Runs"
                    : finalRouteMetadata?.finalRouteOptimizerStatus === "failed"
                      ? "Retry Final Route Optimizer Run"
                      : "Create Final Route Optimizer Runs"}
              </Button>
            )}

            {(finalRouteCreated || finalRoutePartial || finalRouteMissing) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetDialogOpen(true)}
                disabled={actionLoading}
              >
                Reset Final Route Optimizer Metadata
              </Button>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reopen the approved plan. Final Route Optimizer run creation will be paused
              until a new plan is approved. Existing Route Optimizer runs will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void reopenReview()} disabled={actionLoading}>
              Reopen Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset final Route Optimizer metadata?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears Kapioo&apos;s final run metadata so you can create runs again. It does not
              delete runs in the Route Optimization dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={resetRunsDeleted}
              onCheckedChange={(checked) => setResetRunsDeleted(checked === true)}
            />
            <span>These runs were deleted in the Route Optimization dashboard (test reset)</span>
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void resetFinalRouteMetadata()} disabled={actionLoading}>
              Reset Metadata
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
