# Changelog

Notable changes follow [Semantic Versioning](https://semver.org/).

## 0.2.0 - 2026-07-19

### Added

- Reusable GitHub Action with a native Node.js 24 runtime.
- Workflow summary containing the score and actionable findings.
- Action outputs for readiness, score, warnings, and failed checks.
- CI smoke test that executes the action exactly as a consumer would.

## 0.1.0 - 2026-07-19

### Added

- Zero-config CLI for Node.js, Python, Rust, and Go projects.
- Weighted release-readiness score with actionable checks.
- Conservative secret-pattern and sensitive-filename detection.
- Human-readable terminal output and machine-readable JSON.
- Automated tests and multi-version Node.js CI.

### Changed

- Set the supported runtime baseline to Node.js 22.13 and test on Node.js 22, 24, and 26.
- Updated the CI actions and TypeScript toolchain to their current major versions.
