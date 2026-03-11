export const ALL_MODULES = [
  "complexity",
  "deps",
  "documentation",
  "tests",
  "security",
] as const;

export type ModuleName = (typeof ALL_MODULES)[number];

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info" | "warning" | "error";

export interface Finding {
  module?: ModuleName;
  severity: FindingSeverity;
  message: string;
  file?: string;
  filePath?: string;
  line?: number;
}

export interface ModuleResult {
  name?: ModuleName;
  label?: string;
  score: number;
  summary: string;
  findings: Finding[];
}

export interface AnalysisReport {
  targetPath: string;
  generatedAt: string;
  overallScore: number;
  overallGrade: string;
  modules: ModuleResult[];
  findings: Finding[];
}

export interface ScanOptions {
  targetPath: string;
  format: "terminal" | "json" | "html";
  modules: ModuleName[];
}

export interface LegacyAnalysisReport {
  directory: string;
  analyzedAt: string;
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  modules: Record<ModuleName, ModuleResult>;
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreToGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

export function isHealthyGrade(grade: string): boolean {
  return grade.startsWith("A") || grade.startsWith("B");
}

export function severityRank(severity: FindingSeverity): number {
  switch (severity) {
    case "critical":
      return 5;
    case "high":
    case "error":
      return 4;
    case "medium":
    case "warning":
      return 3;
    case "low":
      return 2;
    default:
      return 1;
  }
}

export function normalizeSeverity(severity: FindingSeverity): "error" | "warning" | "info" {
  switch (severity) {
    case "critical":
    case "high":
    case "error":
      return "error";
    case "medium":
    case "warning":
      return "warning";
    default:
      return "info";
  }
}

export function coarseGrade(score: number): LegacyAnalysisReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
