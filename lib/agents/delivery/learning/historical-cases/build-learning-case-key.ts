const LEARNING_CASE_KEY_PREFIX = "delivery-agent-learning-case";

export function buildDeliveryAgentLearningCaseKey(input: {
  deliveryDate: string;
  profileId: string;
}): string {
  const deliveryDate = input.deliveryDate.trim();
  const profileId = input.profileId.trim();

  if (!deliveryDate) {
    throw new Error("deliveryDate is required for learning case key");
  }

  if (!profileId) {
    throw new Error("profileId is required for learning case key");
  }

  return `${LEARNING_CASE_KEY_PREFIX}:${deliveryDate}:${profileId}`;
}
