import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { atomicWrite } from "@/lib/core/safe-write";
import {
  interviewsStorePath,
  readInterviews,
  type InterviewEntry,
  type InterviewOutcome,
} from "@/lib/entrevistas/store";

export const runtime = "nodejs";

const VALID_TYPES = new Set(["triagem", "rh", "tecnica", "gestor", "painel", "proposta", "outro"]);
const VALID_OUTCOMES = new Set(["pendente", "aprovado", "reprovado", "remarcado", "cancelado"]);

export async function GET() {
  const items = readInterviews().sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const company = typeof body.company === "string" ? body.company.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const scheduledAt = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";
  const interviewType =
    typeof body.interviewType === "string" && VALID_TYPES.has(body.interviewType)
      ? (body.interviewType as InterviewEntry["interviewType"])
      : "rh";

  if (!company || !role || !scheduledAt) {
    return NextResponse.json(
      { error: "Empresa, cargo e data/horário são obrigatórios." },
      { status: 400 },
    );
  }

  const entry: InterviewEntry = {
    id: `int-${crypto.randomUUID().slice(0, 8)}`,
    company,
    role,
    interviewType,
    scheduledAt,
    recruiterName: typeof body.recruiterName === "string" ? body.recruiterName.trim() : "",
    meetingLink: typeof body.meetingLink === "string" ? body.meetingLink.trim() : "",
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    preparation: typeof body.preparation === "string" ? body.preparation.trim() : "",
    outcome: "pendente",
    feedback: "",
    createdAt: new Date().toISOString(),
  };

  const items = readInterviews();
  items.push(entry);
  atomicWrite(interviewsStorePath(), JSON.stringify(items, null, 2));

  return NextResponse.json({ ok: true, item: entry });
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
    return NextResponse.json({ error: "ID da entrevista é obrigatório." }, { status: 400 });
  }

  const items = readInterviews();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Entrevista não encontrada." }, { status: 404 });
  }

  const current = items[idx];
  const nextOutcome =
    typeof body.outcome === "string" && VALID_OUTCOMES.has(body.outcome)
      ? (body.outcome as InterviewOutcome)
      : current.outcome;

  const updated: InterviewEntry = {
    ...current,
    scheduledAt: typeof body.scheduledAt === "string" && body.scheduledAt ? body.scheduledAt : current.scheduledAt,
    recruiterName: typeof body.recruiterName === "string" ? body.recruiterName : current.recruiterName,
    meetingLink: typeof body.meetingLink === "string" ? body.meetingLink : current.meetingLink,
    notes: typeof body.notes === "string" ? body.notes : current.notes,
    preparation: typeof body.preparation === "string" ? body.preparation : current.preparation,
    outcome: nextOutcome,
    feedback: typeof body.feedback === "string" ? body.feedback : current.feedback,
  };

  items[idx] = updated;
  atomicWrite(interviewsStorePath(), JSON.stringify(items, null, 2));

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() || "";
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
  }
  const items = readInterviews().filter((i) => i.id !== id);
  atomicWrite(interviewsStorePath(), JSON.stringify(items, null, 2));
  return NextResponse.json({ ok: true });
}
