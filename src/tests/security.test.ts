import { describe, it, expect } from "bun:test";
import { analyzeProject } from "../analysis/project.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TMP = "/tmp/codepulse-test-security";

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

describe("security analyzer", () => {
  it("gives high score for clean code", async () => {
    await setup({
      "src/index.ts": `
        export function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `,
    });
    const report = await analyzeProject(TMP, ["security"]);
    const module = report.modules[0]!;
    expect(module.score).toBeGreaterThanOrEqual(70);
    expect(module.findings.filter((f) => f.severity === "error")).toHaveLength(0);
    await teardown();
  });

  it("flags eval usage", async () => {
    await setup({
      "src/index.ts": `
        export function run(code: string) {
          return eval(code);
        }
      `,
    });
    const report = await analyzeProject(TMP, ["security"]);
    const module = report.modules[0]!;
    expect(module.findings.some((f) => f.message.toLowerCase().includes("eval"))).toBe(true);
    expect(module.score).toBeLessThan(100);
    await teardown();
  });

  it("flags new Function usage", async () => {
    await setup({
      "src/dynamic.ts": `
        const fn = new Function('x', 'return x * 2');
      `,
    });
    const report = await analyzeProject(TMP, ["security"]);
    const module = report.modules[0]!;
    expect(module.findings.some((f) => f.message.toLowerCase().includes("function"))).toBe(true);
    await teardown();
  });

  it("detects hardcoded AWS key pattern (AKIA)", async () => {
    await setup({
      "src/client.ts": `
        const key = 'AKIAIOSFODNN7EXAMPLE';
        const secret = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      `,
    });
    const report = await analyzeProject(TMP, ["security"]);
    const module = report.modules[0]!;
    expect(module.findings.some((f) => f.message.toLowerCase().includes("secret") || f.message.toLowerCase().includes("hard-coded"))).toBe(true);
    await teardown();
  });

  it("flags plain HTTP endpoints", async () => {
    await setup({
      "src/api.ts": `
        const API_URL = 'http://api.example.com/v1';
        async function fetchData() { return fetch(API_URL); }
      `,
    });
    const report = await analyzeProject(TMP, ["security"]);
    const module = report.modules[0]!;
    expect(module.findings.some((f) => f.message.toLowerCase().includes("http"))).toBe(true);
    await teardown();
  });

  it("skips excluded paths", async () => {
    await setup({
      "src/index.ts": `
        export const safeValue = 42;
      `,
      "fixtures/insecure.ts": `
        export function run(code: string) {
          return eval(code);
        }
      `,
    });
    const report = await analyzeProject(TMP, ["security"], { excludePaths: ["fixtures"] });
    const module = report.modules[0]!;
    expect(module.findings).toHaveLength(0);
    expect(module.score).toBe(100);
    await teardown();
  });
});
