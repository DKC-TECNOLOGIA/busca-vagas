import fs from "node:fs";
import path from "node:path";
import { careerOpsRoot, readApplications, requestReportReader } from "@/lib/career-ops";

export type InterviewOutcome = "pendente" | "aprovado" | "reprovado" | "remarcado" | "cancelado";

export type InterviewEntry = {
  id: string;
  company: string;
  role: string;
  interviewType: "triagem" | "rh" | "tecnica" | "gestor" | "painel" | "proposta" | "outro";
  scheduledAt: string; // ISO datetime-local (YYYY-MM-DDTHH:mm)
  recruiterName: string;
  meetingLink: string;
  notes: string;
  preparation: string;
  outcome: InterviewOutcome;
  feedback: string;
  createdAt: string;
};

export type PrepSuggestion = {
  n: string;
  company: string;
  role: string;
  prepText: string;
};

export function interviewsStorePath(): string {
  return path.join(careerOpsRoot(), "data", "interviews.json");
}

export function readInterviews(): InterviewEntry[] {
  const filePath = interviewsStorePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InterviewEntry[]) : [];
  } catch {
    return [];
  }
}

export function loadInterviewSuggestions(): PrepSuggestion[] {
  const applications = readApplications();
  const readReport = requestReportReader();
  const list: PrepSuggestion[] = [];

  for (const app of applications) {
    const report = readReport(app);
    let prepText = "";
    if (report?.content) {
      const match = report.content.match(/##\s*F\)\s*Prepara[cç][aã]o[^\n]*\n([\s\S]*?)(?:\n##\s+|$)/i);
      if (match) prepText = match[1].trim();
    }
    list.push({
      n: String(app.n),
      company: app.company,
      role: app.role,
      prepText,
    });
  }
  return list;
}
