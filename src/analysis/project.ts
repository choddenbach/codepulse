import path from "node:path";

import {
  ALL_MODULES,
  clampScore,
  coarseGrade,
  scoreToGrade,
  severityRank,
  type AnalysisReport,
  type LegacyAnalysisReport,
  type ModuleName,
  type ModuleResult,
} from "../types.ts";
import { analyzeComplexity } from "../analyzers/complexity.ts";
import { analyzeDependencies } from "../analyzers/dependencies.ts";
import { analyzeDocumentation } from "../analyzers/documentation.ts";
import { analyzeSecurity } from "../analyzers/security.ts";
import { analyzeTests } from "../analyzers/tests.ts";

const MODULE_LABELS: Record<ModuleName, string> = {
  complexity: "Complexity",
  deps: "Dependencies",
  documentation: "Documentation",
  tests: "Tests",
  security: "Security",
};

export async function analyzeProject(
  targetPath: string,
  requestedModules: ModuleName[] = [...ALL_MODULES],
): Promise<AnalysisReport> {
  const rootPath = path.resolve(targetPath);
  const moduleResults = await Promise.all(
    requestedModules.map(async (moduleName) => {
      const result = await runAnalyzer(moduleName, rootPath);
      switch (moduleName) {
        case "complexity":
        case "deps":
        case "documentation":
        case "tests":
        case "security":
          return {
            ...result,
            name: moduleName,
            label: MODULE_LABELS[moduleName],
            findings: result.findings.map((finding) => ({
              ...finding,
              module: moduleName,
              filePath: finding.filePath ?? finding.file,
            })),
          } satisfies ModuleResult;
      }
    }),
  );

  const overallScore =
    moduleResults.length === 0
      ? 0
      : clampScore(moduleResults.reduce((total, item) => total + item.score, 0) / moduleResults.length);

  const findings = moduleResults
    .flatMap((moduleResult) => moduleResult.findings)
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity))
    .slice(0, 10);

  return {
    targetPath: rootPath,
    generatedAt: new Date().toISOString(),
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    modules: moduleResults,
    findings,
  };
}
export async function analyze(targetPath: string): Promise<LegacyAnalysisReport> {
  const report = await analyzeProject(targetPath, ["complexity", "deps", "documentation", "tests", "security"]);
  return {
    directory: report.targetPath,
    analyzedAt: report.generatedAt,
    overallScore: report.overallScore,
    grade: coarseGrade(report.overallScore),
    modules: {
      complexity: report.modules.find((moduleResult) => moduleResult.name === "complexity")!,
      deps: report.modules.find((moduleResult) => moduleResult.name === "deps")!,
      documentation: report.modules.find((moduleResult) => moduleResult.name === "documentation")!,
      tests: report.modules.find((moduleResult) => moduleResult.name === "tests")!,
      security: report.modules.find((moduleResult) => moduleResult.name === "security")!,
    },
  };
}

async function runAnalyzer(moduleName: ModuleName, rootPath: string): Promise<ModuleResult> {
  switch (moduleName) {
    case "complexity":
      return analyzeComplexity(rootPath);
    case "deps":
      return analyzeDependencies(rootPath);
    case "documentation":
      return analyzeDocumentation(rootPath);
    case "tests":
      return analyzeTests(rootPath);
    case "security":
      return analyzeSecurity(rootPath);
  }
}
