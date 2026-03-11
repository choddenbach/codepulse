#!/usr/bin/env bun

import path from "node:path";

import { analyzeProject } from "./analysis/project.ts";
import { createProgram } from "./cli/options.ts";
import { renderHtmlReport } from "./render/html.ts";
import { renderTerminalReport } from "./render/terminal.ts";
import { isHealthyGrade, type AnalysisReport, type ScanOptions } from "./types.ts";

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const program = createProgram(async (options) => {
    const exitCode = await executeScan(options);
    process.exitCode = exitCode;
  });

  await program.parseAsync(argv, { from: "user" });
}

export async function executeScan(options: ScanOptions): Promise<number> {
  const report = await analyzeProject(options.targetPath, options.modules);
  const htmlPath = path.join(report.targetPath, "codepulse-report.html");

  if (options.format === "json") {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return determineExitCode(report);
  }

  if (options.format === "html") {
    await Bun.write(htmlPath, renderHtmlReport(report));
    process.stdout.write(renderTerminalReport(report));
    process.stdout.write(`\nFull report: ${htmlPath}\n`);
    return determineExitCode(report);
  }

  process.stdout.write(renderTerminalReport(report));
  return determineExitCode(report);
}

export function determineExitCode(report: AnalysisReport): number {
  return isHealthyGrade(report.overallGrade) ? 0 : 1;
}

if (import.meta.main) {
  await runCli();
}
