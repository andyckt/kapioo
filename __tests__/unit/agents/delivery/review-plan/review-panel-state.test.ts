import { describe, expect, it } from "vitest";

import {
  buildApproveReviewCandidateIds,
  isImprovedGeneration,
  resolveActiveRecommendationCandidateId,
  resolveReviewPanelActionVisibility,
} from "@/lib/agents/delivery/review-plan/review-panel-state";

describe("review-panel-state", () => {
  describe("resolveActiveRecommendationCandidateId", () => {
    it("returns trimmed recommended id", () => {
      expect(resolveActiveRecommendationCandidateId("  candidate:a  ")).toBe("candidate:a");
    });

    it("returns null when missing", () => {
      expect(resolveActiveRecommendationCandidateId(null)).toBeNull();
      expect(resolveActiveRecommendationCandidateId("")).toBeNull();
    });
  });

  describe("resolveReviewPanelActionVisibility", () => {
    it("shows approve and request improvement during pending_review", () => {
      expect(
        resolveReviewPanelActionVisibility({
          operationalState: "pending_review",
          feedbackFormOpen: false,
        })
      ).toEqual({
        showApproveButton: true,
        showRequestImprovementButton: true,
        showGenerateImprovedButton: false,
        showFeedbackFormAllowed: false,
        showSubmittedFeedbackSummary: false,
      });
    });

    it("hides approve during improvement_requested and shows generate", () => {
      expect(
        resolveReviewPanelActionVisibility({
          operationalState: "improvement_requested",
          feedbackFormOpen: false,
        })
      ).toEqual({
        showApproveButton: false,
        showRequestImprovementButton: false,
        showGenerateImprovedButton: true,
        showFeedbackFormAllowed: false,
        showSubmittedFeedbackSummary: true,
      });
    });

    it("shows feedback form only when open on pending_review", () => {
      expect(
        resolveReviewPanelActionVisibility({
          operationalState: "pending_review",
          feedbackFormOpen: true,
        }).showFeedbackFormAllowed
      ).toBe(true);
    });

    it("hides primary actions after approval", () => {
      const visibility = resolveReviewPanelActionVisibility({
        operationalState: "approved",
        feedbackFormOpen: false,
      });
      expect(visibility.showApproveButton).toBe(false);
      expect(visibility.showRequestImprovementButton).toBe(false);
      expect(visibility.showGenerateImprovedButton).toBe(false);
    });
  });

  describe("buildApproveReviewCandidateIds", () => {
    it("uses active recommendation for both ids without override", () => {
      expect(buildApproveReviewCandidateIds("gen2:candidate:a")).toEqual({
        recommendedCandidateId: "gen2:candidate:a",
        selectedCandidateId: "gen2:candidate:a",
        didDonaldOverrideRecommendation: false,
      });
    });
  });

  describe("isImprovedGeneration", () => {
    it("returns true when generation number is greater than 1", () => {
      expect(isImprovedGeneration(2)).toBe(true);
      expect(isImprovedGeneration(1)).toBe(false);
      expect(isImprovedGeneration(undefined)).toBe(false);
    });
  });
});
