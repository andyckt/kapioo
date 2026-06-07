import type { DeliveryAgentLearningLabel } from "@/lib/contracts/delivery-agent-learning";

export function getDeliveryAgentLearningLabelWeight(label: DeliveryAgentLearningLabel): number {
  switch (label) {
    case "positive":
      return 0.9;
    case "weak_positive":
      return 0.55;
    case "avoid_pattern":
      return 0.75;
    case "negative":
      return 0.5;
    case "uncertain":
      return 0.15;
    case "excluded":
      return 0;
  }
}
