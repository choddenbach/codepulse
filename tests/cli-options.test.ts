import { describe, expect, test } from "bun:test";

import { parseScanCommandArgs, normalizeScanOptionsWithConfig } from "../src/cli/options";

describe("parseScanCommandArgs", () => {
  test("uses cwd and all modules by default", async () => {
    const parsed = await parseScanCommandArgs(["scan"]);

    expect(parsed.targetPath).toBe(process.cwd());
    expect(parsed.format).toBe("terminal");
    expect(parsed.modules).toEqual(["complexity", "deps", "documentation", "tests", "security"]);
    expect(parsed.exclude).toEqual([]);
    expect(parsed.outputPath).toBeUndefined();
    expect(parsed.minScore).toBe(80);
    expect(parsed.failOnSeverity).toBe("none");
  });

  test("parses explicit format and module list", async () => {
    const parsed = await parseScanCommandArgs([
      "scan",
      "./src",
      "--format",
      "html",
      "--module",
      "complexity,deps",
      "--exclude",
      "fixtures,src/generated/",
      "--output",
      "reports/codepulse.html",
    ]);

    expect(parsed.targetPath).toBe("./src");
    expect(parsed.format).toBe("html");
    expect(parsed.modules).toEqual(["complexity", "deps"]);
    expect(parsed.exclude).toEqual(["fixtures", "src/generated"]);
    expect(parsed.outputPath).toBe("reports/codepulse.html");
  });

  test("merges config defaults with CLI overrides", () => {
    const parsed = normalizeScanOptionsWithConfig(
      "./src",
      { failOn: "error" },
      {
        format: "json",
        modules: ["security", "tests"],
        exclude: ["fixtures/security.ts"],
        outputPath: "reports/default.json",
        minScore: 92,
        failOnSeverity: "warning",
      },
    );

    expect(parsed.format).toBe("json");
    expect(parsed.modules).toEqual(["security", "tests"]);
    expect(parsed.exclude).toEqual(["fixtures/security.ts"]);
    expect(parsed.outputPath).toBe("reports/default.json");
    expect(parsed.minScore).toBe(92);
    expect(parsed.failOnSeverity).toBe("error");
  });
});
