import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { careerOpsRoot } from "@/lib/career-ops";
import { loadVagaById } from "@/lib/vagas/loader";
import { evaluateCompatibility } from "@/lib/compatibility/engine.mjs";

export const runtime = "nodejs";

function readSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const vaga = loadVagaById(id);
  if (!vaga) {
    return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  }

  let customDescription = "";
  try {
    const body = (await req.json()) as { description?: unknown };
    if (typeof body.description === "string") {
      customDescription = body.description.trim();
    }
  } catch {
    // body optional
  }

  const root = careerOpsRoot();
  const cvText = readSafe(path.join(root, "cv.md"));
  const profileText = readSafe(path.join(root, "modes", "_profile.md"));

  if (!cvText) {
    return NextResponse.json(
      { error: "Arquivo cv.md não encontrado para realizar a avaliação." },
      { status: 400 },
    );
  }

  const analysis = evaluateCompatibility({
    title: vaga.role,
    company: vaga.company,
    location: vaga.location,
    description: customDescription || vaga.description || vaga.notes,
    cvText,
    profileText,
  });

  return NextResponse.json({ ok: true, analysis });
}
