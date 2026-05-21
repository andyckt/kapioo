const {
  promoFindOneMock,
  promoCreateMock,
  promoFindByIdAndDeleteMock,
  userFindByIdMock,
  sendReferralRewardEmailMock,
} = vi.hoisted(() => ({
  promoFindOneMock: vi.fn(),
  promoCreateMock: vi.fn(),
  promoFindByIdAndDeleteMock: vi.fn(),
  userFindByIdMock: vi.fn(),
  sendReferralRewardEmailMock: vi.fn(),
}));

vi.mock("@/models/PromoCode", () => ({
  default: {
    findOne: promoFindOneMock,
    create: promoCreateMock,
    findByIdAndDelete: promoFindByIdAndDeleteMock,
  },
}));

vi.mock("@/models/User", () => ({
  default: {
    findById: userFindByIdMock,
  },
}));

vi.mock("@/lib/services/email", () => ({
  sendReferralRewardEmail: sendReferralRewardEmailMock,
}));

import { ApiError } from "@/lib/api/errors";
import { createAdminPromoCode } from "@/lib/promo-codes/create-admin-promo-code";

const baseBody = {
  code: " REFER10 ",
  discountType: "fixed" as const,
  discountValue: 10,
  description: "Referral reward",
  active: true,
  appliesTo: "all",
  isReferralPromo: false,
};

const referrerId = "507f1f77bcf86cd799439011";
const refereeId = "507f1f77bcf86cd799439012";

function mockCreatedPromo(overrides: Record<string, unknown> = {}) {
  const referral = {
    referrerUserId: referrerId,
    refereeUserId: refereeId,
    referrerEmail: "referrer@example.com",
    referrerName: "Referrer Name",
    refereeName: "Referee Name",
    rewardEmailSentAt: undefined as Date | undefined,
  };

  const promo = {
    _id: "507f1f77bcf86cd799439013",
    code: "REFER10",
    discountType: "fixed",
    discountValue: 10,
    referral,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  if ("referral" in overrides && overrides.referral === undefined) {
    promo.referral = undefined as unknown as typeof referral;
  }

  promoCreateMock.mockResolvedValue(promo);
  return promo;
}

describe("lib/promo-codes/create-admin-promo-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    promoFindOneMock.mockResolvedValue(null);
    userFindByIdMock.mockImplementation((id: string) => ({
      lean: async () => {
        if (id === referrerId) {
          return {
            _id: referrerId,
            email: "referrer@example.com",
            name: "Referrer Name",
            languagePreference: "en",
          };
        }

        if (id === refereeId) {
          return {
            _id: refereeId,
            email: "referee@example.com",
            name: "Referee Name",
          };
        }

        return null;
      },
    }));
    sendReferralRewardEmailMock.mockResolvedValue(undefined);
    process.env.EMAIL_SEND_BASE_URL = "https://kapioo.com";
  });

  it("creates a standard promo without referral metadata or email", async () => {
    const created = mockCreatedPromo({ referral: undefined });
    const result = await createAdminPromoCode(baseBody);

    expect(result).toBe(created);
    expect(promoCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "REFER10",
        discountType: "fixed",
        discountValue: 10,
      })
    );
    expect(promoCreateMock.mock.calls[0][0].referral).toBeUndefined();
    expect(sendReferralRewardEmailMock).not.toHaveBeenCalled();
  });

  it("creates a referral promo, sends email, and stamps rewardEmailSentAt", async () => {
    const created = mockCreatedPromo();
    const result = await createAdminPromoCode({
      ...baseBody,
      isReferralPromo: true,
      referrerUserId: referrerId,
      refereeUserId: refereeId,
    });

    expect(result).toBe(created);
    expect(promoCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referral: expect.objectContaining({
          referrerEmail: "referrer@example.com",
          referrerName: "Referrer Name",
          refereeName: "Referee Name",
        }),
      })
    );
    expect(sendReferralRewardEmailMock).toHaveBeenCalledWith(
      "referrer@example.com",
      expect.objectContaining({
        promoCode: "REFER10",
        referredFriendName: "Referee Name",
        discountLabel: "$10 off",
        language: "en",
      })
    );
    expect(created.save).toHaveBeenCalled();
    expect(created.referral.rewardEmailSentAt).toBeInstanceOf(Date);
  });

  it("rolls back the promo when referral email sending fails", async () => {
    const created = mockCreatedPromo();
    sendReferralRewardEmailMock.mockRejectedValue(new Error("Resend failed"));

    await expect(
      createAdminPromoCode({
        ...baseBody,
        isReferralPromo: true,
        referrerUserId: referrerId,
        refereeUserId: refereeId,
      })
    ).rejects.toMatchObject({
      message: "Promo code was not created because the referral reward email failed to send.",
      status: 500,
    });

    expect(promoFindByIdAndDeleteMock).toHaveBeenCalledWith(created._id);
    expect(created.save).not.toHaveBeenCalled();
  });

  it("rejects referral promos when referrer and referee are the same user", async () => {
    await expect(
      createAdminPromoCode({
        ...baseBody,
        isReferralPromo: true,
        referrerUserId: referrerId,
        refereeUserId: referrerId,
      })
    ).rejects.toBeInstanceOf(ApiError);

    expect(promoCreateMock).not.toHaveBeenCalled();
  });

  it("rejects referral promos when referrer has no email", async () => {
    userFindByIdMock.mockImplementation((id: string) => ({
      lean: async () => {
        if (id === referrerId) {
          return {
            _id: referrerId,
            email: "",
            name: "Referrer Name",
          };
        }

        if (id === refereeId) {
          return {
            _id: refereeId,
            email: "referee@example.com",
            name: "Referee Name",
          };
        }

        return null;
      },
    }));

    await expect(
      createAdminPromoCode({
        ...baseBody,
        isReferralPromo: true,
        referrerUserId: referrerId,
        refereeUserId: refereeId,
      })
    ).rejects.toMatchObject({
      message: "Referrer account must have an email address",
      status: 400,
    });

    expect(promoCreateMock).not.toHaveBeenCalled();
  });

  it("rejects duplicate promo codes before referral side effects run", async () => {
    promoFindOneMock.mockResolvedValue({ code: "REFER10" });

    await expect(
      createAdminPromoCode({
        ...baseBody,
        isReferralPromo: true,
        referrerUserId: referrerId,
        refereeUserId: refereeId,
      })
    ).rejects.toMatchObject({
      message: "Promo code already exists",
      status: 409,
    });

    expect(sendReferralRewardEmailMock).not.toHaveBeenCalled();
  });
});
