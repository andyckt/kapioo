const { settingsFindOneMock, settingsFindOneAndUpdateMock } = vi.hoisted(() => ({
  settingsFindOneMock: vi.fn(),
  settingsFindOneAndUpdateMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/Settings", () => ({
  default: {
    findOne: settingsFindOneMock,
    findOneAndUpdate: settingsFindOneAndUpdateMock,
  },
}));

import {
  addToNextWeekMenuBlocklist,
  getNextWeekMenuBlocklist,
  normalizeBlocklistEmail,
  NEXT_WEEK_MENU_BLOCKLIST_SETTINGS_KEY,
  removeFromNextWeekMenuBlocklist,
} from "@/lib/next-week-menu-email/blocklist";

describe("normalizeBlocklistEmail", () => {
  it("trims and lowercases emails", () => {
    expect(normalizeBlocklistEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("next-week-menu blocklist service", () => {
  let storedEmails: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    storedEmails = [];

    settingsFindOneMock.mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue(
        storedEmails.length > 0
          ? { key: NEXT_WEEK_MENU_BLOCKLIST_SETTINGS_KEY, value: storedEmails }
          : null
      ),
    }));

    settingsFindOneAndUpdateMock.mockImplementation((_filter, update) => {
      storedEmails = Array.isArray(update.value) ? [...update.value] : [];
      return Promise.resolve({
        key: NEXT_WEEK_MENU_BLOCKLIST_SETTINGS_KEY,
        value: storedEmails,
      });
    });
  });

  it("returns an empty list when no setting exists", async () => {
    await expect(getNextWeekMenuBlocklist()).resolves.toEqual([]);
  });

  it("adds valid emails and dedupes existing entries", async () => {
    storedEmails = ["existing@example.com"];

    const result = await addToNextWeekMenuBlocklist([
      " New@Example.com ",
      "existing@example.com",
      "another@example.com",
      "not-an-email",
    ]);

    expect(result.added).toEqual(["new@example.com", "another@example.com"]);
    expect(result.duplicates).toEqual(["existing@example.com"]);
    expect(result.invalid).toEqual(["not-an-email"]);
    expect(result.emails).toEqual([
      "existing@example.com",
      "new@example.com",
      "another@example.com",
    ]);
  });

  it("removes emails from the stored list", async () => {
    storedEmails = ["keep@example.com", "remove@example.com"];

    const result = await removeFromNextWeekMenuBlocklist([
      "remove@example.com",
      "missing@example.com",
    ]);

    expect(result.removed).toEqual(["remove@example.com"]);
    expect(result.notFound).toEqual(["missing@example.com"]);
    expect(result.emails).toEqual(["keep@example.com"]);
  });
});
