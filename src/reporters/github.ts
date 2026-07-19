import type { AnalysisResult, CheckStatus, Readiness } from "../types.js";

const statusLabels: Record<CheckStatus, string> = {
  pass: "Pass",
  warn: "Warning",
  fail: "Failed",
  info: "Info",
};

const readinessLabels: Record<Readiness, string> = {
  ready: "Ready to ship",
  close: "Almost ready",
  "work-needed": "Needs work",
  "not-ready": "Not ready",
};

function markdownCell(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

export function renderGitHubSummary(result: AnalysisResult): string {
  const findings = result.checks.filter((check) => check.status === "warn" || check.status === "fail");
  const lines = [
    `## ShipProof: ${result.score}/100`,
    "",
    `**${readinessLabels[result.readiness]}** · ${result.summary.passed} passed · ${result.summary.warnings} warnings · ${result.summary.failed} failed`,
    "",
  ];

  if (findings.length === 0) {
    lines.push("No blocking issues or warnings were found.");
    return lines.join("\n");
  }

  lines.push("| Status | Check | Finding |", "| --- | --- | --- |");
  for (const check of findings) {
    const finding = check.suggestion ? `${check.message} Suggested fix: ${check.suggestion}` : check.message;
    lines.push(
      `| ${statusLabels[check.status]} | ${markdownCell(check.title)} | ${markdownCell(finding)} |`,
    );
  }

  return lines.join("\n");
}
