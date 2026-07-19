import { basename, join } from "node:path";
import { listFiles, pathExists, readJson, readUtf8 } from "../files.js";
import type { CheckResult, ProjectInfo } from "../types.js";
import { findPotentialSecrets } from "./secrets.js";

interface PackageJson {
  name?: string;
  description?: string;
  license?: string;
  repository?: unknown;
  scripts?: Record<string, string>;
}

interface ReadinessChecks {
  project: ProjectInfo;
  checks: CheckResult[];
}

function result(
  id: string,
  title: string,
  status: CheckResult["status"],
  message: string,
  weight: number,
  suggestion?: string,
): CheckResult {
  return suggestion === undefined
    ? { id, title, status, message, weight }
    : { id, title, status, message, weight, suggestion };
}

function findRootFile(files: string[], names: string[]): string | undefined {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return files.find((file) => !file.includes("/") && wanted.has(file.toLowerCase()));
}

function detectEcosystems(root: string): string[] {
  const ecosystems: string[] = [];
  if (pathExists(root, "package.json")) ecosystems.push("Node.js");
  if (
    pathExists(root, "pyproject.toml") ||
    pathExists(root, "requirements.txt") ||
    pathExists(root, "Pipfile")
  ) {
    ecosystems.push("Python");
  }
  if (pathExists(root, "Cargo.toml")) ecosystems.push("Rust");
  if (pathExists(root, "go.mod")) ecosystems.push("Go");
  return ecosystems;
}

function hasUsefulScript(scripts: Record<string, string> | undefined, names: string[]): boolean {
  if (!scripts) return false;
  return names.some((name) => {
    const command = scripts[name]?.trim();
    return command !== undefined && command.length > 0 && !/no tests?|not implemented/i.test(command);
  });
}

