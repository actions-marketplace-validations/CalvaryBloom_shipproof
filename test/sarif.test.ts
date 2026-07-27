import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { test } from "node:test";
import { renderSarif } from "../src/reporters/sarif.js";
import type { AnalysisResult } from "../src/types.js";

const result: AnalysisResult = {
  version: "0.2.0",
  analyzedAt: "2026-07-27T00:00:00.000Z",
  durationMs: 8,
  project: { name: "demo", path: "/demo", ecosystems: ["Node.js"] },
  score: 60,
  readiness: "work-needed",
  summary: { passed: 1, warnings: 1, failed: 1, informational: 0 },
  checks: [
    {
      id: "license",
      title: "License",
      status: "pass",
      message: "LICENSE is present.",
      weight: 7,
      locations: [{ path: "LICENSE", line: 1 }],
    },
    {
      id: "readme",
      title: "README",
      status: "warn",
      message: "README is short.",
      suggestion: "Add examples.",
      weight: 10,
      locations: [{ path: "docs/getting started.md", line: 3 }],
    },
    {
      id: "secrets",
      title: "Secret exposure",
      status: "fail",
      message: "Potential secrets found in 2 files.",
      weight: 14,
      locations: [
        { path: "src/config.ts", line: 4 },
        { path: "src/other.ts", line: 9 },
      ],
    },
  ],
};

test("renders GitHub-compatible SARIF rules, severities, and locations", () => {
  const sarif = JSON.parse(renderSarif(result)) as {
    $schema: string;
    version: string;
    runs: Array<{
      tool: { driver: { rules: Array<{ id: string }> } };
      results: Array<{
        ruleId: string;
        level: string;
        message: { text: string };
        locations: Array<{
          physicalLocation: {
            artifactLocation: { uri: string; uriBaseId: string };
            region: { startLine: number };
          };
        }>;
      }>;
    }>;
  };

  assert.equal(sarif.$schema, "https://json.schemastore.org/sarif-2.1.0.json");
  assert.equal(sarif.version, "2.1.0");
  assert.deepEqual(
    sarif.runs[0]?.tool.driver.rules.map((rule) => rule.id),
    ["license", "readme", "secrets"],
  );

  const results = sarif.runs[0]?.results ?? [];
  assert.equal(results.length, 3);
  assert.equal(results.some((finding) => finding.ruleId === "license"), false);
  assert.equal(results.find((finding) => finding.ruleId === "readme")?.level, "warning");
  assert.equal(results.filter((finding) => finding.ruleId === "secrets").length, 2);
  assert.equal(
    results.find((finding) => finding.ruleId === "readme")?.locations[0]?.physicalLocation
      .artifactLocation.uri,
    "docs/getting%20started.md",
  );
  assert.equal(
    results.find((finding) => finding.ruleId === "readme")?.locations[0]?.physicalLocation
      .region.startLine,
    3,
  );
  assert.match(
    results.find((finding) => finding.ruleId === "readme")?.message.text ?? "",
    /Suggested fix: Add examples\./,
  );
});

test("rejects JSON and SARIF output together", () => {
  const cli = join(import.meta.dirname, "../src/cli.js");
  const execution = spawnSync(process.execPath, [cli, "--json", "--sarif"], {
    encoding: "utf8",
  });

  assert.equal(execution.status, 2);
  assert.match(execution.stderr, /--json and --sarif cannot be used together/);
});

test("prints SARIF through the CLI", () => {
  const cli = join(import.meta.dirname, "../src/cli.js");
  const projectRoot = join(import.meta.dirname, "../..");
  const execution = spawnSync(
    process.execPath,
    [cli, projectRoot, "--sarif", "--no-fail"],
    { encoding: "utf8" },
  );

  assert.equal(execution.status, 0);
  const sarif = JSON.parse(execution.stdout) as {
    version: string;
    runs: Array<{ tool: { driver: { name: string } } }>;
  };
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs[0]?.tool.driver.name, "ShipProof");
});
