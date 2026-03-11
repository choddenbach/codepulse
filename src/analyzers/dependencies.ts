import path from "node:path";

import type { ModuleResult } from "../types.ts";

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export async function analyzeDependencies(directory: string): Promise<ModuleResult> {
  const findings: ModuleResult["findings"] = [];
  const packageFile = Bun.file(path.join(directory, "package.json"));

  if (!(await packageFile.exists())) {
    return {
      score: 0,
      summary: "No package.json found in directory.",
      findings: [{ severity: "error", message: "No package.json found." }],
    };
  }

  let packageJson: PackageJsonShape;
  try {
    packageJson = (await packageFile.json()) as PackageJsonShape;
  } catch {
    return {
      score: 0,
      summary: "Could not parse package.json.",
      findings: [{ severity: "error", message: "Invalid package.json." }],
    };
  }

  const dependencyEntries = [
    ...Object.entries(packageJson.dependencies ?? {}),
    ...Object.entries(packageJson.devDependencies ?? {}),
    ...Object.entries(packageJson.peerDependencies ?? {}),
  ];

  const hasLockfile = await hasAnyLockfile(directory);
  if (!hasLockfile) {
    findings.push({ severity: "warning", message: "No lockfile found; installs may be less reproducible." });
  }

  if (dependencyEntries.length > 50) {
    findings.push({ severity: "warning", message: `${dependencyEntries.length} dependencies detected; consider pruning unused packages.` });
  }

  const unstable = dependencyEntries.filter(([, version]) => /^(latest|\*|workspace:\*)$/i.test(version));
  for (const [name, version] of unstable) {
    findings.push({ severity: "warning", message: `Dependency ${name} uses an unstable version selector (${version}).` });
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - (hasLockfile ? 0 : 15) - Math.max(0, dependencyEntries.length - 20) * 0.8 - unstable.length * 12)));

  return {
    score,
    summary: dependencyEntries.length
      ? `${dependencyEntries.length} total dependencies with ${unstable.length} unstable version selector${unstable.length === 1 ? "" : "s"}.`
      : "No dependencies declared.",
    findings,
  };
}

async function hasAnyLockfile(directory: string): Promise<boolean> {
  const names = ["bun.lock", "bun.lockb", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"];
  for (const name of names) {
    if (await Bun.file(path.join(directory, name)).exists()) {
      return true;
    }
  }

  return false;
}
