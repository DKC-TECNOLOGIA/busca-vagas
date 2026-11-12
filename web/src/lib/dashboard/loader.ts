import fs from "node:fs";
import path from "node:path";
import {
  careerOpsRoot,
  readApplications,
  readInbox,
  requestReportReader,
} from "@/lib/career-ops";
import { computeDashboardMetrics, parseTsvRows } from "./analytics.mjs";

export type DashboardData = ReturnType<typeof computeDashboardMetrics> & {
  totalEvaluated: number;
  lastUpdated: string;
};

function readSafeFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function loadDashboardData(): DashboardData {
  const root = careerOpsRoot();
  const scanHistoryRaw = readSafeFile(path.join(root, "data", "scan-history.tsv"));
  const scanHistoryRows = parseTsvRows(scanHistoryRaw);

  const inbox = readInbox();
  const pendingCount = inbox.filter((item) => !item.done).length;

  const applications = readApplications();
  const readReport = requestReportReader();
  const reportsByNum: Record<string, string> = {};

  for (const app of applications) {
    const report = readReport(app);
    if (report?.content) {
      reportsByNum[String(app.n)] = report.content;
    }
  }

  const activeInterviewsRaw = readSafeFile(path.join(root, "data", "active-interviews.md"));
  const interviewLines = activeInterviewsRaw
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\S/.test(line) || /^\|\s*\d+\s*\|/.test(line));

  const metrics = computeDashboardMetrics({
    scanHistoryRows,
    pendingCount,
    applications,
    reportsByNum,
    activeInterviewsCount: interviewLines.length,
    interviewTimeline: [],
  });

  return {
    ...metrics,
    totalEvaluated: applications.length,
    lastUpdated: new Date().toISOString(),
  };
}
