const symbols = {
    pass: "✓",
    warn: "!",
    fail: "×",
    info: "·",
};
const readinessLabels = {
    ready: "Ready to ship",
    close: "Almost ready",
    "work-needed": "Needs work",
    "not-ready": "Not ready",
};
function painter(enabled) {
    const wrap = (code) => (value) => enabled ? `\u001B[${code}m${value}\u001B[0m` : value;
    return {
        pass: wrap(32),
        warn: wrap(33),
        fail: wrap(31),
        info: wrap(36),
        accent: wrap(35),
        muted: wrap(90),
    };
}
function scoreBar(score) {
    const filled = Math.round(score / 5);
    return `${"█".repeat(filled)}${"░".repeat(20 - filled)}`;
}
export function renderTerminal(result, color = true) {
    const paint = painter(color);
    const scoreStatus = result.score >= 90 ? "pass" : result.score >= 70 ? "warn" : "fail";
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
    lines.push("", paint.muted(`  ${result.summary.passed} passed · ${result.summary.warnings} warnings · ${result.summary.failed} failed · ${result.durationMs}ms`), "");
    return lines.join("\n");
}
//# sourceMappingURL=terminal.js.map