import { describe, it, expect } from "bun:test";
import { analyzeProject } from "../analysis/project.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TMP = "/tmp/codepulse-test-docs";

async function setup(files: Record<string, string>) {
  await mkdir(TMP, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const parts = name.split("/");
    if (parts.length > 1) {
      await mkdir(join(TMP, ...parts.slice(0, -1)), { recursive: true });
    }
    await writeFile(join(TMP, name), content);
  }
}

async function teardown() {
  await rm(TMP, { recursive: true, force: true });
}

describe("documentation analyzer", () => {
  it("penalizes missing README", async () => {
    await mkdir(TMP, { recursive: true });
    const report = await analyzeProject(TMP, ["documentation"]);
    const module = report.modules[0]!;
    expect(module.score).toBeLessThan(80);
    expect(module.findings.some((f) => f.message.includes("README"))).toBe(true);
    await teardown();
  });

  it("gives good score when README exists with comments", async () => {
    const longReadme = "# Project\n\n" + "Some content here.\n".repeat(40);
    await setup({
      "README.md": longReadme,
      "index.ts": `
        /**
         * Main function.
         * @param x - Input value
         */
        export function main(x: string): string {
          // Process the value
          return x.trim();
        }
      `,
    });

    const report = await analyzeProject(TMP, ["documentation"]);
    const module = report.modules[0]!;
    expect(module.score).toBeGreaterThanOrEqual(60);
    expect(module.findings.some((f) => f.message.includes("README"))).toBe(false);
    await teardown();
  });

  it("flags sparse inline documentation", async () => {
    const longReadme = "# Project\n\n" + "Content.\n".repeat(40);
    await setup({
      "README.md": longReadme,
      "src/index.ts": `
        export function doSomething(x: string): string { return x; }
        export function doAnother(y: number): number { return y; }
        export function doMore(z: boolean): boolean { return z; }
        export function doEven(a: string): string { return a; }
        export function doLots(b: number): number { return b; }
        export function doMany(c: string): string { return c; }
        export function doAll(d: string): string { return d; }
        export function doFinal(e: string): string { return e; }
      `,
    });

    const report = await analyzeProject(TMP, ["documentation"]);
    const module = report.modules[0]!;
    // Should mention sparse documentation
    const hasSparseWarning = module.findings.some((f) => f.message.toLowerCase().includes("sparse") || f.message.toLowerCase().includes("documentation"));
    expect(hasSparseWarning || module.score < 90).toBe(true);
    await teardown();
  });

  it("counts markdown files in summary", async () => {
    await setup({
      "README.md": "# Readme\n\n" + "Content.\n".repeat(10),
      "CONTRIBUTING.md": "# Contributing\n\nPlease contribute.\n",
    });

    const report = await analyzeProject(TMP, ["documentation"]);
    const module = report.modules[0]!;
    expect(module.summary).toMatch(/\d+ markdown document/);
    await teardown();
  });
});
