import crypto from "node:crypto";
import fs from "node:fs";
import { NextResponse } from "next/server";
import { rootScript } from "@/lib/career-ops";
import { runSetStatus } from "@/lib/core-cli";
import { atomicWrite } from "@/lib/core/safe-write";
import {
  mapKanbanStageToTrackerStatus,
  validateStageTransition,
} from "@/lib/candidaturas/stages.mjs";
import {
  kanbanStorePath,
  loadKanbanApplications,
  readKanbanStore,
} from "@/lib/candidaturas/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const company = typeof body.company === "string" ? body.company.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  if (!company || !role) {
    return NextResponse.json({ error: "Empresa e cargo são obrigatórios." }, { status: 400 });
  }

  const requestedStage = typeof body.stage === "string" ? body.stage : "vaga_identificada";
  const confirmApplied = body.confirmApplied === true;
  const check = validateStageTransition({
    fromStage: null,
    toStage: requestedStage,
    confirmApplied,
  });
  if (!check.ok) {
    return NextResponse.json(
      { error: check.error, requiresConfirmation: Boolean(check.requiresConfirmation) },
      { status: 400 },
    );
  }

  const id = `custom-${crypto.randomUUID().slice(0, 8)}`;
  const store = readKanbanStore();
  const nowIso = new Date().toISOString();

  store[id] = {
    id,
    trackerNum: null,
    company,
    role,
    jobUrl: typeof body.jobUrl === "string" ? body.jobUrl.trim() : "",
    stage: requestedStage,
    appliedAt: requestedStage === "candidatura_enviada" ? nowIso.slice(0, 10) : "",
    confirmedApplied: requestedStage === "candidatura_enviada",
    resumeUsed: typeof body.resumeUsed === "string" ? body.resumeUsed.trim() : "",
    expectedSalary: typeof body.expectedSalary === "string" ? body.expectedSalary.trim() : "R$ 2.500/mês",
    recruiterContact: typeof body.recruiterContact === "string" ? body.recruiterContact.trim() : "",
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    nextAction: typeof body.nextAction === "string" ? body.nextAction.trim() : "",
    followUpDate: typeof body.followUpDate === "string" ? body.followUpDate.trim() : "",
    history: [
      {
        fromStage: null,
        toStage: requestedStage,
        changedAt: nowIso,
        note: "Criado no Kanban",
      },
    ],
  };

  atomicWrite(kanbanStorePath(), JSON.stringify(store, null, 2));
  return NextResponse.json({ ok: true, id, card: store[id] });
}

export async function PATCH(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "ID da candidatura é obrigatório." }, { status: 400 });
  }

  const cards = loadKanbanApplications();
  const current = cards.find((c) => c.id === id);
  if (!current) {
    return NextResponse.json({ error: "Candidatura não encontrada." }, { status: 404 });
  }

  const nextStage = typeof body.stage === "string" ? body.stage : current.stage;
  const confirmApplied = body.confirmApplied === true;

  if (nextStage !== current.stage) {
    const check = validateStageTransition({
      fromStage: current.stage,
      toStage: nextStage,
      confirmApplied,
    });
    if (!check.ok) {
      return NextResponse.json(
        { error: check.error, requiresConfirmation: Boolean(check.requiresConfirmation) },
        { status: 400 },
      );
    }
  }

  const store = readKanbanStore();
  const nowIso = new Date().toISOString();
  const nextHistory = [...current.history];

  if (nextStage !== current.stage) {
    nextHistory.unshift({
      fromStage: current.stage,
      toStage: nextStage,
      changedAt: nowIso,
      note:
        typeof body.changeNote === "string" && body.changeNote.trim()
          ? body.changeNote.trim()
          : nextStage === "candidatura_enviada"
            ? "Envio confirmado manualmente pelo usuário"
            : "Movido no Kanban",
    });
  }

  const confirmedApplied =
    current.confirmedApplied || (nextStage === "candidatura_enviada" && confirmApplied);
  const appliedAt =
    typeof body.appliedAt === "string"
      ? body.appliedAt
      : nextStage === "candidatura_enviada" && !current.appliedAt
        ? nowIso.slice(0, 10)
        : current.appliedAt;

  store[id] = {
    ...current,
    stage: nextStage,
    confirmedApplied,
    appliedAt,
    resumeUsed: typeof body.resumeUsed === "string" ? body.resumeUsed : current.resumeUsed,
    expectedSalary: typeof body.expectedSalary === "string" ? body.expectedSalary : current.expectedSalary,
    recruiterContact: typeof body.recruiterContact === "string" ? body.recruiterContact : current.recruiterContact,
    notes: typeof body.notes === "string" ? body.notes : current.notes,
    nextAction: typeof body.nextAction === "string" ? body.nextAction : current.nextAction,
    followUpDate: typeof body.followUpDate === "string" ? body.followUpDate : current.followUpDate,
    history: nextHistory,
  };

  atomicWrite(kanbanStorePath(), JSON.stringify(store, null, 2));

  // Sync canonical tracker status via set-status.mjs when linked to applications.md
  if (current.trackerNum && nextStage !== current.stage) {
    const nextTrackerStatus = mapKanbanStageToTrackerStatus(nextStage);
    const script = rootScript("set-status");
    if (fs.existsSync(script)) {
      try {
        await runSetStatus([
          "--row",
          current.trackerNum,
          "--status",
          nextTrackerStatus,
          "--source",
          "web",
          "--json",
        ]);
      } catch {
        // Keep kanban state saved even if CLI lock was busy
      }
    }
  }

  return NextResponse.json({ ok: true, card: store[id] });
}
