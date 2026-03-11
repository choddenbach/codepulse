import type { ModuleResult } from "../types.ts";
import { collectProjectFiles, isSourceFile } from "./shared.ts";

interface FunctionMetric {
  name: string;
  line: number;
  complexity: number;
}

export async function analyzeComplexity(directory: string): Promise<ModuleResult> {
  const files = (await collectProjectFiles(directory)).filter((file) => isSourceFile(file.relativePath, file.extension));
  const findings: ModuleResult["findings"] = [];
  const metrics: Array<FunctionMetric & { filePath: string }> = [];

  for (const file of files) {
    metrics.push(...extractFunctions(file.content).map((metric) => ({ ...metric, filePath: file.relativePath })));
  }

  const complexFunctions = metrics.filter((metric) => metric.complexity > 10);
  for (const metric of complexFunctions.slice(0, 8)) {
    findings.push({
      severity: metric.complexity > 15 ? "error" : "warning",
      message: `Function ${metric.name} has complexity ${metric.complexity} (threshold: 10).`,
      file: metric.filePath,
      line: metric.line,
    });
  }

  const averageComplexity = metrics.length === 0 ? 0 : metrics.reduce((total, metric) => total + metric.complexity, 0) / metrics.length;
  const score = Math.max(0, Math.min(100, Math.round(100 - complexFunctions.length * 18 - Math.max(0, averageComplexity - 5) * 6)));

  return {
    score,
    summary:
      metrics.length === 0
        ? "No source functions found yet."
        : `${complexFunctions.length} complex function${complexFunctions.length === 1 ? "" : "s"} across ${metrics.length} scanned.`,
    findings,
  };
}

function extractFunctions(content: string): FunctionMetric[] {
  const lines = content.split(/\r?\n/);
  const metrics: FunctionMetric[] = [];
  let braceDepth = 0;
  let current: { name: string; line: number; complexity: number; startDepth: number } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!current) {
      const name = matchFunctionName(trimmed);
      if (name && trimmed.includes("{")) {
        current = {
          name,
          line: index + 1,
          complexity: 1 + countDecisionPoints(line),
          startDepth: braceDepth,
        };
      }
    } else {
      current.complexity += countDecisionPoints(line);
    }

    braceDepth += countOccurrences(line, "{") - countOccurrences(line, "}");

    if (current && braceDepth <= current.startDepth) {
      metrics.push(current);
      current = null;
    }
  }

  return metrics;
}

function matchFunctionName(line: string): string | null {
  const namedFunction = line.match(/\bfunction\s+([A-Za-z0-9_$]+)\s*\(/);
  if (namedFunction) {
    return namedFunction[1] ?? null;
  }

  const arrowFunction = line.match(/\b(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
  if (arrowFunction) {
    return arrowFunction[1] ?? null;
  }

  const method = line.match(/^(?:export\s+)?(?:async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/);
  if (method && !["if", "for", "while", "switch", "catch"].includes(method[1] ?? "")) {
    return method[1] ?? null;
  }

  return null;
}

function countDecisionPoints(line: string): number {
  return line.match(/\b(if|for|while|case|catch|switch)\b|&&|\|\||\?/g)?.length ?? 0;
}

function countOccurrences(line: string, character: string): number {
  return [...line].filter((value) => value === character).length;
}
