import { buildDeliveryAgentDuplicateKey } from "@/lib/agents/delivery/run-log";

describe("buildDeliveryAgentDuplicateKey", () => {
  it("builds the expected key format", () => {
    expect(
      buildDeliveryAgentDuplicateKey({
        deliveryDate: "2026-05-29",
        profileId: "daily-v1-current-dt-ut",
      })
    ).toBe("daily-delivery-agent:2026-05-29:daily-v1-current-dt-ut");
  });

  it("trims deliveryDate and profileId", () => {
    expect(
      buildDeliveryAgentDuplicateKey({
        deliveryDate: " 2026-05-29 ",
        profileId: " daily-default ",
      })
    ).toBe("daily-delivery-agent:2026-05-29:daily-default");
  });

  it("supports the default routing profile id", () => {
    expect(
      buildDeliveryAgentDuplicateKey({
        deliveryDate: "2026-06-09",
        profileId: "daily-default",
      })
    ).toBe("daily-delivery-agent:2026-06-09:daily-default");
  });
});
