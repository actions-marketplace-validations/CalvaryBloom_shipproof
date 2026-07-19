import { resolve } from "node:path";
import { runReadinessChecks } from "./checks/readiness.js";
import type { AnalysisResult, CheckStatus, Readiness } from "./types.js";

export const SHIPPROOF_VERSION = "0.2.0";

const scoreFactors: Record<CheckStatus, number> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
  info: 1,
};

function readinessFor(score: number): Readiness {
  if (score >= 90) return "ready";
  if (score >= 75) return "close";
  if (score >= 50) return "work-needed";
  return "not-ready";
}

export function analyzeProject(target: string): AnalysisResult {
  const startedAt = Date.now();
  const root = resolve(target);
  const { project, checks } = runReadinessChecks(root);
  const scorable = checks.filter((check) => check.weight > 0);
  const totalWeight = scorable.reduce((total, check) => total + check.weight, 0);
  const earnedWeight = scorable.reduce(
    (total, check) => total + check.weight * scoreFactors[check.status],
    0,
  );
  const score = totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100);

  return {
    version: SHIPPROOF_VERSION,
    analyzedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    project,
    score,
    readiness: readinessFor(score),
    summary: {
      passed: checks.filter((check) => check.status === "pass").length,
      warnings: checks.filter((check) => check.status === "warn").length,
      failed: checks.filter((check) => check.status === "fail").length,
      informational: checks.filter((check) => check.status === "info").length,
    },
    checks,
  };
}
