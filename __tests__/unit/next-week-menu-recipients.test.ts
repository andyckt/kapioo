import {
  buildNextWeekMenuEligibleQuery,
  NEXT_WEEK_MENU_ELIGIBLE_QUERY,
} from "@/lib/next-week-menu-email/recipients";
import {
  parseEmailListFromText,
} from "@/lib/next-week-menu-email/parse-emails";

describe("parseEmailListFromText", () => {
  it("parses newline-separated emails and dedupes", () => {
    const result = parseEmailListFromText(`
      maggiechenjq@gmail.com
      frankyfang0324@gmail.com
      maggiechenjq@gmail.com
    `);

    expect(result.valid).toEqual([
      "maggiechenjq@gmail.com",
      "frankyfang0324@gmail.com",
    ]);
    expect(result.duplicateCount).toBe(1);
    expect(result.invalid).toEqual([]);
  });

  it("flags invalid addresses", () => {
    const result = parseEmailListFromText("not-an-email\njoeybz1992@gmail.com");

    expect(result.valid).toEqual(["joeybz1992@gmail.com"]);
    expect(result.invalid).toEqual(["not-an-email"]);
  });

  it("supports comma and semicolon separators", () => {
    const result = parseEmailListFromText(
      "a@example.com,b@example.com;c@example.com\nd@example.com"
    );

    expect(result.valid).toEqual([
      "a@example.com",
      "b@example.com",
      "c@example.com",
      "d@example.com",
    ]);
  });
});

describe("buildNextWeekMenuEligibleQuery", () => {
  it("returns the base eligible query when blocklist is empty", () => {
    expect(buildNextWeekMenuEligibleQuery([])).toEqual(NEXT_WEEK_MENU_ELIGIBLE_QUERY);
  });

  it("adds blocklisted emails to email $nin when blocklist is non-empty", () => {
    expect(buildNextWeekMenuEligibleQuery(["blocked@example.com"])).toEqual({
      ...NEXT_WEEK_MENU_ELIGIBLE_QUERY,
      email: {
        $exists: true,
        $nin: ["", null, "blocked@example.com"],
      },
    });
  });

  it("preserves all blocklisted emails in $nin", () => {
    const query = buildNextWeekMenuEligibleQuery([
      "a@example.com",
      "b@example.com",
    ]);

    expect(query.email).toEqual({
      $exists: true,
      $nin: ["", null, "a@example.com", "b@example.com"],
    });
  });
});
