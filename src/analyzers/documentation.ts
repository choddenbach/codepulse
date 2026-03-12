import path from "node:path";

import type { ModuleResult } from "../types.ts";
import { collectProjectFiles, isSourceFile } from "./shared.ts";

export async function analyzeDocumentation(directory: string, excludePaths: string[] = []): Promise<ModuleResult> {
  const files = await collectProjectFiles(directory, { excludePaths });
  const findings: ModuleResult["findings"] = [];
  const markdownFiles = files.filter((file) => /(^README|\.md$|\.mdx$)/i.test(path.basename(file.relativePath)));
  const readme = markdownFiles.find((file) => /^README(\.|$)/i.test(path.basename(file.relativePath)));

  if (!readme) {
    findings.push({ severity: "error", message: "No README.md found." });
  }

  let commentLines = 0;
  let codeLines = 0;
  for (const file of files.filter((candidate) => isSourceFile(candidate.relativePath, candidate.extension))) {
    for (const line of file.content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("<!--")) {
        commentLines += 1;
      } else {
        codeLines += 1;
      }
    }
  }

  const readmeLines = readme?.content.split(/\r?\n/).filter((line) => line.trim()).length ?? 0;
  const commentCoverage = codeLines === 0 ? 0 : commentLines / codeLines;

  if (readme && readmeLines < 12) {
    findings.push({ severity: "warning", message: `README.md is brief (${readmeLines} non-empty lines).` });
  }

  if (codeLines > 0 && commentCoverage < 0.05) {
    findings.push({ severity: "info", message: "Inline documentation is sparse." });
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round((readme ? 50 : 10) + Math.min(markdownFiles.length * 15, 30) + Math.min(readmeLines, 30) * 0.8 + Math.min(commentCoverage * 200, 20)),
    ),
  );

  return {
    score,
    summary: `${markdownFiles.length} markdown document${markdownFiles.length === 1 ? "" : "s"} detected.`,
    findings,
  };
}
