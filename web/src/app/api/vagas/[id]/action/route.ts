import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { careerOpsRoot } from "@/lib/career-ops";
import { atomicWrite } from "@/lib/core/safe-write";
import { loadVagaById, readVagasUserState } from "@/lib/vagas/loader";

export const runtime = "nodejs";

type ActionPayload = {
  action?: "favorite" | "save" | "discard" | "restore" | "queue_evaluate";
  reason?: string;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const vaga = loadVagaById(id);
  if (!vaga) {
    return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  }

  let body: ActionPayload;
  try {
    body = (await req.json()) as ActionPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const action = body.action;
  if (!action || !["favorite", "save", "discard", "restore", "queue_evaluate"].includes(action)) {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const root = careerOpsRoot();
  const statePath = path.join(root, "data", "vagas-state.json");
  const state = readVagasUserState();
  const current = state[id] ?? {};

  if (action === "favorite") {
    state[id] = { ...current, isFavorite: !current.isFavorite };
  } else if (action === "save") {
    state[id] = { ...current, isSaved: !current.isSaved };
  } else if (action === "discard") {
    const reason = (body.reason || "Descartada pelo usuário na interface web").trim();
    state[id] = { ...current, isDiscarded: true, discardReason: reason };
    if (vaga.url) {
      const discardLogPath = path.join(root, "data", "discard.log");
      const line = `${new Date().toISOString()}\t${vaga.url}\t${reason}\n`;
      fs.appendFileSync(discardLogPath, line, "utf8");
    }
  } else if (action === "restore") {
    state[id] = { ...current, isDiscarded: false, discardReason: "" };
  } else if (action === "queue_evaluate") {
    if (!vaga.url) {
      return NextResponse.json({ error: "Esta vaga não possui URL original para avaliação." }, { status: 400 });
    }
    const pipelinePath = path.join(root, "data", "pipeline.md");
    const existingPipeline = fs.existsSync(pipelinePath) ? fs.readFileSync(pipelinePath, "utf8") : "# Pipeline — Pending URLs\n\n## Pending\n\n## Processed\n";
    if (!existingPipeline.includes(vaga.url)) {
      const entryLine = `- [ ] ${vaga.url} | ${vaga.company} | ${vaga.role} | ${vaga.location} | posted: ${vaga.postedAt || "unknown"}\n`;
      const updated = existingPipeline.includes("## Pending")
        ? existingPipeline.replace("## Pending\n", `## Pending\n\n${entryLine}`)
        : `${existingPipeline}\n${entryLine}`;
      atomicWrite(pipelinePath, updated);
    }
  }

  atomicWrite(statePath, JSON.stringify(state, null, 2));

  return NextResponse.json({
    ok: true,
    id,
    state: state[id] ?? current,
  });
}