function lockfileCheck(root: string, ecosystems: string[]): CheckResult {
  const expected = new Map<string, string[]>([
    ["Node.js", ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock", "bun.lockb"]],
    ["Python", ["uv.lock", "poetry.lock", "Pipfile.lock", "requirements.txt"]],
    ["Rust", ["Cargo.lock"]],
    ["Go", ["go.sum"]],
  ]);

  if (ecosystems.length === 0) {
    return result("lockfile", "Reproducible dependencies", "info", "No supported dependency ecosystem was detected.", 0);
  }

  const missing = ecosystems.filter((ecosystem) => {
    const candidates = expected.get(ecosystem) ?? [];
    return !candidates.some((file) => pathExists(root, file));
  });

  if (missing.length === 0) {
    return result("lockfile", "Reproducible dependencies", "pass", "A dependency lock or pinned manifest is present.", 8);
  }

  return result(
    "lockfile",
    "Reproducible dependencies",
    "warn",
    `Missing reproducibility files for: ${missing.join(", ")}.`,
    8,
    "Commit the lockfile produced by your package manager.",
  );
}

function scriptChecks(root: string, ecosystems: string[], packageJson: PackageJson | undefined): CheckResult[] {
  if (!ecosystems.includes("Node.js")) {
    if (ecosystems.includes("Rust") || ecosystems.includes("Go")) {
      return [
        result("test-command", "Test command", "pass", "The ecosystem provides a conventional test command.", 8),
        result("quality-command", "Quality command", "pass", "The ecosystem provides conventional formatting and analysis commands.", 7),
      ];
    }

    if (ecosystems.includes("Python")) {
      const pyproject = readUtf8(join(root, "pyproject.toml")) ?? "";
      const hasTest = /pytest|unittest/i.test(pyproject) || pathExists(root, "tests") || pathExists(root, "test");
      const hasQuality = /ruff|mypy|pyright|flake8|black/i.test(pyproject);
      return [
        result(
          "test-command",
          "Test setup",
          hasTest ? "pass" : "warn",
          hasTest ? "A Python test setup was detected." : "No Python test setup was detected.",
          8,
          hasTest ? undefined : "Add a tests/ directory and configure pytest or unittest.",
        ),
        result(
          "quality-command",
          "Quality setup",
          hasQuality ? "pass" : "warn",
          hasQuality ? "A Python quality tool was detected." : "No Python formatter, linter, or type checker was detected.",
          7,
          hasQuality ? undefined : "Configure a tool such as Ruff, mypy, or Pyright.",
        ),
      ];
    }

    return [result("commands", "Project commands", "info", "Command checks are not available for this project type yet.", 0)];
  }

  const scripts = packageJson?.scripts;
  const test = hasUsefulScript(scripts, ["test"]);
  const quality = hasUsefulScript(scripts, ["lint", "check", "typecheck", "type-check"]);
  const build = hasUsefulScript(scripts, ["build"]);

  return [
    result(
      "test-command",
      "Test command",
      test ? "pass" : "fail",
      test ? "package.json defines a usable test script." : "package.json has no usable test script.",
      8,
      test ? undefined : "Add a test script that runs your automated test suite.",
    ),
    result(
      "quality-command",
      "Quality command",
      quality ? "pass" : "warn",
      quality ? "A lint, check, or type-check script is available." : "No lint, check, or type-check script is available.",
      7,
      quality ? undefined : "Add a lint or type-check script so contributors can verify changes.",
    ),
    result(
      "build-command",
      "Build command",
      build ? "pass" : "warn",
      build ? "package.json defines a build script." : "package.json has no build script.",
      5,
      build ? undefined : "Add a build script when the project produces compiled output.",
    ),
  ];
}

export function runReadinessChecks(root: string): ReadinessChecks {
  const files = listFiles(root);
  const ecosystems = detectEcosystems(root);
  const packagePath = join(root, "package.json");
  const hasPackageJson = pathExists(root, "package.json");
  const packageJson = hasPackageJson ? readJson<PackageJson>(packagePath) : undefined;
  const project: ProjectInfo = {
    name: packageJson?.name ?? basename(root),
    path: root,
    ecosystems,
  };
  const checks: CheckResult[] = [];

  checks.push(
    ecosystems.length > 0
      ? result("project-detected", "Project detected", "pass", `Detected: ${ecosystems.join(", ")}.`, 8)
      : result(
          "project-detected",
          "Project detected",
          "fail",
          "No supported project manifest was found.",
          8,
          "Add package.json, pyproject.toml, Cargo.toml, or go.mod.",
        ),
  );

  if (hasPackageJson && packageJson === undefined) {
    checks.push(
      result(
        "package-json",
        "Valid package.json",
        "fail",
        "package.json could not be parsed as JSON.",
        8,
        "Fix the JSON syntax before publishing.",
      ),
    );
  }

  const readme = findRootFile(files, ["README.md", "README.mdx", "README.rst"]);
  const readmeContent = readme ? readUtf8(join(root, readme)) ?? "" : "";
  checks.push(
    !readme
      ? result("readme", "README", "fail", "No root README was found.", 10, "Explain the problem, installation, usage, and contribution path.")
      : readmeContent.trim().length < 400
        ? result("readme", "README", "warn", `${readme} exists but is very short.`, 10, "Add installation, examples, limitations, and a roadmap.")
        : result("readme", "README", "pass", `${readme} gives the project a useful front page.`, 10),
  );

  const license = findRootFile(files, ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"]);
  checks.push(
    license
      ? result("license", "License", "pass", `${license} is present.`, 7)
      : result("license", "License", "fail", "No license file was found.", 7, "Choose an open-source license and add it at the repository root."),
  );

  checks.push(
    pathExists(root, ".gitignore")
      ? result("gitignore", ".gitignore", "pass", "Generated files can be kept out of version control.", 5)
      : result("gitignore", ".gitignore", "warn", "No .gitignore file was found.", 5, "Add ignores for dependencies, builds, secrets, and editor files."),
  );

  checks.push(lockfileCheck(root, ecosystems));
  checks.push(...scriptChecks(root, ecosystems, packageJson));

  const workflows = files.filter((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(file));
  checks.push(
    workflows.length > 0
      ? result("ci", "Continuous integration", "pass", `Found ${workflows.length} GitHub Actions workflow${workflows.length === 1 ? "" : "s"}.`, 10)
      : result("ci", "Continuous integration", "warn", "No GitHub Actions workflow was found.", 10, "Run tests and quality checks on pushes and pull requests."),
  );

  if (packageJson) {
    const missingMetadata = [
      packageJson.description?.trim() ? undefined : "description",
      packageJson.license?.trim() ? undefined : "license",
      packageJson.repository ? undefined : "repository",
    ].filter((field): field is string => field !== undefined);
    checks.push(
      missingMetadata.length === 0
        ? result("package-metadata", "Package metadata", "pass", "Description, license, and repository metadata are set.", 5)
        : result(
            "package-metadata",
            "Package metadata",
            "warn",
            `Missing package metadata: ${missingMetadata.join(", ")}.`,
            5,
            "Complete the metadata so registries and tools can describe the project.",
          ),
    );
  }

  const communityFiles = ["CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md"];
  const missingCommunityFiles = communityFiles.filter((file) => !pathExists(root, file));
  checks.push(
    missingCommunityFiles.length === 0
      ? result("community", "Community health", "pass", "Contribution, conduct, and security guidance are present.", 5)
      : result(
          "community",
          "Community health",
          "warn",
          `Missing: ${missingCommunityFiles.join(", ")}.`,
          5,
          "Add lightweight guidance before inviting contributors.",
        ),
  );

  const secretFindings = findPotentialSecrets(root);
  if (secretFindings.length === 0) {
    checks.push(result("secrets", "Secret exposure", "pass", "No common secret patterns or sensitive filenames were detected.", 14));
  } else {
    const paths = [...new Set(secretFindings.map((finding) => finding.path))];
    checks.push(
      result(
        "secrets",
        "Secret exposure",
        "fail",
        `Potential secrets found in ${paths.length} file${paths.length === 1 ? "" : "s"}: ${paths.slice(0, 4).join(", ")}${paths.length > 4 ? ", …" : ""}.`,
        14,
        "Remove the files from version control, rotate exposed credentials, and provide redacted examples instead.",
      ),
    );
  }

  return { project, checks };
}
