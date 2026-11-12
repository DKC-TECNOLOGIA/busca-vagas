import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { careerOpsRoot, readApplications, rootScript } from "@/lib/career-ops";
import { parseTsvRows } from "@/lib/dashboard/analytics.mjs";

export const runtime = "nodejs";
const execFileAsync = promisify(execFile);

export async function POST(req: Request) {
  let body: { reportNum?: unknown; format?: unknown };
  try {
    body = (await req.json()) as { reportNum?: unknown; format?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const reportNumRaw = typeof body.reportNum === "string" ? body.reportNum.trim() : "";
  const reportNum = reportNumRaw.replace(/^0+/, "");
  const padded = reportNumRaw.padStart(3, "0");
  const format = body.format === "letter" ? "letter" : "a4";

  if (!/^\d+$/.test(reportNum)) {
    return NextResponse.json({ error: "Informe um número de relatório válido." }, { status: 400 });
  }

  const root = careerOpsRoot();
  const script = rootScript("generate-pdf");
  if (!fs.existsSync(script)) {
    return NextResponse.json({ error: "Script generate-pdf.mjs não encontrado." }, { status: 500 });
  }

  const applications = readApplications();
  const app = applications.find((a) => String(a.n) === reportNum);
  if (!app) {
    return NextResponse.json({ error: `Vaga #${padded} não encontrada no tracker.` }, { status: 404 });
  }

  // Locate existing HTML twin in output/pdf via pdf-index.tsv or slug match
  const pdfIndexPath = path.join(root, "data", "pdf-index.tsv");
  const rows = fs.existsSync(pdfIndexPath) ? parseTsvRows(fs.readFileSync(pdfIndexPath, "utf8")) : [];
  const row = rows.find((r) => String(r.report_num || r.report || "").replace(/^0+/, "") === reportNum);

  let htmlPath = "";
  let pdfPath = "";

  if (row?.pdf_path) {
    const absPdf = path.isAbsolute(row.pdf_path) ? row.pdf_path : path.join(root, row.pdf_path);
    const candidateHtml = absPdf.replace(/\.pdf$/i, ".html");
    if (fs.existsSync(candidateHtml)) {
      htmlPath = candidateHtml;
      pdfPath = absPdf;
    }
  }

  if (!htmlPath) {
    return NextResponse.json(
      {
        error: `Esta vaga (#${padded}) ainda não possui o rascunho HTML personalizado. Use o CV Studio em /pipeline/${reportNum}/cv-studio para gerar o HTML base primeiro.`,
      },
      { status: 400 },
    );
  }

  try {
    await execFileAsync(
      process.execPath,
      [script, htmlPath, pdfPath, `--format=${format}`, `--report=${padded}`, "--max-pages=1"],
      { cwd: root, timeout: 60_000 },
    );
    return NextResponse.json({
      ok: true,
      reportNum: padded,
      pdfUrl: `/api/cv-pdf?n=${encodeURIComponent(reportNum)}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar PDF.";
    return NextResponse.json({ error: `Falha na geração do PDF: ${message}` }, { status: 500 });
  }
}
