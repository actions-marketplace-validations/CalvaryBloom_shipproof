#!/usr/bin/env node

import { statSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeProject, SHIPPROOF_VERSION } from "./analyze.js";
import { renderJson } from "./reporters/json.js";
import { renderSarif } from "./reporters/sarif.js";
import { renderTerminal } from "./reporters/terminal.js";

interface CliOptions {
  target: string;
  json: boolean;
  sarif: boolean;
  color: boolean;
  failOnIssues: boolean;
  help: boolean;
  version: boolean;
}

const help = `ShipProof ${SHIPPROOF_VERSION}

Zero-config release readiness checks for AI-assisted projects.

Usage:
  shipproof [path] [options]

Options:
  --json       Print machine-readable JSON
  --sarif      Print SARIF 2.1.0 for code scanning
  --no-color   Disable ANSI colors
  --no-fail    Exit with code 0 even when blocking issues are found
  -h, --help   Show help
  -v, --version
               Show the version

Examples:
  shipproof
  shipproof ./my-project
  shipproof --json > shipproof-report.json
  shipproof --sarif --no-fail > shipproof.sarif
`;

function parseArguments(arguments_: string[]): CliOptions {
  let target = ".";
  let targetWasSet = false;
  let json = false;
  let sarif = false;
  let color = process.stdout.isTTY && process.env.NO_COLOR === undefined;
  let failOnIssues = true;
  let showHelp = false;
  let showVersion = false;

  for (const argument of arguments_) {
    if (argument === "--json") json = true;
    else if (argument === "--sarif") sarif = true;
    else if (argument === "--no-color") color = false;
    else if (argument === "--no-fail") failOnIssues = false;
    else if (argument === "--help" || argument === "-h") showHelp = true;
    else if (argument === "--version" || argument === "-v") showVersion = true;
    else if (argument.startsWith("-")) throw new Error(`Unknown option: ${argument}`);
    else if (targetWasSet) throw new Error("Only one project path can be analyzed at a time.");
    else {
      target = argument;
      targetWasSet = true;
    }
  }

  if (json && sarif) throw new Error("--json and --sarif cannot be used together.");

  return { target, json, sarif, color, failOnIssues, help: showHelp, version: showVersion };
}

function main(): void {
  let options: CliOptions;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid arguments.";
    process.stderr.write(`shipproof: ${message}\nTry 'shipproof --help'.\n`);
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    process.stdout.write(help);
    return;
  }
  if (options.version) {
    process.stdout.write(`${SHIPPROOF_VERSION}\n`);
    return;
  }

  const target = resolve(options.target);
  try {
    if (!statSync(target).isDirectory()) throw new Error("The target is not a directory.");
  } catch {
    process.stderr.write(`shipproof: Cannot analyze '${options.target}': directory not found.\n`);
    process.exitCode = 2;
    return;
  }

  const result = analyzeProject(target);
  const output = options.json
    ? `${renderJson(result)}\n`
    : options.sarif
      ? `${renderSarif(result)}\n`
      : renderTerminal(result, options.color);
  process.stdout.write(output);

  if (options.failOnIssues && result.summary.failed > 0) process.exitCode = 1;
}

process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

main();
