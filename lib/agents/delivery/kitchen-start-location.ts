export class KitchenStartLocationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KitchenStartLocationConfigError";
  }
}

export function getKapiooKitchenStartLocation(): string {
  const value = process.env.KAPIOO_KITCHEN_START_LOCATION?.trim();

  if (!value) {
    throw new KitchenStartLocationConfigError(
      "KAPIOO_KITCHEN_START_LOCATION is not configured"
    );
  }

  return value;
}
