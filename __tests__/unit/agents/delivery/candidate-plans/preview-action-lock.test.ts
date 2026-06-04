import { describe, expect, it } from "vitest";

import {
  DeliveryAgentPreviewActionInFlightError,
  withDeliveryAgentPreviewActionLock,
} from "@/lib/agents/delivery/candidate-plans/preview-action-lock";

describe("lib/agents/delivery/candidate-plans/preview-action-lock", () => {
  it("rejects duplicate preview actions while the first action is still running", async () => {
    let releaseFirstAction: ((value: string) => void) | undefined;
    const firstAction = withDeliveryAgentPreviewActionLock(
      "cost-1a-lock-test",
      () =>
        new Promise<string>((resolve) => {
          releaseFirstAction = resolve;
        })
    );

    await expect(
      withDeliveryAgentPreviewActionLock("cost-1a-lock-test", async () => "second")
    ).rejects.toBeInstanceOf(DeliveryAgentPreviewActionInFlightError);

    releaseFirstAction?.("first");
    await expect(firstAction).resolves.toBe("first");
    await expect(
      withDeliveryAgentPreviewActionLock("cost-1a-lock-test", async () => "after-release")
    ).resolves.toBe("after-release");
  });
});
