import { buildOperationalExplanation } from "@/lib/agents/delivery/best-plan/operational";
import { buildCandidatePreview, buildSelfCandidatePreview } from "./test-fixtures";

describe("buildOperationalExplanation", () => {
  it("includes why Self was not used for 2-driver recommendation", () => {
    const result = buildOperationalExplanation({
      candidate: buildCandidatePreview(),
      score: 88,
      eligibleForRecommended: true,
      selfRecommendationReason: "not_applicable",
      operationalNotes: [],
    });

    expect(result.decisionSummary.toLowerCase()).toContain("2-driver");
    expect(result.decisionSummary.toLowerCase()).toContain("self");
  });

  it("includes why Self was recommended when 2-driver plans are unsafe", () => {
    const result = buildOperationalExplanation({
      candidate: buildSelfCandidatePreview(),
      score: 82,
      eligibleForRecommended: true,
      selfRecommendationReason: "required_for_deadline",
      operationalNotes: ["Self recommended because 2-driver plans are late or lack safe buffer before 1 PM."],
    });

    expect(result.decisionSummary.toLowerCase()).toContain("self");
    expect(result.operationalNotes.some((n) => n.toLowerCase().includes("self"))).toBe(true);
  });
});
