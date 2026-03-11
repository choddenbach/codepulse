import { describe, it, expect } from "bun:test";
import { analyzeProject } from "../analysis/project.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TMP = "/tmp/codepulse-test-complexity";

async function setup(files: Record<string, string>) {
  await mkdir(TMP, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(TMP, name), content);
  }
}

async function teardown() {
  await rm(TMP, { recursive: true, force: true });
}

describe("complexity analyzer", () => {
  it("returns high score for simple functions", async () => {
    await setup({
      "simple.ts": `
        function add(a: number, b: number) {
          return a + b;
        }
        function greet(name: string) {
          return 'Hello ' + name;
        }
      `,
    });

    const report = await analyzeProject(TMP, ["complexity"]);
    const module = report.modules[0]!;
    expect(module.name).toBe("complexity");
    expect(module.score).toBeGreaterThanOrEqual(70);
    expect(module.findings.filter((f) => f.severity === "error")).toHaveLength(0);
    await teardown();
  });

  it("flags highly complex functions", async () => {
    await setup({
      "complex.ts": `
        function processOrder(order) {
          if (order.type === 'A') {
            if (order.status === 'pending') {
              if (order.amount > 100) {
                for (let i = 0; i < order.items.length; i++) {
                  if (order.items[i].valid && order.items[i].qty > 0) {
                    while (order.items[i].qty > 10) {
                      if (order.priority === 'high') {
                        try {
                          if (order.express) {
                            switch (order.region) {
                              case 'US':
                                break;
                              case 'EU':
                                break;
                            }
                          }
                        } catch (e) {
                          if (e.code === 'timeout') {
                            return null;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          return order;
        }
      `,
    });

    const report = await analyzeProject(TMP, ["complexity"]);
    const module = report.modules[0]!;
    expect(module.findings.length).toBeGreaterThan(0);
    await teardown();
  });

  it("handles empty directory", async () => {
    await mkdir(TMP, { recursive: true });
    const report = await analyzeProject(TMP, ["complexity"]);
    const module = report.modules[0]!;
    expect(module.score).toBeGreaterThanOrEqual(0);
    expect(module.summary).toContain("No source");
    await teardown();
  });

  it("skips node_modules", async () => {
    await setup({
      "src.ts": "function simple() { return 1; }",
    });
    await mkdir(join(TMP, "node_modules"), { recursive: true });
    await writeFile(
      join(TMP, "node_modules", "lib.ts"),
      `function veryComplex() {
        if (true) { if (true) { if (true) { if (true) {
          while(true) { for(let i=0;i<10;i++) { if(i) { switch(i) { case 1: break; case 2: break; } } }
        }}}}}
      }`
    );

    const report = await analyzeProject(TMP, ["complexity"]);
    const module = report.modules[0]!;
    expect(module.score).toBeGreaterThanOrEqual(70);
    await teardown();
  });
});
