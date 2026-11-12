import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { careerOpsRoot } from "@/lib/career-ops";
import { parseTsvRows } from "@/lib/dashboard/analytics.mjs";

export type PortalSource = {
  name: string;
  careersUrl: string;
  scanMethod: string;
  scanQuery: string;
  enabled: boolean;
  notes: string;
};

export type AutomationRunRecord = {
  id: string;
  runType: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  finishedAt?: string;
  summary: string;
  error?: string;
};

export type AutomacoesData = {
  sources: PortalSource[];
  searchQueries: Array<{ name: string; query: string; enabled: boolean }>;
  titleFilter: { positive: string[]; negative: string[] };
  locationFilter: { allow: string[] };
  runs: AutomationRunRecord[];
  scheduledJobsCount: number;
  nextScheduledRun: string | null;
  portalHealth: Array<{ portal: string; status: string; checkedAt: string }>;
};

function readSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function automationRunsPath(): string {
  return path.join(careerOpsRoot(), "data", "automation-runs.json");
}

export function readAutomationRuns(): AutomationRunRecord[] {
  const raw = readSafe(automationRunsPath());
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AutomationRunRecord[]) : [];
  } catch {
    return [];
  }
}

export function loadAutomacoesData(): AutomacoesData {
  const root = careerOpsRoot();
  const portalsRaw = readSafe(path.join(root, "portals.yml"));
  let parsed: Record<string, any> = {};
  try {
    parsed = (yaml.load(portalsRaw) as Record<string, any>) || {};
  } catch {
    parsed = {};
  }

  const sources: PortalSource[] = Array.isArray(parsed.tracked_companies)
    ? parsed.tracked_companies.map((c: Record<string, any>) => ({
        name: String(c.name || ""),
        careersUrl: String(c.careers_url || ""),
        scanMethod: String(c.scan_method || "websearch"),
        scanQuery: String(c.scan_query || ""),
        enabled: c.enabled !== false,
        notes: String(c.notes || ""),
      }))
    : [];

  const searchQueries = Array.isArray(parsed.search_queries)
    ? parsed.search_queries.map((q: Record<string, any>) => ({
        name: String(q.name || ""),
        query: String(q.query || ""),
        enabled: q.enabled !== false,
      }))
    : [];

  const titleFilter = {
    positive: Array.isArray(parsed.title_filter?.positive) ? parsed.title_filter.positive.map(String) : [],
    negative: Array.isArray(parsed.title_filter?.negative) ? parsed.title_filter.negative.map(String) : [],
  };

  const locationFilter = {
    allow: Array.isArray(parsed.location_filter?.allow) ? parsed.location_filter.allow.map(String) : [],
  };

  const runs = readAutomationRuns();

  // Read scheduled jobs if present
  let scheduledJobsCount = 0;
  let nextScheduledRun: string | null = null;
  const scheduledRaw = readSafe(path.join(root, "data", "scheduled-jobs.json"));
  if (scheduledRaw) {
    try {
      const sched = JSON.parse(scheduledRaw) as { jobs?: Array<{ enabled?: boolean; nextRunAt?: string }> };
      const activeJobs = (sched.jobs || []).filter((j) => j.enabled !== false);
      scheduledJobsCount = activeJobs.length;
      const nextDates = activeJobs.map((j) => j.nextRunAt).filter(Boolean) as string[];
      nextDates.sort();
      nextScheduledRun = nextDates[0] || null;
    } catch {
      // ignore
    }
  }

  const healthRows = parseTsvRows(readSafe(path.join(root, "data", "portal-health.tsv")));
  const portalHealth = healthRows.slice(-10).map((r) => ({
    portal: r.portal || r.company || r.name || "—",
    status: r.status || "—",
    checkedAt: r.date || r.checked_at || "—",
  }));

  return {
    sources,
    searchQueries,
    titleFilter,
    locationFilter,
    runs,
    scheduledJobsCount,
    nextScheduledRun,
    portalHealth,
  };
}
