export class DeliveryAgentPreviewActionInFlightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryAgentPreviewActionInFlightError";
  }
}

const globalPreviewLocks = globalThis as typeof globalThis & {
  __kapiooDeliveryAgentPreviewLocks?: Set<string>;
};

const inFlightLocks =
  globalPreviewLocks.__kapiooDeliveryAgentPreviewLocks ??
  new Set<string>();

globalPreviewLocks.__kapiooDeliveryAgentPreviewLocks = inFlightLocks;

export async function withDeliveryAgentPreviewActionLock<T>(
  lockKey: string,
  action: () => Promise<T>
): Promise<T> {
  if (inFlightLocks.has(lockKey)) {
    throw new DeliveryAgentPreviewActionInFlightError(
      "A delivery agent preview for this date is already running. Wait for it to finish before starting another one."
    );
  }

  inFlightLocks.add(lockKey);
  try {
    return await action();
  } finally {
    inFlightLocks.delete(lockKey);
  }
}
