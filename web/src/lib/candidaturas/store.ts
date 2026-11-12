import fs from "node:fs";
import path from "node:path";
import { careerOpsRoot, readApplications } from "@/lib/career-ops";
import { parseTsvRows } from "@/lib/dashboard/analytics.mjs";
import { mapTrackerStatusToKanbanStage } from "./stages.mjs";

export type ApplicationHistoryItem = {
  fromStage: string | null;
  toStage: string;
  changedAt: string;
  note: string;
};

export type KanbanApplicationCard = {
  id: string;
  trackerNum: string | null;
  company: string;
  role: string;
  jobUrl: string;
  stage: string;
  appliedAt: string;
  confirmedApplied: boolean;
  resumeUsed: string;
  expectedSalary: string;
  recruiterContact: string;
  notes: string;
  nextAction: string;
  followUpDate: string;
  score: string;
  history: ApplicationHistoryItem[];
};

type StoredMetadata = Record<string, Partial<KanbanApplicationCard>>;

function readSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function kanbanStorePath(): string {
  return path.join(careerOpsRoot(), "data", "kanban-applications.json");
}

export function readKanbanStore(): StoredMetadata {
  const raw = readSafe(kanbanStorePath());
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as StoredMetadata) : {};
  } catch {
    return {};
  }
}

export function loadKanbanApplications(): KanbanApplicationCard[] {
  const root = careerOpsRoot();
  const applications = readApplications();
  const store = readKanbanStore();

  const pdfIndexRaw = readSafe(path.join(root, "data", "pdf-index.tsv"));
  const pdfRows = parseTsvRows(pdfIndexRaw);
  const pdfByNum = new Map<string, string>();
  for (const r of pdfRows) {
    const num = String(r.report_num || r.report || "").replace(/^0+/, "");
    if (num && r.pdf_path) pdfByNum.set(num, path.basename(r.pdf_path));
  }

  const cards: KanbanApplicationCard[] = [];
  const seenIds = new Set<string>();

  for (const app of applications) {
    const num = String(app.n);
    const id = `app-${num}`;
    seenIds.add(id);
    const saved = store[id] ?? {};
    const hasPdf = Boolean(app.pdf && app.pdf.includes("✅"));
    const defaultStage = mapTrackerStatusToKanbanStage(app.status, hasPdf);

    cards.push({
      id,
      trackerNum: num,
      company: saved.company || app.company || "—",
      role: saved.role || app.role || "—",
      jobUrl: saved.jobUrl || app.url || "",
      stage: saved.stage || defaultStage,
      appliedAt: saved.appliedAt || (defaultStage === "candidatura_enviada" ? app.date || "" : ""),
      confirmedApplied: Boolean(saved.confirmedApplied || defaultStage === "candidatura_enviada"),
      resumeUsed: saved.resumeUsed || pdfByNum.get(num) || (hasPdf ? "PDF personalizado gerado" : "Ainda não gerado"),
      expectedSalary: saved.expectedSalary || "R$ 2.500/mês",
      recruiterContact: saved.recruiterContact || "",
      notes: saved.notes !== undefined ? saved.notes : app.notes || "",
      nextAction: saved.nextAction || (hasPdf ? "Revisar currículo e enviar candidatura" : "Avaliar envio ou adaptar currículo"),
      followUpDate: saved.followUpDate || "",
      score: app.score || "—",
      history: Array.isArray(saved.history)
        ? saved.history
        : [
            {
              fromStage: null,
              toStage: defaultStage,
              changedAt: app.date || new Date().toISOString().slice(0, 10),
              note: "Importado do tracker oficial (applications.md)",
            },
          ],
    });
  }

  // Include custom cards created directly on the Kanban that are not in applications.md
  for (const [id, saved] of Object.entries(store)) {
    if (seenIds.has(id) || !saved.company || !saved.role) continue;
    cards.push({
      id,
      trackerNum: null,
      company: saved.company,
      role: saved.role,
      jobUrl: saved.jobUrl || "",
      stage: saved.stage || "vaga_identificada",
      appliedAt: saved.appliedAt || "",
      confirmedApplied: Boolean(saved.confirmedApplied),
      resumeUsed: saved.resumeUsed || "",
      expectedSalary: saved.expectedSalary || "",
      recruiterContact: saved.recruiterContact || "",
      notes: saved.notes || "",
      nextAction: saved.nextAction || "",
      followUpDate: saved.followUpDate || "",
      score: saved.score || "—",
      history: Array.isArray(saved.history) ? saved.history : [],
    });
  }

  return cards;
}
