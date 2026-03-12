import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

import { analyzeProject } from "./analysis/project.ts";
import { createProgram, normalizeScanOptionsWithConfig } from "./cli/options.ts";
import { loadScanConfig } from "./config.ts";
import { renderHtmlReport } from "./render/html.ts";
import { renderTerminalReport } from "./render/terminal.ts";
import { exceedsFailureThreshold, type AnalysisReport, type ScanOptions } from "./types.ts";

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const program = createProgram(async (targetPath, input) => {
    const loadedConfig = loadScanConfig(targetPath, input.config);
    const options = normalizeScanOptionsWithConfig(targetPath, input, loadedConfig.config);
    const exitCode = await executeScan(options);
    process.exitCode = exitCode;
  });

  await program.parseAsync(argv, { from: "user" });
}

export async function executeScan(options: ScanOptions): Promise<number> {
  const report = await analyzeProject(options.targetPath, options.modules, { excludePaths: options.exclude });
  const resolvedOutputPath = resolveOutputPath(report.targetPath, options);

  if (options.format === "json") {
    const jsonOutput = `${JSON.stringify(report, null, 2)}\n`;

    if (resolvedOutputPath) {
      writeReportFile(resolvedOutputPath, jsonOutput);
      process.stderr.write(`Report written: ${resolvedOutputPath}\n`);
    } else {
      process.stdout.write(jsonOutput);
    }

    return determineExitCodeWithOptions(report, options);
  }

  if (options.format === "html") {
    const htmlPath = resolvedOutputPath ?? path.join(report.targetPath, "codepulse-report.html");
    writeReportFile(htmlPath, renderHtmlReport(report));
    process.stdout.write(renderTerminalReport(report));
    process.stdout.write(`\nFull report: ${htmlPath}\n`);
    return determineExitCodeWithOptions(report, options);
  }

  const terminalReport = renderTerminalReport(report);
  process.stdout.write(terminalReport);

  if (resolvedOutputPath) {
    writeReportFile(resolvedOutputPath, terminalReport);
    process.stdout.write(`\nSaved report: ${resolvedOutputPath}\n`);
  }

  return determineExitCodeWithOptions(report, options);
}

export function determineExitCode(report: AnalysisReport): number {
  return determineExitCodeWithOptions(report, { minScore: 80, failOnSeverity: "none" });
}

export function determineExitCodeWithOptions(
  report: AnalysisReport,
  options: Pick<ScanOptions, "minScore" | "failOnSeverity">,
): number {
  if (report.overallScore < options.minScore) {
    return 1;
  }

  if (report.findings.some((finding) => exceedsFailureThreshold(finding.severity, options.failOnSeverity))) {
    return 1;
  }

  return 0;
}

function resolveOutputPath(targetPath: string, options: Pick<ScanOptions, "format" | "outputPath">): string | undefined {
  if (options.outputPath) {
    return path.isAbsolute(options.outputPath) ? options.outputPath : path.resolve(targetPath, options.outputPath);
  }

  if (options.format === "html") {
    return path.join(targetPath, "codepulse-report.html");
  }

  return undefined;
}

function writeReportFile(outputPath: string, content: string): void {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content);
}

if (import.meta.main) {
  await runCli();
}
