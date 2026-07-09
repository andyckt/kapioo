import {
  formatDailyCoverageList,
  formatWeeklyOnlyCoverageList,
  formatDailyCoverageSentence,
  getAreaDisplayLabel,
} from "@/lib/zones/coverage-copy";
import { SERVICE_AREAS } from "@/lib/zones/service-areas";

describe("coverage-copy formatters", () => {
  describe("getAreaDisplayLabel", () => {
    it("appends partial qualifier for areas with dailyPartial=true", () => {
      const partialAreas = SERVICE_AREAS.filter((a) => a.display.dailyPartial).map((a) => a.label);
      expect(partialAreas).toContain("Richmond Hill");
      for (const label of partialAreas) {
        expect(getAreaDisplayLabel(label, "daily", "en")).toBe(`${label} (selected areas)`);
        expect(getAreaDisplayLabel(label, "daily", "zh")).toBe(`${label}（部分区域）`);
      }
    });

    it("returns plain label for areas with dailyPartial=false", () => {
      const nonPartialDailyAreas = SERVICE_AREAS
        .filter((a) => a.display.daily && !a.display.dailyPartial)
        .map((a) => a.label);
      expect(nonPartialDailyAreas).toContain("Downtown Toronto");
      for (const label of nonPartialDailyAreas) {
        expect(getAreaDisplayLabel(label, "daily", "en")).toBe(label);
      }
    });

    it("returns plain label for weekly regardless of dailyPartial", () => {
      // Richmond Hill: dailyPartial=true for daily, but weekly shows plain
      expect(getAreaDisplayLabel("Richmond Hill", "weekly", "en")).toBe("Richmond Hill");
    });

    it("returns the label unchanged for an unknown area", () => {
      expect(getAreaDisplayLabel("Atlantis", "daily", "en")).toBe("Atlantis");
    });
  });

  describe("formatDailyCoverageList", () => {
    it("includes all daily display areas", () => {
      const dailyLabels = SERVICE_AREAS.filter((a) => a.display.daily).map((a) => a.label);
      const list = formatDailyCoverageList("en");
      for (const label of dailyLabels) {
        expect(list).toContain(label);
      }
    });

    it("excludes weekly-only area labels", () => {
      const weeklyOnlyLabels = SERVICE_AREAS
        .filter((a) => a.display.weekly && !a.display.daily)
        .map((a) => a.label);
      const dailyLabels = SERVICE_AREAS.filter((a) => a.display.daily).map((a) => a.label);
      for (const label of weeklyOnlyLabels) {
        expect(dailyLabels).not.toContain(label);
      }
    });

    it("emits partial qualifier for Richmond Hill in English", () => {
      expect(formatDailyCoverageList("en")).toContain("Richmond Hill (selected areas)");
    });

    it("emits partial qualifier for Richmond Hill in Chinese", () => {
      expect(formatDailyCoverageList("zh")).toContain("Richmond Hill（部分区域）");
    });

    it("does NOT emit partial qualifier for Downtown Toronto", () => {
      expect(formatDailyCoverageList("en")).not.toContain("Downtown Toronto (selected areas)");
      expect(formatDailyCoverageList("en")).toContain("Downtown Toronto");
    });
  });

  describe("formatWeeklyOnlyCoverageList", () => {
    it("includes only weekly-only areas (not daily areas)", () => {
      const list = formatWeeklyOnlyCoverageList("en");
      expect(list).toContain("Scarborough");
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
