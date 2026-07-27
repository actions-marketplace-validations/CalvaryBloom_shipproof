import type { AnalysisResult, CheckLocation, CheckResult, CheckStatus } from "../types.js";

type SarifLevel = "none" | "note" | "warning" | "error";

const SARIF_SCHEMA = "https://json.schemastore.org/sarif-2.1.0.json";

const levels: Record<CheckStatus, SarifLevel> = {
  pass: "none",
  info: "note",
  warn: "warning",
  fail: "error",
};

function artifactUri(path: string): string {
  return path
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function distinctLocations(check: CheckResult): CheckLocation[] {
  const locations = check.locations?.length ? check.locations : [{ path: ".", line: 1 }];
  const seen = new Set<string>();

  return locations.filter((location) => {
    const key = `${location.path}\0${location.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function renderSarif(result: AnalysisResult): string {
  const ruleIndexes = new Map(result.checks.map((check, index) => [check.id, index]));
  const results = result.checks
    .filter((check) => check.status === "warn" || check.status === "fail")
    .flatMap((check) =>
      distinctLocations(check).map((location) => ({
        ruleId: check.id,
        ruleIndex: ruleIndexes.get(check.id),
        level: levels[check.status],
        message: {
          text: check.suggestion
            ? `${check.message} Suggested fix: ${check.suggestion}`
            : check.message,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: artifactUri(location.path),
                uriBaseId: "%SRCROOT%",
              },
              region: {
                startLine: location.line,
              },
            },
          },
        ],
      })),
    );

  return JSON.stringify(
    {
      $schema: SARIF_SCHEMA,
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "ShipProof",
              informationUri: "https://github.com/CalvaryBloom/shipproof",
              semanticVersion: result.version,
              rules: result.checks.map((check) => ({
                id: check.id,
                name: check.id,
                shortDescription: { text: check.title },
                fullDescription: {
                  text: `ShipProof release-readiness check: ${check.title}.`,
                },
                defaultConfiguration: {
                  level: "warning",
                },
                properties: {
                  tags: ["shipproof", "release-readiness"],
                  weight: check.weight,
                },
              })),
            },
          },
          originalUriBaseIds: {
            "%SRCROOT%": {
              uri: "./",
            },
          },
          results,
        },
      ],
    },
    null,
    2,
  );
}
