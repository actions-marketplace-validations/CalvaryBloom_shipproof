import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { analyzeProject } from "../src/analyze.js";
import { renderJson } from "../src/reporters/json.js";

const temporaryProjects: string[] = [];

afterEach(() => {
  const safeRoot = resolve(tmpdir());
  for (const directory of temporaryProjects.splice(0)) {
    const resolvedDirectory = resolve(directory);
    assert.ok(resolvedDirectory.startsWith(safeRoot), "Refusing to remove a non-temporary path");
    rmSync(resolvedDirectory, { recursive: true, force: true });
  }
});

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "shipproof-test-"));
  temporaryProjects.push(root);

  for (const [path, content] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content, "utf8");
  }

  return root;
}

const longReadme = `# Demo project\n\n${"A useful explanation of installation, usage, design decisions, limitations, and contribution paths. ".repeat(6)}`;

test("scores a well-prepared Node.js project as ready", () => {
  const root = project({
    "package.json": JSON.stringify({
      name: "ready-project",
      description: "A complete project used to verify ShipProof.",
      license: "MIT",
      repository: "https://github.com/example/ready-project",
      scripts: { test: "node --test", lint: "tsc --noEmit", build: "tsc" },
    }),
    "README.md": longReadme,
    LICENSE: "MIT",
    ".gitignore": "node_modules/\n.env\n",
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "CONTRIBUTING.md": "Contributions are welcome.",
    "CODE_OF_CONDUCT.md": "Be respectful.",
    "SECURITY.md": "Report vulnerabilities privately.",
    ".github/workflows/ci.yml": "name: CI\n",
    "src/index.ts": "export const answer = 42;\n",
  });

  const analysis = analyzeProject(root);

  assert.equal(analysis.project.name, "ready-project");
  assert.deepEqual(analysis.project.ecosystems, ["Node.js"]);
  assert.equal(analysis.score, 100);
  assert.equal(analysis.readiness, "ready");
  assert.equal(analysis.summary.failed, 0);
});

test("returns actionable failures for a sparse project", () => {
  const root = project({
    "package.json": JSON.stringify({ name: "sparse-project", scripts: {} }),
  });

  const analysis = analyzeProject(root);
  const failedIds = analysis.checks
    .filter((check) => check.status === "fail")
    .map((check) => check.id);

  assert.ok(failedIds.includes("readme"));
  assert.ok(failedIds.includes("license"));
  assert.ok(failedIds.includes("test-command"));
  assert.ok(analysis.score < 75);
});

test("reports a secret location without exposing the secret value", () => {
  const token = `ghp_${"a".repeat(24)}`;
  const root = project({
    "package.json": JSON.stringify({ name: "secret-project", scripts: { test: "node --test" } }),
    "config.ts": `export const token = "${token}";`,
  });

  const analysis = analyzeProject(root);
  const secretCheck = analysis.checks.find((check) => check.id === "secrets");
  const json = renderJson(analysis);

  assert.equal(secretCheck?.status, "fail");
  assert.match(secretCheck?.message ?? "", /config\.ts/);
  assert.doesNotMatch(json, new RegExp(token));
});
