import { basename, join } from "node:path";
import { listFiles, pathExists, readJson, readUtf8 } from "../files.js";
import { findPotentialSecrets } from "./secrets.js";
function result(id, title, status, message, weight, suggestion, locations = []) {
    const check = { id, title, status, message, weight };
    if (suggestion !== undefined)
        check.suggestion = suggestion;
    if (locations.length > 0)
        check.locations = locations;
    return check;
}
function at(path) {
    return [{ path, line: 1 }];
}
function findRootFile(files, names) {
    const wanted = new Set(names.map((name) => name.toLowerCase()));
    return files.find((file) => !file.includes("/") && wanted.has(file.toLowerCase()));
}
function detectEcosystems(root) {
    const ecosystems = [];
    if (pathExists(root, "package.json"))
        ecosystems.push("Node.js");
    if (pathExists(root, "pyproject.toml") ||
        pathExists(root, "requirements.txt") ||
        pathExists(root, "Pipfile")) {
        ecosystems.push("Python");
    }
    if (pathExists(root, "Cargo.toml"))
        ecosystems.push("Rust");
    if (pathExists(root, "go.mod"))
        ecosystems.push("Go");
    return ecosystems;
}
function hasUsefulScript(scripts, names) {
    if (!scripts)
        return false;
    return names.some((name) => {
        const command = scripts[name]?.trim();
        return command !== undefined && command.length > 0 && !/no tests?|not implemented/i.test(command);
    });
}
function lockfileCheck(root, ecosystems, anchor) {
    const expected = new Map([
        ["Node.js", ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock", "bun.lockb"]],
        ["Python", ["uv.lock", "poetry.lock", "Pipfile.lock", "requirements.txt"]],
        ["Rust", ["Cargo.lock"]],
        ["Go", ["go.sum"]],
    ]);
    if (ecosystems.length === 0) {
        return result("lockfile", "Reproducible dependencies", "info", "No supported dependency ecosystem was detected.", 0, undefined, at(anchor));
    }
    const present = ecosystems
        .flatMap((ecosystem) => expected.get(ecosystem) ?? [])
        .find((file) => pathExists(root, file));
    const missing = ecosystems.filter((ecosystem) => {
        const candidates = expected.get(ecosystem) ?? [];
        return !candidates.some((file) => pathExists(root, file));
    });
    if (missing.length === 0) {
        return result("lockfile", "Reproducible dependencies", "pass", "A dependency lock or pinned manifest is present.", 8, undefined, at(present ?? anchor));
    }
    return result("lockfile", "Reproducible dependencies", "warn", `Missing reproducibility files for: ${missing.join(", ")}.`, 8, "Commit the lockfile produced by your package manager.", at(present ?? anchor));
}
function scriptChecks(root, ecosystems, packageJson, anchor) {
    const manifest = ecosystems.includes("Node.js")
        ? "package.json"
        : ecosystems.includes("Python")
            ? (["pyproject.toml", "requirements.txt", "Pipfile"].find((file) => pathExists(root, file)) ?? anchor)
            : ecosystems.includes("Rust")
                ? "Cargo.toml"
                : ecosystems.includes("Go")
                    ? "go.mod"
                    : anchor;
    if (!ecosystems.includes("Node.js")) {
        if (ecosystems.includes("Rust") || ecosystems.includes("Go")) {
            return [
                result("test-command", "Test command", "pass", "The ecosystem provides a conventional test command.", 8, undefined, at(manifest)),
                result("quality-command", "Quality command", "pass", "The ecosystem provides conventional formatting and analysis commands.", 7, undefined, at(manifest)),
            ];
        }
        if (ecosystems.includes("Python")) {
            const pyproject = readUtf8(join(root, "pyproject.toml")) ?? "";
            const hasTest = /pytest|unittest/i.test(pyproject) || pathExists(root, "tests") || pathExists(root, "test");
            const hasQuality = /ruff|mypy|pyright|flake8|black/i.test(pyproject);
            return [
                result("test-command", "Test setup", hasTest ? "pass" : "warn", hasTest ? "A Python test setup was detected." : "No Python test setup was detected.", 8, hasTest ? undefined : "Add a tests/ directory and configure pytest or unittest.", at(manifest)),
                result("quality-command", "Quality setup", hasQuality ? "pass" : "warn", hasQuality ? "A Python quality tool was detected." : "No Python formatter, linter, or type checker was detected.", 7, hasQuality ? undefined : "Configure a tool such as Ruff, mypy, or Pyright.", at(manifest)),
            ];
        }
        return [
            result("commands", "Project commands", "info", "Command checks are not available for this project type yet.", 0, undefined, at(anchor)),
        ];
    }
    const scripts = packageJson?.scripts;
    const test = hasUsefulScript(scripts, ["test"]);
    const quality = hasUsefulScript(scripts, ["lint", "check", "typecheck", "type-check"]);
    const build = hasUsefulScript(scripts, ["build"]);
    return [
        result("test-command", "Test command", test ? "pass" : "fail", test ? "package.json defines a usable test script." : "package.json has no usable test script.", 8, test ? undefined : "Add a test script that runs your automated test suite.", at("package.json")),
        result("quality-command", "Quality command", quality ? "pass" : "warn", quality ? "A lint, check, or type-check script is available." : "No lint, check, or type-check script is available.", 7, quality ? undefined : "Add a lint or type-check script so contributors can verify changes.", at("package.json")),
        result("build-command", "Build command", build ? "pass" : "warn", build ? "package.json defines a build script." : "package.json has no build script.", 5, build ? undefined : "Add a build script when the project produces compiled output.", at("package.json")),
    ];
}
export function runReadinessChecks(root) {
    const files = listFiles(root);
    const ecosystems = detectEcosystems(root);
    const packagePath = join(root, "package.json");
    const hasPackageJson = pathExists(root, "package.json");
    const packageJson = hasPackageJson ? readJson(packagePath) : undefined;
    const supportedManifest = [
        "package.json",
        "pyproject.toml",
        "requirements.txt",
        "Pipfile",
        "Cargo.toml",
        "go.mod",
    ].find((file) => pathExists(root, file));
    const anchor = supportedManifest ?? files[0] ?? ".";
    const project = {
        name: packageJson?.name ?? basename(root),
        path: root,
        ecosystems,
    };
    const checks = [];
    checks.push(ecosystems.length > 0
        ? result("project-detected", "Project detected", "pass", `Detected: ${ecosystems.join(", ")}.`, 8, undefined, at(supportedManifest ?? anchor))
        : result("project-detected", "Project detected", "fail", "No supported project manifest was found.", 8, "Add package.json, pyproject.toml, Cargo.toml, or go.mod.", at(anchor)));
    if (hasPackageJson && packageJson === undefined) {
        checks.push(result("package-json", "Valid package.json", "fail", "package.json could not be parsed as JSON.", 8, "Fix the JSON syntax before publishing.", at("package.json")));
    }
    const readme = findRootFile(files, ["README.md", "README.mdx", "README.rst"]);
    const readmeContent = readme ? readUtf8(join(root, readme)) ?? "" : "";
    checks.push(!readme
        ? result("readme", "README", "fail", "No root README was found.", 10, "Explain the problem, installation, usage, and contribution path.", at(anchor))
        : readmeContent.trim().length < 400
            ? result("readme", "README", "warn", `${readme} exists but is very short.`, 10, "Add installation, examples, limitations, and a roadmap.", at(readme))
            : result("readme", "README", "pass", `${readme} gives the project a useful front page.`, 10, undefined, at(readme)));
    const license = findRootFile(files, ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"]);
    checks.push(license
        ? result("license", "License", "pass", `${license} is present.`, 7, undefined, at(license))
        : result("license", "License", "fail", "No license file was found.", 7, "Choose an open-source license and add it at the repository root.", at(anchor)));
    checks.push(pathExists(root, ".gitignore")
        ? result("gitignore", ".gitignore", "pass", "Generated files can be kept out of version control.", 5, undefined, at(".gitignore"))
        : result("gitignore", ".gitignore", "warn", "No .gitignore file was found.", 5, "Add ignores for dependencies, builds, secrets, and editor files.", at(anchor)));
    checks.push(lockfileCheck(root, ecosystems, anchor));
    checks.push(...scriptChecks(root, ecosystems, packageJson, anchor));
    const workflows = files.filter((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(file));
    checks.push(workflows.length > 0
        ? result("ci", "Continuous integration", "pass", `Found ${workflows.length} GitHub Actions workflow${workflows.length === 1 ? "" : "s"}.`, 10, undefined, at(workflows[0] ?? anchor))
        : result("ci", "Continuous integration", "warn", "No GitHub Actions workflow was found.", 10, "Run tests and quality checks on pushes and pull requests.", at(anchor)));
    if (packageJson) {
        const missingMetadata = [
            packageJson.description?.trim() ? undefined : "description",
            packageJson.license?.trim() ? undefined : "license",
            packageJson.repository ? undefined : "repository",
        ].filter((field) => field !== undefined);
        checks.push(missingMetadata.length === 0
            ? result("package-metadata", "Package metadata", "pass", "Description, license, and repository metadata are set.", 5, undefined, at("package.json"))
            : result("package-metadata", "Package metadata", "warn", `Missing package metadata: ${missingMetadata.join(", ")}.`, 5, "Complete the metadata so registries and tools can describe the project.", at("package.json")));
    }
    const communityFiles = ["CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md"];
    const missingCommunityFiles = communityFiles.filter((file) => !pathExists(root, file));
    checks.push(missingCommunityFiles.length === 0
        ? result("community", "Community health", "pass", "Contribution, conduct, and security guidance are present.", 5, undefined, at(communityFiles[0] ?? anchor))
        : result("community", "Community health", "warn", `Missing: ${missingCommunityFiles.join(", ")}.`, 5, "Add lightweight guidance before inviting contributors.", at(communityFiles.find((file) => pathExists(root, file)) ?? anchor)));
    const secretFindings = findPotentialSecrets(root);
    if (secretFindings.length === 0) {
        checks.push(result("secrets", "Secret exposure", "pass", "No common secret patterns or sensitive filenames were detected.", 14, undefined, at(anchor)));
    }
    else {
        const paths = [...new Set(secretFindings.map((finding) => finding.path))];
        checks.push(result("secrets", "Secret exposure", "fail", `Potential secrets found in ${paths.length} file${paths.length === 1 ? "" : "s"}: ${paths.slice(0, 4).join(", ")}${paths.length > 4 ? ", …" : ""}.`, 14, "Remove the files from version control, rotate exposed credentials, and provide redacted examples instead.", secretFindings.map(({ path, line }) => ({ path, line }))));
    }
    return { project, checks };
}
//# sourceMappingURL=readiness.js.map