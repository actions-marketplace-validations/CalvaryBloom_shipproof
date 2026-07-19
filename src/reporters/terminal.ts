import type { AnalysisResult, CheckStatus, Readiness } from "../types.js";

const symbols: Record<CheckStatus, string> = {
  pass: "✓",
  warn: "!",
  fail: "×",
  info: "·",
};

const readinessLabels: Record<Readiness, string> = {
  ready: "Ready to ship",
  close: "Almost ready",
  "work-needed": "Needs work",
  "not-ready": "Not ready",
};

function painter(enabled: boolean): Record<CheckStatus | "accent" | "muted", (value: string) => string> {
  const wrap = (code: number) => (value: string): string =>
    enabled ? `\u001B[${code}m${value}\u001B[0m` : value;

  return {
    pass: wrap(32),
    warn: wrap(33),
    fail: wrap(31),
    info: wrap(36),
    accent: wrap(35),
    muted: wrap(90),
  };
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 5);
  return `${"█".repeat(filled)}${"░".repeat(20 - filled)}`;
}

export function renderTerminal(result: AnalysisResult, color = true): string {
  const paint = painter(color);
  const scoreStatus: CheckStatus = result.score >= 90 ? "pass" : result.score >= 70 ? "warn" : "fail";
  const ecosystem = result.project.ecosystems.length > 0 ? result.project.ecosystems.join(", ") : "unknown stack";
  const lines = [
    "",
    paint.accent("  SHIPPROOF"),
    paint.muted(`  ${result.project.name} · ${ecosystem}`),
    "",
    `  ${paint[scoreStatus](`${result.score}/100`)}  ${scoreBar(result.score)}  ${readinessLabels[result.readiness]}`,
    "",
  ];

  for (const check of result.checks) {
    const marker = paint[check.status](symbols[check.status]);
    lines.push(`  ${marker} ${check.title}: ${check.message}`);
    if (check.suggestion && check.status !== "pass") {
      lines.push(paint.muted(`    → ${check.suggestion}`));
    }
  }

  lines.push(
    "",
    paint.muted(
      `  ${result.summary.passed} passed · ${result.summary.warnings} warnings · ${result.summary.failed} failed · ${result.durationMs}ms`,
    ),
    "",
  );

  return lines.join("\n");
}
