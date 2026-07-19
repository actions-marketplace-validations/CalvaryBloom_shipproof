import { appendFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeProject } from "./analyze.js";
import { renderGitHubSummary } from "./reporters/github.js";
import { renderTerminal } from "./reporters/terminal.js";

function input(name: string, fallback: string): string {
  const value = process.env[`INPUT_${name.toUpperCase()}`]?.trim();
  return value ? value : fallback;
}

function booleanInput(name: string, fallback: boolean): boolean {
  const value = input(name, String(fallback)).toLowerCase();
  if (value !== "true" && value !== "false") {
    throw new Error(`Input '${name}' must be either 'true' or 'false'.`);
  }
  return value === "true";
}

function appendEnvironmentFile(path: string | undefined, values: Record<string, string | number>): void {
  if (!path) return;
  const content = Object.entries(values)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n");
  appendFileSync(path, `${content}\n`, "utf8");
}

function main(): void {
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const targetInput = input("PATH", ".");
  const failOnIssues = booleanInput("FAIL-ON-ISSUES", true);
  const target = resolve(workspace, targetInput);

  if (!statSync(target).isDirectory()) {
    throw new Error(`Cannot analyze '${targetInput}': the target is not a directory.`);
  }

  const result = analyzeProject(target);
  process.stdout.write(renderTerminal(result, false));

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) appendFileSync(summaryPath, `${renderGitHubSummary(result)}\n`, "utf8");

  appendEnvironmentFile(process.env.GITHUB_OUTPUT, {
    score: result.score,
    readiness: result.readiness,
    warnings: result.summary.warnings,
    failed: result.summary.failed,
  });

  if (failOnIssues && result.summary.failed > 0) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unexpected action failure.";
  process.stderr.write(`ShipProof action: ${message}\n`);
  process.exitCode = 2;
}
