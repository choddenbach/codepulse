import { describe, expect, test } from "bun:test";

import { parseScanCommandArgs } from "../src/cli/options";

describe("parseScanCommandArgs", () => {
  test("uses cwd and all modules by default", async () => {
    const parsed = await parseScanCommandArgs(["scan"]);

    expect(parsed.targetPath).toBe(process.cwd());
    expect(parsed.format).toBe("terminal");
    expect(parsed.modules).toEqual(["complexity", "deps", "documentation", "tests", "security"]);
  });

  test("parses explicit format and module list", async () => {
    const parsed = await parseScanCommandArgs(["scan", "./src", "--format", "html", "--module", "complexity,deps"]);

    expect(parsed.targetPath).toBe("./src");
    expect(parsed.format).toBe("html");
    expect(parsed.modules).toEqual(["complexity", "deps"]);
  });
});
