<p align="center">
  <img src="docs/shipproof.svg" alt="ShipProof — know before you ship" width="620">
</p>

<p align="center">
  Zero-config release readiness checks for AI-assisted projects.
</p>

<p align="center">
  <a href="https://github.com/CalvaryBloom/shipproof/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/CalvaryBloom/shipproof/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-22c55e"></a>
  <img alt="Node 22.13+" src="https://img.shields.io/badge/node-%3E%3D22.13-339933">
</p>

<p align="center">
  English · <a href="README.es.md">Español</a>
</p>

ShipProof gives a project one clear readiness score and explains what to fix before it becomes public. It is fast, local, deterministic, and designed to catch the unglamorous gaps that AI-generated code often leaves behind.

<p align="center">
  <img src="docs/demo.svg" alt="ShipProof terminal output showing a 92 out of 100 readiness score" width="860">
</p>

## Why ShipProof?

AI can create a convincing application in minutes. That does not mean the result is ready for users or contributors. Tests may be placeholders, credentials may be sitting in an environment file, builds may not be reproducible, and the repository may have no license or security policy.

ShipProof turns that vague final review into a repeatable command:

```bash
npx github:CalvaryBloom/shipproof
```

It currently recognizes Node.js, Python, Rust, and Go projects. It never executes commands from the project being inspected and never uploads source code.

## What it checks

| Area | Examples |
| --- | --- |
| Project | Recognized manifests and valid package metadata |
| Quality | Test, lint, type-check, and build commands |
| Reproducibility | Lockfiles and pinned dependency manifests |
| Security | Sensitive filenames and conservative credential patterns |
| Documentation | README depth, license, and contribution guidance |
| Automation | GitHub Actions workflows |
| Community | Conduct, contribution, and security policies |

The output includes suggestions rather than exposing any matched secret value. ShipProof is a preflight assistant, not a replacement for dedicated security scanners or human review.

## Usage

Requires Node.js 22.13 or newer.

```bash
# Inspect the current directory
npx github:CalvaryBloom/shipproof

# Inspect another directory
npx github:CalvaryBloom/shipproof ./my-project

# Produce machine-readable output
npx github:CalvaryBloom/shipproof --json

# Report findings without a failing exit code
npx github:CalvaryBloom/shipproof --no-fail
```

### Options

```text
shipproof [path] [options]

--json       Print machine-readable JSON
--no-color   Disable ANSI colors
--no-fail    Exit with code 0 even when blocking issues are found
-h, --help   Show help
-v, --version
             Show the version
```

By default, ShipProof exits with code `1` when at least one blocking issue is found and `2` for invalid input. This makes it useful in continuous integration. Warnings lower the score but do not change the exit code.

## Scoring

Each applicable check has an explicit weight. Passing earns the full weight, a warning earns half, and a failure earns none.

| Score | Meaning |
| ---: | --- |
| 90–100 | Ready to ship |
| 75–89 | Almost ready |
| 50–74 | Needs work |
| 0–49 | Not ready |

The score is intentionally explainable. It is not a promise that software is correct or secure.

## Local development

```bash
git clone https://github.com/CalvaryBloom/shipproof.git
cd shipproof
pnpm install
pnpm test
node dist/src/cli.js . --no-fail
```

ShipProof has no runtime dependencies. TypeScript and its Node.js declarations are development-only dependencies.

## Roadmap

- GitHub Action with a compact pull-request summary.
- Configurable thresholds through `shipproof.config.json`.
- Deeper Python, Rust, and Go checks.
- SARIF output for GitHub code scanning.
- A public check catalog with evidence and false-positive guidance.
- npm release with provenance after the first public feedback round.

The best roadmap item is the one backed by a real repository and a reproducible failure. Please use the feature request template to share one.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a check. New checks should remain deterministic, local, safe, and clear about false positives.

Please report vulnerabilities through [private vulnerability reporting](https://github.com/CalvaryBloom/shipproof/security/advisories/new), not a public issue.

## License

[MIT](LICENSE) © 2026 CalvaryBloom
