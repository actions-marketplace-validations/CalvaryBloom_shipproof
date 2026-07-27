export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface CheckLocation {
  path: string;
  line: number;
}

export interface CheckResult {
  id: string;
  title: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;
  locations?: CheckLocation[];
  weight: number;
}

export interface ProjectInfo {
  name: string;
  path: string;
  ecosystems: string[];
}

export interface AnalysisSummary {
  passed: number;
  warnings: number;
  failed: number;
  informational: number;
}

export type Readiness = "ready" | "close" | "work-needed" | "not-ready";

export interface AnalysisResult {
  version: string;
  analyzedAt: string;
  durationMs: number;
  project: ProjectInfo;
  score: number;
  readiness: Readiness;
  summary: AnalysisSummary;
  checks: CheckResult[];
}
