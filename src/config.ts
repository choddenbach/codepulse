import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { ALL_MODULES, type CodePulseConfig, type ExitSeverity, type ModuleName, type OutputFormat } from "./types.ts";

export const CONFIG_FILE_NAME = "codepulse.config.json";

export function loadScanConfig(targetPath: string, explicitConfigPath?: string): { config: CodePulseConfig; path?: string } {
  const configPath = findConfigPath(targetPath, explicitConfigPath);
  if (!configPath) {
    return { config: {} };
  }

  const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;

  return {
    path: configPath,
    config: {
      format: parseFormat(raw.format),
      modules: parseModules(raw.modules),
      exclude: parseExcludePaths(raw.exclude),
      outputPath: parseOutputPath(raw.outputPath),
      minScore: parseMinScore(raw.minScore),
      failOnSeverity: parseFailOnSeverity(raw.failOnSeverity),
    },
  };
}

function findConfigPath(targetPath: string, explicitConfigPath?: string): string | undefined {
  if (explicitConfigPath) {
    const resolvedPath = path.resolve(explicitConfigPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Config file not found: ${explicitConfigPath}`);
    }

    return resolvedPath;
  }

  let currentPath = resolveSearchDirectory(targetPath);

  while (true) {
    const candidate = path.join(currentPath, CONFIG_FILE_NAME);
    if (existsSync(candidate)) {
      return candidate;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return undefined;
    }

    currentPath = parentPath;
  }
}

function resolveSearchDirectory(targetPath: string): string {
  const resolvedPath = path.resolve(targetPath);
  if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
    return resolvedPath;
  }

  return path.dirname(resolvedPath);
}

function parseFormat(value: unknown): OutputFormat | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "terminal" || value === "json" || value === "html") {
    return value;
  }

  throw new Error(`Invalid config format: ${String(value)}`);
}

function parseModules(value: unknown): ModuleName[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error("Config modules must be an array.");
  }

  const modules = value.map((entry) => {
    if (typeof entry !== "string" || !ALL_MODULES.includes(entry as ModuleName)) {
      throw new Error(`Invalid config module: ${String(entry)}`);
    }

    return entry as ModuleName;
  });

  return modules;
}

function parseExcludePaths(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error("Config exclude must be an array of strings.");
  }

  return value.map((entry) => entry.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, ""));
}

function parseOutputPath(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Config outputPath must be a non-empty string.");
  }

  return value.trim();
}

function parseMinScore(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 100) {
    throw new Error(`Invalid config minScore: ${String(value)}`);
  }

  return value;
}

function parseFailOnSeverity(value: unknown): ExitSeverity | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "none" || value === "warning" || value === "error") {
    return value;
  }

  throw new Error(`Invalid config failOnSeverity: ${String(value)}`);
}
