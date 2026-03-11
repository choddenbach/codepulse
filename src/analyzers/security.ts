import type { ModuleResult } from "../types.ts";
import { collectProjectFiles, isSourceFile, lineNumberFromIndex } from "./shared.ts";

const CHECKS = [
  { pattern: /\beval\s*\(/g, message: "Use of eval() detected.", severity: "error" as const },
  { pattern: /new\s+Function\s*\(/g, message: "Dynamic Function constructor detected.", severity: "error" as const },
  { pattern: /AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{20,}/g, message: "Potential hard-coded secret detected.", severity: "error" as const },
  { pattern: /http:\/\//g, message: "Plain HTTP endpoint detected; prefer HTTPS.", severity: "warning" as const },
];

export async function analyzeSecurity(directory: string): Promise<ModuleResult> {
  const files = await collectProjectFiles(directory);
  const findings: ModuleResult["findings"] = [];

  for (const file of files.filter((candidate) => isSourceFile(candidate.relativePath, candidate.extension) || candidate.relativePath === ".env" || candidate.relativePath === "package.json")) {
    if (file.relativePath === ".env") {
      findings.push({ severity: "error", message: "A .env file is committed to the repository.", file: file.relativePath });
      continue;
    }

    for (const check of CHECKS) {
      const match = file.content.match(check.pattern);
      if (!match) continue;

      const firstIndex = file.content.search(check.pattern);
      findings.push({
        severity: check.severity,
        message: check.message,
        file: file.relativePath,
        line: firstIndex >= 0 ? lineNumberFromIndex(file.content, firstIndex) : undefined,
      });
    }
  }

  return {
    score: Math.max(0, 100 - findings.reduce((penalty, finding) => penalty + (finding.severity === "error" ? 20 : 10), 0)),
    summary: findings.length ? `${findings.length} security concern${findings.length === 1 ? "" : "s"} flagged.` : "No obvious security red flags found.",
    findings,
  };
}
