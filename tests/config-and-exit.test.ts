import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { determineExitCodeWithOptions, executeScan } from "../src/cli";
import { loadScanConfig } from "../src/config";
import type { AnalysisReport } from "../src/types";

const tempDirectories: string[] = [];

afterEach(() => {
  while (tempDirectories.length > 0) {
    rmSync(tempDirectories.pop()!, { force: true, recursive: true });
  }
});

describe("loadScanConfig", () => {
  test("discovers config files above the scan target", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "codepulse-config-"));
    tempDirectories.push(root);

    const nestedDir = path.join(root, "packages", "app", "src");
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(
      path.join(root, "codepulse.config.json"),
      JSON.stringify({ format: "json", modules: ["security"], exclude: ["fixtures", "generated/output.ts"], minScore: 91, failOnSeverity: "warning" }),
    );

    const loaded = loadScanConfig(nestedDir);

    expect(loaded.path).toBe(path.join(root, "codepulse.config.json"));
    expect(loaded.config).toEqual({
      format: "json",
      modules: ["security"],
      exclude: ["fixtures", "generated/output.ts"],
      outputPath: undefined,
      minScore: 91,
      failOnSeverity: "warning",
    });
  });

  test("loads outputPath from config files", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "codepulse-config-"));
    tempDirectories.push(root);

    writeFileSync(
      path.join(root, "codepulse.config.json"),
      JSON.stringify({ format: "html", outputPath: "reports/team/codepulse.html" }),
    );

    const loaded = loadScanConfig(root);

    expect(loaded.config).toEqual({
      format: "html",
      modules: undefined,
      exclude: undefined,
      outputPath: "reports/team/codepulse.html",
      minScore: undefined,
      failOnSeverity: undefined,
    });
  });
});

describe("determineExitCodeWithOptions", () => {
  test("fails when the report score misses the configured minimum", () => {
    expect(determineExitCodeWithOptions(createReport({ overallScore: 79 }), { minScore: 80, failOnSeverity: "none" })).toBe(1);
  });

  test("fails when findings meet the configured severity threshold", () => {
    const report = createReport({
      overallScore: 95,
      findings: [{ severity: "warning", message: "Potential issue detected." }],
    });

    expect(determineExitCodeWithOptions(report, { minScore: 80, failOnSeverity: "warning" })).toBe(1);
    expect(determineExitCodeWithOptions(report, { minScore: 80, failOnSeverity: "error" })).toBe(0);
  });
});

describe("executeScan", () => {
  test("writes JSON reports to a custom output path", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "codepulse-scan-"));
    tempDirectories.push(root);

    writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0" }));
    writeFileSync(path.join(root, "README.md"), "# Fixture\n");
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "index.ts"), "export function greet(name: string) { return `hi ${name}`; }\n");

    const outputPath = path.join(root, "reports", "scan.json");
    const exitCode = await executeScan({
      targetPath: root,
      format: "json",
      modules: ["complexity"],
      exclude: [],
      outputPath: "reports/scan.json",
      minScore: 0,
      failOnSeverity: "none",
    });

    expect(exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);

    const report = JSON.parse(readFileSync(outputPath, "utf8")) as AnalysisReport;
    expect(report.targetPath).toBe(root);
    expect(report.modules).toHaveLength(1);
    expect(report.modules[0]?.name).toBe("complexity");
  });
});

function createReport(overrides: Partial<AnalysisReport>): AnalysisReport {
  return {
    targetPath: "/tmp/project",
    generatedAt: "2026-03-11T00:00:00.000Z",
    overallScore: 88,
    overallGrade: "B+",
    modules: [],
    findings: [],
    ...overrides,
  };
}
