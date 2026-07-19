import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, extname, join, relative } from "node:path";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);

const textExtensions = new Set([
  ".c",
  ".cc",
  ".conf",
  ".cpp",
  ".cs",
  ".css",
  ".env",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".md",
  ".mjs",
  ".php",
  ".properties",
  ".py",
  ".rb",
  ".rs",
  ".sh",
  ".sql",
  ".svelte",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml",
]);

export function pathExists(root: string, ...parts: string[]): boolean {
  return existsSync(join(root, ...parts));
}

export function readUtf8(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

export function readJson<T>(path: string): T | undefined {
  const content = readUtf8(path);
  if (content === undefined) return undefined;

  try {
    return JSON.parse(content) as T;
  } catch {
    return undefined;
  }
}

export function listFiles(
  root: string,
  options: { maxFiles?: number; maxDepth?: number } = {},
): string[] {
  const maxFiles = options.maxFiles ?? 400;
  const maxDepth = options.maxDepth ?? 7;
  const files: string[] = [];

  function visit(directory: string, depth: number): void {
    if (files.length >= maxFiles || depth > maxDepth) return;

    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (entry.isSymbolicLink()) continue;

      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) visit(absolute, depth + 1);
        continue;
      }

      if (entry.isFile()) files.push(relative(root, absolute).replaceAll("\\", "/"));
    }
  }

  visit(root, 0);
  return files;
}

export function isSmallTextFile(root: string, relativePath: string): boolean {
  const absolute = join(root, relativePath);
  const name = basename(relativePath).toLowerCase();
  const extension = extname(name);

  if (!textExtensions.has(extension) && !name.startsWith(".env")) return false;

  try {
    return statSync(absolute).size <= 1_000_000;
  } catch {
    return false;
  }
}
