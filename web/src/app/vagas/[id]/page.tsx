import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { careerOpsRoot } from "@/lib/career-ops";
import { loadVagaById } from "@/lib/vagas/loader";
import { evaluateCompatibility } from "@/lib/compatibility/engine.mjs";
import { VagaDetailView } from "@/components/vagas/vaga-detail-view";

export const dynamic = "force-dynamic";

function readSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export default async function VagaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = loadVagaById(id);
  if (!job) notFound();

  const root = careerOpsRoot();
  const cvText = readSafe(path.join(root, "cv.md"));
  const profileText = readSafe(path.join(root, "modes", "_profile.md"));
  const initialCompatibility = cvText
    ? evaluateCompatibility({
        title: job.role,
        company: job.company,
        location: job.location,
        description: job.description || job.notes,
        cvText,
        profileText,
      })
    : null;

  return <VagaDetailView initialJob={job} initialCompatibility={initialCompatibility} />;
}
