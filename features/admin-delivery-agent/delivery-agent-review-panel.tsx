"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DELIVERY_AGENT_REVIEW_FEEDBACK_TAGS } from "@/lib/agents/delivery/review-feedback-tags";
import type {
  DeliveryAgentCreateFinalRouteRunResponse,
  DeliveryAgentGetReviewPlanResponse,
  DeliveryAgentPreviewCandidatePlansResponse,
  DeliveryAgentPreviewResponse,
  DeliveryAgentReviewPlanResponse,
} from "@/lib/contracts/delivery-agent";

type ReviewSubmitMode = "approve_recommended" | "reject" | "needs_revision" | "approve_override";

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

export function DeliveryAgentReviewPanel({
  candidateRoutePreview,
  orderPreview,
  savedReview,
  selectedCandidateId,
  onSelectedCandidateIdChange,
  onReviewSaved,
}: {
  candidateRoutePreview: DeliveryAgentPreviewCandidatePlansResponse;
  orderPreview: DeliveryAgentPreviewResponse | null;
  savedReview: DeliveryAgentGetReviewPlanResponse["review"];
  selectedCandidateId: string;
  onSelectedCandidateIdChange: (candidateId: string) => void;
  onReviewSaved: (review: DeliveryAgentGetReviewPlanResponse["review"]) => void;
}) {
  const { toast } = useToast();
  const recommendedCandidateId = candidateRoutePreview.recommendedCandidateId;
  const recommendedCandidate = candidateRoutePreview.candidates.find(
    (candidate) => candidate.candidateId === recommendedCandidateId
  );

  const [feedbackText, setFeedbackText] = useState(savedReview?.donaldFeedbackText ?? "");
  const [feedbackTags, setFeedbackTags] = useState<string[]>(savedReview?.donaldFeedbackTags ?? []);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMode, setSubmitMode] = useState<ReviewSubmitMode | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [finalRouteLoading, setFinalRouteLoading] = useState(false);
  const [finalRouteMessage, setFinalRouteMessage] = useState<string | null>(null);

  const didOverride = useMemo(
    () =>
      Boolean(
        recommendedCandidateId &&
          selectedCandidateId &&
          selectedCandidateId !== recommendedCandidateId
      ),
    [recommendedCandidateId, selectedCandidateId]
  );

  const selectedCandidate = candidateRoutePreview.candidates.find(
    (candidate) => candidate.candidateId === selectedCandidateId
  );

  if (!recommendedCandidateId || !recommendedCandidate) {
    return null;
  }

  const toggleTag = (tagId: string, checked: boolean) => {
    setFeedbackTags((current) =>
      checked ? [...new Set([...current, tagId])] : current.filter((tag) => tag !== tagId)
    );
  };

  const hasFeedback = feedbackText.trim().length > 0 || feedbackTags.length > 0;
  const finalRouteMetadata = savedReview?.finalRouteOptimizerMetadata;
  const finalRouteCreated = finalRouteMetadata?.finalRouteOptimizerStatus === "created";
  const finalRoutePartial =
    finalRouteMetadata?.finalRouteOptimizerStatus === "partial_created";
  const canCreateFinalRoute = savedReview?.reviewStatus === "approved";

  const submitReview = async (mode: ReviewSubmitMode) => {
    if ((mode === "reject" || mode === "needs_revision") && !hasFeedback) {
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

    const reviewStatus =
      mode === "reject" ? "rejected" : mode === "needs_revision" ? "edited" : "approved";

    const selectedSummary = selectedCandidate
      ? {
          candidateId: selectedCandidate.candidateId,
          candidateName: selectedCandidate.name,
          score: selectedCandidate.score,
          rank: selectedCandidate.rank,
          recommendationStatus: selectedCandidate.recommendationStatus,
          decisionSummary: selectedCandidate.decisionSummary,
        }
      : undefined;

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
          recommendedCandidateId,
          selectedCandidateId,
          didDonaldOverrideRecommendation: didOverride,
          recommendedPlanSummary: candidateRoutePreview.recommendedPlanSummary ?? undefined,
          selectedPlanSummary: selectedSummary,
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
      onReviewSaved({
        deliveryAgentRunId: payload.data.deliveryAgentRunId,
        deliveryDate: candidateRoutePreview.deliveryDate,
        profileId: candidateRoutePreview.profileId,
        profileVersion: candidateRoutePreview.profileVersion,
        reviewStatus: payload.data.reviewStatus,
        reviewedAt: payload.data.reviewedAt,
        recommendedCandidateId: payload.data.recommendedCandidateId,
        selectedCandidateId: payload.data.selectedCandidateId,
        didDonaldOverrideRecommendation: payload.data.didDonaldOverrideRecommendation,
        donaldFeedbackText: feedbackText.trim() || undefined,
        donaldFeedbackTags: feedbackTags,
        selectedPlanSummary: selectedSummary,
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
    if (!savedReview || savedReview.reviewStatus !== "approved") {
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

  const scrollToAlternativeCandidates = () => {
    document
      .getElementById("delivery-agent-alternative-candidates")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4 rounded-md border border-primary/30 bg-primary/5 p-4">
      <div>
        <p className="font-medium">Donald review</p>
        <p className="text-sm text-muted-foreground">
          Review the recommended plan or choose a different candidate. Approved plans can proceed to
          final Route Optimizer run creation below.
        </p>
      </div>

      <div className="space-y-2 rounded-md border bg-background p-3">
        <p className="text-sm font-medium">System recommendation</p>
        <p className="text-sm">{recommendedCandidate.name}</p>
        <p className="text-sm text-muted-foreground">{recommendedCandidate.decisionSummary}</p>
        {candidateRoutePreview.selectionWarnings.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
            {candidateRoutePreview.selectionWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        {recommendedCandidate.blockingIssues.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
            {recommendedCandidate.blockingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        {recommendedCandidate.cons.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {recommendedCandidate.cons.map((con) => (
              <li key={con}>{con}</li>
            ))}
          </ul>
        )}
      </div>

      {didOverride && selectedCandidate && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Donald&apos;s selected candidate: <span className="font-medium">{selectedCandidate.name}</span>
          {" "}(overrides system recommendation)
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={submitLoading}
          onClick={() => {
            onSelectedCandidateIdChange(recommendedCandidateId);
            void submitReview(didOverride ? "approve_override" : "approve_recommended");
          }}
        >
          {submitLoading && submitMode === "approve_recommended" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {didOverride ? "Approve Selected Candidate" : "Approve Recommended Plan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submitLoading}
          onClick={() => {
            setFeedbackOpen(true);
            if (didOverride && !feedbackTags.includes("preferred_another_candidate")) {
              setFeedbackTags((current) => [...current, "preferred_another_candidate"]);
            }
          }}
        >
          Reject Plan
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submitLoading}
          onClick={() => {
            setFeedbackOpen(true);
            if (didOverride && !feedbackTags.includes("preferred_another_candidate")) {
              setFeedbackTags((current) => [...current, "preferred_another_candidate"]);
            }
          }}
        >
          Needs Revision
        </Button>
      </div>

      {(feedbackOpen || savedReview?.reviewStatus === "rejected" || savedReview?.reviewStatus === "edited") && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Feedback</p>
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
              placeholder="Explain what is wrong with the plan or why another candidate is better..."
              rows={4}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={submitLoading}
              onClick={() => void submitReview("reject")}
            >
              {submitLoading && submitMode === "reject" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Submit Rejection
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitLoading}
              onClick={() => void submitReview("needs_revision")}
            >
              {submitLoading && submitMode === "needs_revision" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Submit Needs Revision
            </Button>
          </div>
        </div>
      )}

      {savedMessage && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {savedMessage}
        </p>
      )}

      {savedReview?.reviewStatus && (
        <p className="text-xs text-muted-foreground">
          Last saved: {savedReview.reviewStatus}
          {savedReview.reviewedAt ? ` at ${savedReview.reviewedAt}` : ""}
        </p>
      )}

      {savedReview?.reviewStatus === "approved" && (
        <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-900">Next step: Create Final Route Optimizer Run</p>
          <p className="text-sm text-green-800">
            This plan is approved. Use the section below to create internal Route Optimizer runs.
            Driver sending will be added in a later milestone.
          </p>
        </div>
      )}

      {savedReview?.reviewStatus === "rejected" && (
        <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <div>
            <p className="text-sm font-medium text-destructive">Current recommended plan rejected</p>
            <p className="text-sm text-muted-foreground">
              This plan cannot be used to create a final Route Optimizer run. Review alternative
              candidates below, edit your feedback, or wait for feedback-based regeneration in a
              later milestone.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={scrollToAlternativeCandidates}>
              Review Alternative Candidates
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>
              Edit Feedback
            </Button>
            <Button type="button" variant="outline" size="sm" disabled>
              Regenerate Candidates Using Feedback (will be added in the next milestone)
            </Button>
          </div>
        </div>
      )}

      {savedReview?.reviewStatus === "edited" && (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div>
            <p className="text-sm font-medium text-amber-900">Donald requested revision</p>
            <p className="text-sm text-amber-800">
              The agent needs to generate revised candidates from your feedback in a later milestone.
              Final Route Optimizer run creation is unavailable until a plan is approved.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>
              Edit Feedback
            </Button>
            <Button type="button" variant="outline" size="sm" disabled>
              Regenerate Candidates Using Feedback (will be added in the next milestone)
            </Button>
          </div>
        </div>
      )}

      {canCreateFinalRoute && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          <div>
            <p className="font-medium">Final Route Optimizer run</p>
            <p className="text-sm text-muted-foreground">
              This creates internal Route Optimizer runs only. Driver sending will be added in a
              later milestone.
            </p>
          </div>

          {finalRouteCreated ? (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              Final Route Optimizer Run Created.
            </p>
          ) : finalRoutePartial ? (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Partial final Route Optimizer run creation</p>
              <p>
                {finalRouteMetadata?.creationError?.message ??
                  "Some final Route Optimizer runs were created. Retry missing final route runs."}
              </p>
            </div>
          ) : finalRouteMetadata?.finalRouteOptimizerStatus === "failed" ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {finalRouteMetadata.creationError?.message ??
                "Final Route Optimizer run creation failed."}
            </p>
          ) : null}

          {(finalRouteMetadata?.routeSummaries?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Created runs</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {finalRouteMetadata?.routeSummaries?.map((summary) => (
                  <div key={summary.runSlot} className="rounded border border-green-200 bg-green-50/50 p-3 text-sm">
                    <p className="font-medium">
                      {summary.driverName}
                    </p>
                    <p className="text-muted-foreground">{summary.stopCount} stop(s)</p>
                    {summary.estimatedFinishTime && (
                      <p className="text-muted-foreground">
                        Finish: {summary.estimatedFinishTime}
                      </p>
                    )}
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
                  <div key={summary.runSlot} className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <p className="font-medium">{summary.driverName}</p>
                    <p className="text-muted-foreground">{summary.stopCount} stop(s)</p>
                    {summary.errorMessage && (
                      <p className="text-destructive">{summary.errorMessage}</p>
                    )}
                    {summary.field && (
                      <p className="text-muted-foreground">
                        Missing field: {summary.field}
                        {summary.customerIndex !== undefined
                          ? ` (customer ${summary.customerIndex + 1})`
                          : ""}
                      </p>
                    )}
                    {summary.orderId && (
                      <p className="text-muted-foreground">Order: {summary.orderId}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {finalRouteMessage && <p className="text-sm text-muted-foreground">{finalRouteMessage}</p>}

          {!finalRouteCreated && (
            <Button
              type="button"
              onClick={() => void createFinalRouteRun()}
              disabled={finalRouteLoading}
              className="w-fit"
            >
              {finalRouteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {finalRoutePartial
                ? "Retry Missing Final Route Runs"
                : finalRouteMetadata?.finalRouteOptimizerStatus === "failed"
                  ? "Retry Final Route Optimizer Run"
                  : "Create Final Route Optimizer Run"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function DeliveryAgentSelectCandidateButton({
  candidateId,
  candidateName,
  selectedCandidateId,
  recommendedCandidateId,
  disabled,
  onSelect,
}: {
  candidateId: string;
  candidateName: string;
  selectedCandidateId: string;
  recommendedCandidateId: string | null;
  disabled?: boolean;
  onSelect: (candidateId: string) => void;
}) {
  if (candidateId === recommendedCandidateId) {
    return null;
  }

  const isSelected = selectedCandidateId === candidateId;

  return (
    <Button
      type="button"
      variant={isSelected ? "default" : "outline"}
      size="sm"
      disabled={disabled}
      onClick={() => onSelect(candidateId)}
    >
      {isSelected ? "Selected instead of recommendation" : "Select this candidate instead"}
    </Button>
  );
}
