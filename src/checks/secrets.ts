import { basename, join } from "node:path";
import { isSmallTextFile, listFiles, readUtf8 } from "../files.js";

export interface SecretFinding {
  path: string;
  kind: string;
  line: number;
}

const safeEnvironmentSuffixes = [".example", ".sample", ".template"];

function sensitiveFilename(path: string): string | undefined {
  const name = basename(path).toLowerCase();

  if (
    name === ".env" ||
    (name.startsWith(".env.") &&
      !safeEnvironmentSuffixes.some((suffix) => name.endsWith(suffix)))
  ) {
    return "environment file";
  }

  if (["id_rsa", "id_ed25519", "credentials.json", "service-account.json"].includes(name)) {
    return "credential file";
  }

  if ([".pem", ".p12", ".pfx"].some((extension) => name.endsWith(extension))) {
    return "key or certificate file";
  }

  return undefined;
}

const contentPatterns: Array<{ kind: string; pattern: RegExp }> = [
  { kind: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { kind: "OpenAI-style key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { kind: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    kind: "private key",
    pattern: new RegExp(["-----BEGIN", "(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"].join(" ")),
  },
];

export function findPotentialSecrets(root: string): SecretFinding[] {
  const files = listFiles(root);
  const findings: SecretFinding[] = [];

  for (const path of files) {
    const fileKind = sensitiveFilename(path);
    if (fileKind) findings.push({ path, kind: fileKind, line: 1 });

    if (!isSmallTextFile(root, path)) continue;
    const content = readUtf8(join(root, path));
    if (content === undefined) continue;

    for (const { kind, pattern } of contentPatterns) {
      const match = pattern.exec(content);
      if (match) {
        const line = content.slice(0, match.index).split(/\r?\n/).length;
        findings.push({ path, kind, line });
        break;
      }
    }
  }

  return findings;
}
