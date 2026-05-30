export class DeliveryPlanningProfileNotFoundError extends Error {
  profileId: string;

  constructor(profileId: string) {
    super(`Delivery planning profile not found: ${profileId}`);
    this.name = "DeliveryPlanningProfileNotFoundError";
    this.profileId = profileId;
  }
}

export class DeliveryPlanningProfileValidationError extends Error {
  fieldPaths: string[];

  constructor(message: string, fieldPaths: string[]) {
    super(message);
    this.name = "DeliveryPlanningProfileValidationError";
    this.fieldPaths = fieldPaths;
  }
}
