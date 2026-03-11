import { describe, it, expect } from "bun:test";
import { analyzeProject } from "../analysis/project.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TMP = "/tmp/codepulse-test-deps";

async function setup(files: Record<string, string>) {
  await mkdir(TMP, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(TMP, name), content);
  }
}

async function teardown() {
  await rm(TMP, { recursive: true, force: true });
}

describe("dependency analyzer", () => {
  it("warns about missing package.json", async () => {
    await mkdir(TMP, { recursive: true });
    const report = await analyzeProject(TMP, ["deps"]);
    const module = report.modules[0]!;
    expect(module.findings.some((f) => f.message.toLowerCase().includes("package.json"))).toBe(true);
    await teardown();
  });

  it("penalizes missing lockfile", async () => {
    await setup({
      "package.json": JSON.stringify({
        dependencies: { lodash: "^4.0.0" },
        devDependencies: {},
      }),
    });
    const report = await analyzeProject(TMP, ["deps"]);
    const module = report.modules[0]!;
    expect(module.score).toBeLessThan(90);
    expect(module.findings.some((f) => f.message.toLowerCase().includes("lockfile"))).toBe(true);
    await teardown();
  });

  it("does not flag lockfile when present", async () => {
    await setup({
      "package.json": JSON.stringify({
        dependencies: {},
        devDependencies: { typescript: "^5.0.0" },
      }),
      "bun.lock": "# bun lockfile v1",
    });
    const report = await analyzeProject(TMP, ["deps"]);
    const module = report.modules[0]!;
    expect(module.findings.some((f) => f.message.toLowerCase().includes("lockfile"))).toBe(false);
    await teardown();
  });

  it("flags high dependency count", async () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 55; i++) {
      deps[`pkg-${i}`] = "^1.0.0";
    }
    await setup({
      "package.json": JSON.stringify({ dependencies: deps }),
      "package-lock.json": "{}",
    });
    const report = await analyzeProject(TMP, ["deps"]);
    const module = report.modules[0]!;
    expect(module.findings.some((f) => f.message.includes("55") || f.message.toLowerCase().includes("dependencies"))).toBe(true);
    await teardown();
  });

  it("flags unstable version selectors", async () => {
    await setup({
      "package.json": JSON.stringify({
        dependencies: { mylib: "latest", otherlib: "*" },
      }),
      "package-lock.json": "{}",
    });
    const report = await analyzeProject(TMP, ["deps"]);
    const module = report.modules[0]!;
    expect(module.findings.some((f) => f.message.includes("unstable"))).toBe(true);
    await teardown();
  });
});
