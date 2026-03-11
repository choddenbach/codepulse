import chalk from "chalk";

import { normalizeSeverity, severityRank, type AnalysisReport, type ModuleResult } from "../types.ts";

const BAR_WIDTH = 12;

export function renderTerminalReport(report: AnalysisReport): string {
  const lines: string[] = [];
  lines.push(chalk.bold("CodePulse v0.1.0"));
  lines.push(`Scanning ${report.targetPath}...`);
  lines.push("");
  lines.push(...renderHero(report.overallScore, report.overallGrade));
  lines.push("");

  for (const moduleResult of report.modules) {
    lines.push(renderModuleLine(moduleResult));
  }

  if (report.findings.length > 0) {
    lines.push("");
    lines.push(chalk.bold("Top findings:"));

    const findings = [...report.findings].sort((left, right) => severityRank(right.severity) - severityRank(left.severity));
    for (const finding of findings.slice(0, 5)) {
      const filePath = finding.filePath ?? finding.file;
      const location = filePath
        ? `${filePath}${finding.line ? `:${finding.line}` : ""} — `
        : "";
      const normalizedSeverity = normalizeSeverity(finding.severity);
      const icon = normalizedSeverity === "error" ? chalk.red("✖") : normalizedSeverity === "warning" ? chalk.yellow("⚠") : chalk.blue("ℹ");
      lines.push(`${icon} ${location}${finding.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function renderHero(score: number, grade: string): string[] {
  const content = `  Overall Health: ${score}/100  Grade: ${grade}  `;
  const border = "─".repeat(content.length);
  return [
    `┌${border}┐`,
    `│${chalk.bold(colorizeScore(score, content))}│`,
    `└${border}┘`,
  ];
}

function renderModuleLine(moduleResult: ModuleResult): string {
  const label = moduleResult.label.padEnd(13, " ");
  const bar = renderBar(moduleResult.score);
  return `${label} ${bar} ${colorizeScore(moduleResult.score, `${moduleResult.score}/100`)}`;
}

function renderBar(score: number): string {
  const filled = Math.round((score / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return `${chalk.cyan("█".repeat(filled))}${chalk.gray("░".repeat(empty))}`;
}

function colorizeScore(score: number, text: string): string {
  if (score >= 80) {
    return chalk.green(text);
  }

  if (score >= 70) {
    return chalk.yellow(text);
  }

  return chalk.red(text);
}
