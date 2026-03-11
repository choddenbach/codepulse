import { expect, test } from "bun:test";

import { renderHtmlReport } from "../src/render/html";
import type { AnalysisReport } from "../src/types";

const report: AnalysisReport = {
  targetPath: "/tmp/example",
  generatedAt: "2025-03-10T18:00:00.000Z",
  overallScore: 78,
  overallGrade: "C+",
  modules: [
    { name: "complexity", label: "Complexity", score: 82, summary: "1 complex function across 9 scanned.", findings: [] },
    { name: "deps", label: "Dependencies", score: 65, summary: "8 total dependencies with 1 unstable version selector.", findings: [] },
    { name: "documentation", label: "Documentation", score: 55, summary: "1 markdown document detected.", findings: [] },
    { name: "tests", label: "Tests", score: 75, summary: "4 test files for 10 source files.", findings: [] },
    { name: "security", label: "Security", score: 95, summary: "No obvious security red flags found.", findings: [] },
  ],
  findings: [
    {
      module: "complexity",
      severity: "warning",
      filePath: "src/parser.ts",
      line: 45,
      message: "Function parseConfig has complexity 15 (threshold: 10).",
    },
    {
      module: "documentation",
      severity: "error",
      message: "No README.md found.",
    },
  ],
};

test("renders the HTML report snapshot", async () => {
  const actual = renderHtmlReport(report);
  const expected = await Bun.file("tests/__snapshots__/html-report.html").text();

  expect(actual).toBe(expected);
});
