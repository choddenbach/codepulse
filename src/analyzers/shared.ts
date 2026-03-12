import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo"]);

export interface ProjectFile {
  absolutePath: string;
  relativePath: string;
  extension: string;
  content: string;
}

export async function collectProjectFiles(
  rootPath: string,
  options: { allowedExtensions?: Set<string>; excludePaths?: string[] } = {},
): Promise<ProjectFile[]> {
  const files: ProjectFile[] = [];
  const allowedExtensions = options.allowedExtensions ?? DEFAULT_EXTENSIONS;
  const excludePaths = options.excludePaths?.map(normalizePathForMatching).filter(Boolean) ?? [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = normalizePathForMatching(path.relative(rootPath, absolutePath));

      if (shouldExcludePath(relativePath, excludePaths)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      const extension = path.extname(entry.name);
      if (!allowedExtensions.has(extension) && entry.name !== "package.json" && !entry.name.endsWith(".md") && !entry.name.endsWith(".mdx") && entry.name !== ".env") {
        continue;
      }

      files.push({
        absolutePath,
        relativePath,
        extension,
        content: await readFile(absolutePath, "utf-8"),
      });
    }
  }

  await walk(rootPath);
  return files;
}

export function isSourceFile(relativePath: string, extension: string): boolean {
  if (!DEFAULT_EXTENSIONS.has(extension)) {
    return false;
  }

  return !isTestFile(relativePath);
}

export function isTestFile(relativePath: string): boolean {
  return /(^|\/)(__tests__|tests|test|spec)(\/|$)|\.(test|spec)\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(relativePath);
}

export function lineNumberFromIndex(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

function shouldExcludePath(relativePath: string, excludePaths: string[]): boolean {
  return excludePaths.some((excludePath) => relativePath === excludePath || relativePath.startsWith(`${excludePath}/`));
}

function normalizePathForMatching(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}
