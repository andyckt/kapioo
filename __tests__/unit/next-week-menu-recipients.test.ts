import {
  parseEmailList,
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
