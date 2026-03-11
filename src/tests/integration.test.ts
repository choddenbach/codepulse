import { describe, it, expect } from "bun:test";
import { analyzeProject } from "../analysis/project.ts";

describe("analyzeProject() integration", () => {
  it("analyzes the codepulse project itself", async () => {
    // Use the codepulse directory as a fixture
    const dir = process.cwd();
    const report = await analyzeProject(dir);

    expect(report.targetPath).toBe(dir);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(typeof report.overallGrade).toBe("string");
    expect(report.generatedAt).toBeTruthy();
    expect(Array.isArray(report.modules)).toBe(true);
    expect(Array.isArray(report.findings)).toBe(true);

    // All modules should have valid structure
    for (const module of report.modules) {
      expect(module.score).toBeGreaterThanOrEqual(0);
      expect(module.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(module.findings)).toBe(true);
      expect(typeof module.summary).toBe("string");
      expect(typeof module.name).toBe("string");
      expect(typeof module.label).toBe("string");
    }

    // Should have all 5 modules
    expect(report.modules).toHaveLength(5);
  }, 30_000);
});
