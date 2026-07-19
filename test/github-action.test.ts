import assert from "node:assert/strict";
import { test } from "node:test";
import { renderGitHubSummary } from "../src/reporters/github.js";
import type { AnalysisResult } from "../src/types.js";

const result: AnalysisResult = {
  version: "0.2.0",
  analyzedAt: "2026-07-19T00:00:00.000Z",
  durationMs: 12,
  project: { name: "demo", path: "/demo", ecosystems: ["Node.js"] },
  score: 82,
  readiness: "close",
  summary: { passed: 1, warnings: 1, failed: 1, informational: 0 },
  checks: [
    { id: "license", title: "License", status: "pass", message: "LICENSE is present.", weight: 7 },
    {
      id: "readme",
      title: "README | docs",
      status: "warn",
      message: "README is short.",
      suggestion: "Add usage\nexamples.",
      weight: 10,
    },
    { id: "tests", title: "Tests", status: "fail", message: "No test command.", weight: 8 },
  ],
};

test("renders a compact, escaped GitHub Actions summary", () => {
  const summary = renderGitHubSummary(result);

  assert.match(summary, /ShipProof: 82\/100/);
  assert.match(summary, /Almost ready/);
  assert.match(summary, /README \\| docs/);
  assert.match(summary, /Suggested fix: Add usage examples\./);
  assert.doesNotMatch(summary, /LICENSE is present/);
});
