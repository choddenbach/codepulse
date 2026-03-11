import { Command, InvalidArgumentError } from "commander";

import { ALL_MODULES, type ModuleName, type ScanOptions } from "../types.ts";

interface ScanCommandInput {
  format?: string;
  module?: string;
}

export function createProgram(runScan: (options: ScanOptions) => Promise<void>): Command {
  const program = new Command();

  program
    .name("codepulse")
    .description("Scan a codebase and generate CodePulse health reports.")
    .version("0.1.0");

  program
    .command("scan")
    .description("Run the CodePulse analysis against a project directory.")
    .argument("[path]", "Directory to scan", process.cwd())
    .option("--format <format>", "Output format: terminal, json, or html", "terminal")
    .option("--module <modules>", "Comma-separated module list")
    .action(async (targetPath: string, options: ScanCommandInput) => {
      await runScan(normalizeScanOptions(targetPath, options));
    });

  return program;
}

export function normalizeScanOptions(targetPath: string, options: ScanCommandInput): ScanOptions {
  const format = normalizeFormat(options.format);
  const modules = normalizeModules(options.module);

  return {
    targetPath,
    format,
    modules,
  };
}

export async function parseScanCommandArgs(argv: string[]): Promise<ScanOptions> {
  let captured: ScanOptions | undefined;
  const program = createProgram(async (options) => {
    captured = options;
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

function normalizeModules(rawModules?: string): ModuleName[] {
  if (!rawModules) {
    return [...ALL_MODULES];
  }

  const modules = rawModules
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
