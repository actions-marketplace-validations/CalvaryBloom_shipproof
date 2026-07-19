# Contributing to ShipProof

Thanks for helping people publish more trustworthy software.

## Before opening code

- Search existing issues and discussions.
- For a new check, describe the failure mode, the evidence it can inspect, and likely false positives.
- Keep checks deterministic and local. ShipProof must not upload source code or execute commands from the inspected project.

Small bug fixes can go directly to a pull request. Please open an issue first for new ecosystems, output formats, or changes to scoring.

## Local development

Requirements: Node.js 20 or newer and pnpm 11.

```bash
pnpm install
pnpm check
pnpm test
node dist/src/cli.js . --no-fail
```

## Pull requests

- Keep each pull request focused.
- Add or update tests for behavior changes.
- Explain user impact and possible false positives.
- Never include real credentials in fixtures. Construct obviously fake values during the test instead.

By contributing, you agree that your work is released under the MIT License.
