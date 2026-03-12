import type { ModuleResult } from "../types.ts";
import { collectProjectFiles, isSourceFile, isTestFile } from "./shared.ts";

export async function analyzeTests(directory: string, excludePaths: string[] = []): Promise<ModuleResult> {
  const files = await collectProjectFiles(directory, { excludePaths });
  const sourceFiles = files.filter((file) => isSourceFile(file.relativePath, file.extension));
  const testFiles = files.filter((file) => isTestFile(file.relativePath));
  const findings: ModuleResult["findings"] = [];

  const ratio = sourceFiles.length === 0 ? (testFiles.length > 0 ? 1 : 0) : testFiles.length / sourceFiles.length;
  let score = Math.round(Math.min(100, ratio * 100));

  if (testFiles.length === 0) {
    findings.push({ severity: "error", message: "No automated test files found." });
    score = 0;
  } else if (ratio < 0.5) {
    findings.push({ severity: "warning", message: "Test coverage looks light relative to the amount of source code." });
  }

  return {
    score,
    summary: `${testFiles.length} test file${testFiles.length === 1 ? "" : "s"} for ${sourceFiles.length} source file${sourceFiles.length === 1 ? "" : "s"}.`,
    findings,
  };
}
