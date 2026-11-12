import fs from "node:fs";
import path from "node:path";
import { careerOpsRoot, readApplications, requestReportReader } from "@/lib/career-ops";
import { parseTsvRows } from "@/lib/dashboard/analytics.mjs";
import { buildJobCatalog } from "./catalog.mjs";

export type JobRequirementItem = {
  label: string;
  status: string;
  evidence: string;
};

export type JobListingItem = {
  id: string;
  trackerNum: string | null;
  company: string;
  role: string;
  description: string;
  mandatoryRequirements: JobRequirementItem[];
  desirableRequirements: JobRequirementItem[];
  technologies: string[];
  location: string;
  modality: string;
  seniority: string;
  salaryText: string;
  url: string;
  discoveredAt: string;
  postedAt: string;
  score: number | null;
  status: string;
  trackerStatus: string | null;
  hasPdf: boolean;
  reportPath: string;
  notes: string;
  isFavorite: boolean;
  isSaved: boolean;
  isDiscarded: boolean;
  discardReason: string;
};

export type VagasUserState = Record<
  string,
  { isFavorite?: boolean; isSaved?: boolean; isDiscarded?: boolean; discardReason?: string }
>;

function readSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function readVagasUserState(): VagasUserState {
  const filePath = path.join(careerOpsRoot(), "data", "vagas-state.json");
  const raw = readSafe(filePath);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as VagasUserState) : {};
  } catch {
    return {};
  }
}

export function loadVagasCatalog(): JobListingItem[] {
  const root = careerOpsRoot();
  const scanHistoryRows = parseTsvRows(readSafe(path.join(root, "data", "scan-history.tsv")));
  const applications = readApplications();
  const readReport = requestReportReader();
  const reportsByNum: Record<string, string> = {};

  for (const app of applications) {
    const report = readReport(app);
    if (report?.content) {
      reportsByNum[String(app.n)] = report.content;
    }
  }

  const discardRaw = readSafe(path.join(root, "data", "discard.log"));
  const discardReasonsByUrl: Record<string, string> = {};
  for (const line of discardRaw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    if (cols.length >= 3 && cols[1]) {
      discardReasonsByUrl[cols[1].trim()] = cols[2].trim();
    }
  }

  const userState = readVagasUserState();
  return buildJobCatalog({
    scanHistoryRows,
    applications,
    reportsByNum,
    discardReasonsByUrl,
    userState,
  }) as JobListingItem[];
}

export function loadVagaById(id: string): JobListingItem | null {
  const catalog = loadVagasCatalog();
  return catalog.find((item) => item.id === id) ?? null;
}
