import { describe, it, expect } from "bun:test";
import { analyzeProject } from "../analysis/project.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TMP = "/tmp/codepulse-test-coverage";

async function setup(files: Record<string, string>) {
  await mkdir(TMP, { recursive: true });
  for (const [filePath, content] of Object.entries(files)) {
    const parts = filePath.split("/");
    if (parts.length > 1) {
      await mkdir(join(TMP, ...parts.slice(0, -1)), { recursive: true });
    }
    await writeFile(join(TMP, filePath), content);
  }
}

async function teardown() {
  await rm(TMP, { recursive: true, force: true });
}

describe("test coverage analyzer", () => {
  it("returns low score for no tests", async () => {
    await setup({
      "src/index.ts": "export const x = 1;",
      "src/utils.ts": "export const y = 2;",
    });
    const report = await analyzeProject(TMP, ["tests"]);
    const module = report.modules[0]!;
    expect(module.score).toBeLessThan(50);
    expect(module.findings.some((f) => f.message.toLowerCase().includes("no automated test"))).toBe(true);
    await teardown();
  });

  it("detects test files by naming convention", async () => {
    await setup({
      "src/index.ts": "export const x = 1;",
      "src/utils.ts": "export const y = 2;",
      "src/index.test.ts": "import { x } from './index';",
      "src/utils.spec.ts": "import { y } from './utils';",
    });
    const report = await analyzeProject(TMP, ["tests"]);
    const module = report.modules[0]!;
    expect(module.score).toBeGreaterThan(30);
    expect(module.findings.some((f) => f.message.toLowerCase().includes("no automated"))).toBe(false);
    await teardown();
  });

  it("gives high score for good test ratio", async () => {
    await setup({
      "src/a.ts": "export const a = 1;",
      "src/b.ts": "export const b = 2;",
      "src/a.test.ts": "// test a",
      "src/b.test.ts": "// test b",
    });
    const report = await analyzeProject(TMP, ["tests"]);
    const module = report.modules[0]!;
    expect(module.score).toBeGreaterThanOrEqual(70);
    await teardown();
  });

  it("detects __tests__ directory", async () => {
    await setup({
      "src/index.ts": "export default 1;",
      "__tests__/index.test.ts": "// test",
    });
    const report = await analyzeProject(TMP, ["tests"]);
    const module = report.modules[0]!;
    expect(module.score).toBeGreaterThan(0);
    expect(module.findings.some((f) => f.message.toLowerCase().includes("no automated"))).toBe(false);
    await teardown();
  });

  it("summarizes test vs source file counts", async () => {
    await setup({
      "src/a.ts": "export const a = 1;",
      "src/a.test.ts": "// test",
    });
    const report = await analyzeProject(TMP, ["tests"]);
    const module = report.modules[0]!;
    expect(module.summary).toMatch(/\d+ test file/);
    expect(module.summary).toMatch(/\d+ source file/);
    await teardown();
  });
});
