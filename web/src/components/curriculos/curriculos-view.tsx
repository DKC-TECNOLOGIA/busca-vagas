"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Save,
  Download,
  Eye,
  Sparkles,
  User,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { CurriculosData } from "@/lib/curriculos/loader";

type Tab = "perfil" | "gerador" | "historico";

export function CurriculosView({ initialData }: { initialData: CurriculosData }) {
  const [tab, setTab] = useState<Tab>("perfil");
  const [cvMarkdown, setCvMarkdown] = useState(initialData.cvMarkdown);
  const [savedSnapshot, setSavedSnapshot] = useState(initialData.cvMarkdown);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const firstWithPdf = initialData.evaluatedJobs.find((j) => j.hasPdf)?.n || initialData.evaluatedJobs[0]?.n || "";
  const [selectedJobNum, setSelectedJobNum] = useState(firstWithPdf);
  const [format, setFormat] = useState<"a4" | "letter">("a4");
  const [previewKey, setPreviewKey] = useState(0);
  const [generating, setGenerating] = useState(false);

  const saveCv = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: cvMarkdown,
          backup: true,
          expected: { content: savedSnapshot, exists: true },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; backedUp?: boolean };
      if (!res.ok) {
        setStatusMsg({ type: "err", text: data.error || "Não foi possível salvar cv.md." });
        return;
      }
      setSavedSnapshot(cvMarkdown);
      setStatusMsg({
        type: "ok",
        text: data.backedUp
          ? "Currículo base (cv.md) salvo com backup automático criado."
          : "Currículo base (cv.md) salvo com sucesso.",
      });
    } catch {
      setStatusMsg({ type: "err", text: "Erro de rede ao salvar cv.md." });
    } finally {
      setSaving(false);
    }
  };

  const regeneratePdf = async () => {
    if (!selectedJobNum) return;
    setGenerating(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/curriculos/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportNum: selectedJobNum, format }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setStatusMsg({ type: "err", text: data.error || "Erro ao gerar PDF." });
        return;
      }
      setPreviewKey((k) => k + 1);
      setStatusMsg({ type: "ok", text: `PDF da vaga #${selectedJobNum} atualizado via generate-pdf.mjs.` });
    } catch {
      setStatusMsg({ type: "err", text: "Erro de rede ao gerar PDF." });
    } finally {
      setGenerating(false);
    }
  };

  const selectedJob = initialData.evaluatedJobs.find((j) => j.n === selectedJobNum);
  const cleanNum = selectedJobNum.replace(/^0+/, "");
  const pdfPreviewUrl = cleanNum ? `/api/cv-pdf?n=${encodeURIComponent(cleanNum)}&v=${previewKey}` : "";
  const pdfDownloadUrl = cleanNum ? `/api/cv-pdf?n=${encodeURIComponent(cleanNum)}&download=1` : "";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Central de Currículos
          </h1>
          <p className="mt-1 text-sm text-muted">
            Gestão do currículo base (<span className="font-mono">cv.md</span>), personalização por vaga, preview
            antes de exportar e histórico de PDFs ATS-safe.
          </p>
        </div>
        <Link
          href="/cv"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground hover:bg-surface-hover"
        >
          <Sparkles className="size-3.5 text-[#F59E0B]" />
          Importar PDF / TeX (Core)
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("perfil")}
          className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
            tab === "perfil"
              ? "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]"
              : "border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          <User className="size-3.5" />
          Perfil & Currículo Base
        </button>
        <button
          type="button"
          onClick={() => setTab("gerador")}
          className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
            tab === "gerador"
              ? "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]"
              : "border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          <Eye className="size-3.5" />
          Preview & Exportação PDF
        </button>
        <button
          type="button"
          onClick={() => setTab("historico")}
          className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
            tab === "historico"
              ? "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]"
              : "border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          <History className="size-3.5" />
          Histórico de Versões ({initialData.versions.length})
        </button>
      </div>

      {statusMsg && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs ${
            statusMsg.type === "ok"
              ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {statusMsg.type === "ok" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* TAB 1: Perfil & cv.md */}
      {tab === "perfil" && (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-foreground">Dados do Perfil (profile.yml)</h2>
              <dl className="mt-4 space-y-3 text-xs">
                <div>
                  <dt className="text-faint">Candidato</dt>
                  <dd className="mt-0.5 font-medium text-foreground">{initialData.profile.fullName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-faint">Título Atual</dt>
                  <dd className="mt-0.5 text-foreground">{initialData.profile.title || "—"}</dd>
                </div>
                <div>
                  <dt className="text-faint">Localização</dt>
                  <dd className="mt-0.5 text-muted">{initialData.profile.location || "—"}</dd>
                </div>
                <div>
                  <dt className="text-faint">Contato</dt>
                  <dd className="mt-0.5 text-muted">
                    {initialData.profile.email} · {initialData.profile.phone}
                  </dd>
                </div>
                <div>
                  <dt className="text-faint">Cargos-alvo</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {initialData.profile.targetRoles.map((r) => (
                      <span
                        key={r}
                        className="rounded border border-border bg-surface-hover px-2 py-0.5 text-[11px] text-foreground"
                      >
                        {r}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>

          <section className="flex flex-col rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Currículo Canônico (Resumo, Experiências, Formação, Competências, Cursos)
                </h2>
                <p className="text-xs text-muted">
                  Editando diretamente <span className="font-mono">cv.md</span> (com backup automático ao salvar).
                </p>
              </div>
              <button
                type="button"
                disabled={saving || cvMarkdown === savedSnapshot}
                onClick={saveCv}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#101318] transition-colors hover:bg-[#FBBF24] disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
            <textarea
              value={cvMarkdown}
              onChange={(e) => setCvMarkdown(e.target.value)}
              rows={24}
              className="w-full flex-1 rounded-lg border border-border bg-[#101318] p-4 font-mono text-xs leading-relaxed text-foreground focus:border-[#F59E0B] focus:outline-none"
            />
          </section>
        </div>
      )}

      {/* TAB 2: Gerador & Preview */}
      {tab === "gerador" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="min-w-[260px] flex-1">
              <label htmlFor="jobSelect" className="mb-1.5 block text-xs font-medium text-muted">
                Selecione a vaga avaliada
              </label>
              <select
                id="jobSelect"
                value={selectedJobNum}
                onChange={(e) => setSelectedJobNum(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs text-foreground focus:border-[#F59E0B] focus:outline-none"
              >
                {initialData.evaluatedJobs.map((j) => (
                  <option key={j.n} value={j.n}>
                    #{j.n} — {j.company} | {j.role} ({j.score}) {j.hasPdf ? "✅ PDF" : "❌ Sem PDF"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="formatSelect" className="mb-1.5 block text-xs font-medium text-muted">
                Formato
              </label>
              <select
                id="formatSelect"
                value={format}
                onChange={(e) => setFormat(e.target.value === "letter" ? "letter" : "a4")}
                className="rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs text-foreground focus:border-[#F59E0B] focus:outline-none"
              >
                <option value="a4">A4 (Brasil)</option>
                <option value="letter">Letter (EUA)</option>
              </select>
            </div>

            <button
              type="button"
              disabled={generating || !selectedJobNum}
              onClick={regeneratePdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#101318] hover:bg-[#FBBF24] disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Gerando PDF..." : "Gerar / Atualizar PDF"}
            </button>

            {cleanNum && (
              <Link
                href={`/pipeline/${cleanNum}/cv-studio`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs font-medium text-foreground hover:border-[#F59E0B]/40"
              >
                <FileText className="size-3.5 text-[#F59E0B]" />
                Abrir CV Studio
              </Link>
            )}

            {selectedJob?.hasPdf && pdfDownloadUrl && (
              <a
                href={pdfDownloadUrl}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-2 text-xs font-medium text-[#22C55E] hover:bg-[#22C55E]/20"
              >
                <Download className="size-3.5" />
                Baixar PDF
              </a>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            {selectedJob?.hasPdf && pdfPreviewUrl ? (
              <iframe
                key={pdfPreviewUrl}
                src={pdfPreviewUrl}
                title={`Preview PDF #${selectedJobNum}`}
                className="h-[720px] w-full rounded-lg border border-border bg-white"
              />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                <FileText className="mb-2 size-6 text-muted" />
                <p className="text-sm font-medium text-foreground">
                  Esta vaga ainda não possui PDF personalizado gerado.
                </p>
                <p className="mt-1 text-xs text-muted">
                  Abra o CV Studio para adaptar o currículo a esta vaga ou selecione uma das vagas com ✅ PDF.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Histórico de Versões */}
      {tab === "historico" && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-hover/60 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Relatório</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Vaga</th>
                  <th className="px-4 py-3 font-medium">Arquivo</th>
                  <th className="px-4 py-3 font-medium">Tamanho</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialData.versions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      Nenhuma versão de currículo gerada ainda.
                    </td>
                  </tr>
                ) : (
                  initialData.versions.map((v) => {
                    const numClean = v.reportNum.replace(/^0+/, "");
                    return (
                      <tr key={v.pdfFileName} className="hover:bg-surface-hover/40">
                        <td className="px-4 py-3 font-mono text-[#F59E0B]">#{v.reportNum}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{v.company}</td>
                        <td className="px-4 py-3 text-muted">{v.role}</td>
                        <td className="px-4 py-3 font-mono text-muted">{v.pdfFileName}</td>
                        <td className="px-4 py-3 font-mono text-muted">{v.sizeKb} KB</td>
                        <td className="px-4 py-3 font-mono text-muted">{v.generatedAt}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            {numClean && numClean !== "—" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedJobNum(v.reportNum);
                                    setTab("gerador");
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-border bg-surface-hover px-2.5 py-1 text-xs text-foreground hover:border-[#F59E0B]/40"
                                >
                                  <Eye className="size-3" />
                                  Visualizar
                                </button>
                                <a
                                  href={`/api/cv-pdf?n=${encodeURIComponent(numClean)}&download=1`}
                                  className="inline-flex items-center gap-1 rounded border border-[#22C55E]/40 bg-[#22C55E]/10 px-2.5 py-1 text-xs text-[#22C55E]"
                                >
                                  <Download className="size-3" />
                                  PDF
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
