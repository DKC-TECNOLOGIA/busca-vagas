import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { careerOpsRoot } from "@/lib/career-ops";
import { atomicWrite } from "@/lib/core/safe-write";

export const runtime = "nodejs";

export type UserPreferencesData = {
  telegramEnabled: boolean;
  notifyNewJob: boolean;
  notifyHighMatch: boolean;
  minMatchScoreNotify: number;
  notifyPriorityOpportunity: boolean;
  notifyPendingApplication: boolean;
  notifyUpcomingInterview: boolean;
  notifyStatusChange: boolean;
  notifyAutomationError: boolean;
  autoScanIntervalMinutes: number;
  defaultCvFormat: "a4" | "letter";
};

export const DEFAULT_PREFERENCES: UserPreferencesData = {
  telegramEnabled: true,
  notifyNewJob: true,
  notifyHighMatch: true,
  minMatchScoreNotify: 3.5,
  notifyPriorityOpportunity: true,
  notifyPendingApplication: true,
  notifyUpcomingInterview: true,
  notifyStatusChange: true,
  notifyAutomationError: true,
  autoScanIntervalMinutes: 360,
  defaultCvFormat: "a4",
};

function prefsPath(): string {
  return path.join(careerOpsRoot(), "data", "user-preferences.json");
}

export function readUserPreferences(): UserPreferencesData {
  const file = prefsPath();
  if (!fs.existsSync(file)) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<UserPreferencesData>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, preferences: readUserPreferences() });
}

export async function POST(req: Request) {
  let body: Partial<UserPreferencesData>;
  try {
    body = (await req.json()) as Partial<UserPreferencesData>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const current = readUserPreferences();
  const next: UserPreferencesData = {
    telegramEnabled: typeof body.telegramEnabled === "boolean" ? body.telegramEnabled : current.telegramEnabled,
    notifyNewJob: typeof body.notifyNewJob === "boolean" ? body.notifyNewJob : current.notifyNewJob,
    notifyHighMatch: typeof body.notifyHighMatch === "boolean" ? body.notifyHighMatch : current.notifyHighMatch,
    minMatchScoreNotify:
      typeof body.minMatchScoreNotify === "number" && body.minMatchScoreNotify >= 0 && body.minMatchScoreNotify <= 5
        ? body.minMatchScoreNotify
        : current.minMatchScoreNotify,
    notifyPriorityOpportunity:
      typeof body.notifyPriorityOpportunity === "boolean"
        ? body.notifyPriorityOpportunity
        : current.notifyPriorityOpportunity,
    notifyPendingApplication:
      typeof body.notifyPendingApplication === "boolean"
        ? body.notifyPendingApplication
        : current.notifyPendingApplication,
    notifyUpcomingInterview:
      typeof body.notifyUpcomingInterview === "boolean"
        ? body.notifyUpcomingInterview
        : current.notifyUpcomingInterview,
    notifyStatusChange:
      typeof body.notifyStatusChange === "boolean" ? body.notifyStatusChange : current.notifyStatusChange,
    notifyAutomationError:
      typeof body.notifyAutomationError === "boolean" ? body.notifyAutomationError : current.notifyAutomationError,
    autoScanIntervalMinutes:
      typeof body.autoScanIntervalMinutes === "number" && body.autoScanIntervalMinutes >= 15
        ? body.autoScanIntervalMinutes
        : current.autoScanIntervalMinutes,
    defaultCvFormat: body.defaultCvFormat === "letter" ? "letter" : "a4",
  };

  atomicWrite(prefsPath(), JSON.stringify(next, null, 2));
  return NextResponse.json({ ok: true, preferences: next });
}
