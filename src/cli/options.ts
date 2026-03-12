import { Command, InvalidArgumentError } from "commander";

import { ALL_MODULES, type CodePulseConfig, type ExitSeverity, type ModuleName, type ScanOptions } from "../types.ts";

export interface ScanCommandInput {
  format?: string;
  module?: string;
  exclude?: string;
  output?: string;
  config?: string;
  minScore?: string;
  failOn?: string;
}

export function createProgram(runScan: (targetPath: string, input: ScanCommandInput) => Promise<void>): Command {
  const program = new Command();

  program
    .name("codepulse")
    .description("Scan a codebase and generate CodePulse health reports.")
    .version("0.1.0");

  program
    .command("scan")
    .description("Run the CodePulse analysis against a project directory.")
    .argument("[path]", "Directory to scan", process.cwd())
    .option("--format <format>", "Output format: terminal, json, or html")
    .option("--module <modules>", "Comma-separated module list")
    .option("--exclude <paths>", "Comma-separated paths relative to the scan root to ignore")
    .option("--output <path>", "Write the rendered report to a specific file path")
    .option("--config <path>", "Path to a codepulse config file")
    .option("--min-score <score>", "Minimum overall score required to pass")
    .option("--fail-on <severity>", "Fail when findings reach warning or error severity")
    .action(async (targetPath: string, options: ScanCommandInput) => {
      await runScan(targetPath, options);
    });

  return program;
}

export function normalizeScanOptions(targetPath: string, options: ScanCommandInput): ScanOptions {
  return normalizeScanOptionsWithConfig(targetPath, options, {});
}

export function normalizeScanOptionsWithConfig(
  targetPath: string,
  options: ScanCommandInput,
  config: CodePulseConfig,
): ScanOptions {
  const format = normalizeFormat(options.format ?? config.format);
  const modules = normalizeModules(options.module ?? config.modules);
  const exclude = normalizeExcludePaths(options.exclude ?? config.exclude);
  const outputPath = normalizeOutputPath(options.output ?? config.outputPath);
  const minScore = normalizeMinScore(options.minScore ?? config.minScore);
  const failOnSeverity = normalizeFailOnSeverity(options.failOn ?? config.failOnSeverity);

  return {
    targetPath,
    format,
    modules,
    exclude,
    outputPath,
    configPath: options.config,
    minScore,
    failOnSeverity,
  };
}

export async function parseScanCommandArgs(argv: string[]): Promise<ScanOptions> {
  let captured: ScanOptions | undefined;
  const program = createProgram(async (targetPath, input) => {
    captured = normalizeScanOptions(targetPath, input);
  });

  program.exitOverride();
  await program.parseAsync(argv, { from: "user" });

  if (!captured) {
    throw new Error("No scan command arguments were provided.");
  }

  return captured;
}

function normalizeFormat(format = "terminal"): ScanOptions["format"] {
  const normalized = format.toLowerCase();
  if (normalized === "terminal" || normalized === "json" || normalized === "html") {
    return normalized;
  }

  throw new InvalidArgumentError(`Unsupported format: ${format}`);
}

function normalizeModules(rawModules?: string | ModuleName[]): ModuleName[] {
  if (!rawModules) {
    return [...ALL_MODULES];
  }

  const modules = Array.isArray(rawModules)
    ? rawModules
    : rawModules
        .split(",")
        .map((moduleName) => moduleName.trim())
        .filter(Boolean);

  if (modules.length === 0) {
    throw new InvalidArgumentError("At least one module must be selected.");
  }

  for (const moduleName of modules) {
    if (!ALL_MODULES.includes(moduleName as ModuleName)) {
      throw new InvalidArgumentError(`Unknown module: ${moduleName}`);
    }
  }

  return modules as ModuleName[];
}

function normalizeExcludePaths(rawExclude?: string | string[]): string[] {
  if (rawExclude === undefined) {
    return [];
  }

  const excludePaths = Array.isArray(rawExclude)
    ? rawExclude
    : rawExclude
        .split(",")
        .map((excludePath) => excludePath.trim())
        .filter(Boolean);

  return [...new Set(excludePaths.map((excludePath) => excludePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "")))];
}

function normalizeOutputPath(rawOutputPath?: string): string | undefined {
  if (rawOutputPath === undefined) {
    return undefined;
  }

  const outputPath = rawOutputPath.trim();
  if (!outputPath) {
    throw new InvalidArgumentError("Output path cannot be empty.");
  }

  return outputPath;
}

function normalizeMinScore(rawMinScore?: string | number): number {
  if (rawMinScore === undefined) {
    return 80;
  }

  const minScore = typeof rawMinScore === "number" ? rawMinScore : Number(rawMinScore);
  if (Number.isNaN(minScore) || minScore < 0 || minScore > 100) {
    throw new InvalidArgumentError(`Unsupported minimum score: ${String(rawMinScore)}`);
  }

  return minScore;
}

function normalizeFailOnSeverity(rawFailOnSeverity?: string | ExitSeverity): ExitSeverity {
  if (rawFailOnSeverity === undefined) {
    return "none";
  }

  if (rawFailOnSeverity === "none" || rawFailOnSeverity === "warning" || rawFailOnSeverity === "error") {
    return rawFailOnSeverity;
  }

  throw new InvalidArgumentError(`Unsupported fail-on severity: ${String(rawFailOnSeverity)}`);
}
