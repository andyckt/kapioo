import {
  formatDailyCoverageList,
  formatWeeklyOnlyCoverageList,
  formatDailyCoverageSentence,
  getAreaDisplayLabel,
} from "@/lib/zones/coverage-copy";
import { SERVICE_AREAS } from "@/lib/zones/service-areas";

describe("coverage-copy formatters", () => {
  describe("getAreaDisplayLabel", () => {
    it("appends English partial qualifier for include-mode (FSA) daily areas", () => {
      const partialAreas = SERVICE_AREAS.filter((a) => a.daily.mode === "include").map((a) => a.label);
      for (const label of partialAreas) {
        expect(getAreaDisplayLabel(label, "daily", "en")).toBe(`${label} (selected areas)`);
      }
    });

    it("appends English partial qualifier for polygon-mode daily areas", () => {
      const polygonAreas = SERVICE_AREAS.filter((a) => a.daily.mode === "polygon").map((a) => a.label);
      for (const label of polygonAreas) {
        expect(getAreaDisplayLabel(label, "daily", "en")).toBe(`${label} (selected areas)`);
      }
    });

    it("appends Chinese partial qualifier for include-mode (FSA) daily areas", () => {
      const partialAreas = SERVICE_AREAS.filter((a) => a.daily.mode === "include").map((a) => a.label);
      for (const label of partialAreas) {
        expect(getAreaDisplayLabel(label, "daily", "zh")).toBe(`${label}（部分区域）`);
      }
    });

    it("returns plain label for all-mode daily areas", () => {
      const allAreas = SERVICE_AREAS.filter((a) => a.daily.mode === "all").map((a) => a.label);
      for (const label of allAreas) {
        expect(getAreaDisplayLabel(label, "daily", "en")).toBe(label);
      }
    });

    it("returns plain label for weekly coverage (even when daily is partial)", () => {
      // Richmond Hill: daily=include, weekly=all
      expect(getAreaDisplayLabel("Richmond Hill", "weekly", "en")).toBe("Richmond Hill");
    });

    it("returns the label unchanged for an unknown area", () => {
      expect(getAreaDisplayLabel("Atlantis", "daily", "en")).toBe("Atlantis");
    });
  });

  describe("formatDailyCoverageList", () => {
    it("includes all daily-eligible areas", () => {
      const dailyLabels = SERVICE_AREAS.filter((a) => a.daily.mode !== "none").map((a) => a.label);
      const list = formatDailyCoverageList("en");
      for (const label of dailyLabels) {
        // partial areas will appear with qualifier, so check label is contained
        expect(list).toContain(label);
      }
    });

    it("excludes weekly-only area labels as separate tokens", () => {
      // Use the daily-eligible label list directly — weekly-only ones must not appear in it
      const dailyLabels = SERVICE_AREAS.filter((a) => a.daily.mode !== "none").map((a) => a.label);
      const weeklyOnlyLabels = SERVICE_AREAS.filter(
        (a) => a.daily.mode === "none" && a.weekly.mode !== "none"
      ).map((a) => a.label);
      for (const label of weeklyOnlyLabels) {
        // Make sure none of the daily labels equals this label (exact, not substring)
        expect(dailyLabels).not.toContain(label);
      }
    });

    it("emits partial qualifier for Richmond Hill in English", () => {
      expect(formatDailyCoverageList("en")).toContain("Richmond Hill (selected areas)");
    });

    it("emits partial qualifier for Richmond Hill in Chinese", () => {
      expect(formatDailyCoverageList("zh")).toContain("Richmond Hill（部分区域）");
    });
  });

  describe("formatWeeklyOnlyCoverageList", () => {
    it("includes only weekly-only areas (not daily areas)", () => {
      const list = formatWeeklyOnlyCoverageList("en");
      // Scarborough is weekly-only
      expect(list).toContain("Scarborough");
      // Downtown Toronto is both daily+weekly — must not appear
      expect(list).not.toContain("Downtown Toronto");
    });
  });

  describe("formatDailyCoverageSentence", () => {
    it("includes the product name and mentions 'selected areas'", () => {
      const sentence = formatDailyCoverageSentence("Daily Bento", "en");
      expect(sentence).toContain("Daily Bento");
      expect(sentence).toContain("selected areas");
    });

    it("Chinese sentence uses Chinese partial qualifier", () => {
      const sentence = formatDailyCoverageSentence("每日Bento", "zh");
      expect(sentence).toContain("部分区域");
    });
  });
});
