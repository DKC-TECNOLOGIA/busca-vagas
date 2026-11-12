"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Send,
  Star,
  Bookmark,
  Trash2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
} from "lucide-react";
import type { JobListingItem } from "@/lib/vagas/loader";

export type CompatibilityAnalysis = {
  score: number;
  whyMatches: string;
  metRequirements: string[];
  missingRequirements: string[];
  risks: string[];
  improvementTips: string[];
  dimensions: Array<{
    key: string;
    label: string;
    weight: number;
    score: number;
    status: string;
    evidence: string;
  }>;
};

export function VagaDetailView({
  initialJob,
  initialCompatibility,
}: {
  initialJob: JobListingItem;
  initialCompatibility: CompatibilityAnalysis | null;
}) {
  const router = useRouter();
  const [job, setJob] = useState<JobListingItem>(initialJob);
  const [compatibility, setCompatibility] = useState<CompatibilityAnalysis | null>(initialCompatibility);
  const [customJd, setCustomJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const runAction = async (action: "favorite" | "save" | "discard" | "restore" | "queue_evaluate") => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/vagas/${encodeURIComponent(job.id)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        error?: string;
        state?: { isFavorite?: boolean; isSaved?: boolean; isDiscarded?: boolean; discardReason?: string };
      };
      if (!res.ok) {
        setFeedback(data.error || "Falha ao executar ação.");
        return;
      }
      setJob((prev) => ({
        ...prev,
        isFavorite: data.state?.isFavorite ?? prev.isFavorite,
        isSaved: data.state?.isSaved ?? prev.isSaved,
        isDiscarded: data.state?.isDiscarded ?? prev.isDiscarded,
        discardReason: data.state?.discardReason ?? prev.discardReason,
      }));
      if (action === "queue_evaluate") {
        setFeedback("Vaga enviada para a fila de avaliação do pipeline.");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const recalculateCompatibility = async () => {
    setAnalyzing(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/vagas/${encodeURIComponent(job.id)}/compatibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: customJd }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; analysis?: CompatibilityAnalysis };
      if (!res.ok || !data.analysis) {
        setFeedback(data.error || "Não foi possível recalcular a compatibilidade.");
        return;
      }
      setCompatibility(data.analysis);
      setFeedback("Análise de compatibilidade atualizada com base no seu currículo real.");
    } finally {
      setAnalyzing(false);
    }
  };

  const displayScore = job.score ?? compatibility?.score ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/vagas"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para Busca de Vagas
        </Link>
        {job.trackerNum && (
          <Link
            href={`/pipeline/${job.trackerNum}`}
            className="text-xs font-medium text-[#F59E0B] hover:underline"
          >
            Abrir Relatório Completo #{job.trackerNum} →
          </Link>
        )}
      </div>

      {/* Header Card */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
              {job.company}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{job.role}</h1>
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-md border border-border bg-surface-hover px-2.5 py-1">
                {job.location} · {job.modality}
              </span>
              <span className="rounded-md border border-border bg-surface-hover px-2.5 py-1">
                Senioridade: {job.seniority}
              </span>
              <span className="rounded-md border border-border bg-surface-hover px-2.5 py-1">
                Salário: {job.salaryText}
              </span>
              <span className="rounded-md border border-border bg-surface-hover px-2.5 py-1">
                Status: {job.status}
              </span>
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-muted">Compatibilidade</div>
            <div className="mt-0.5 font-mono text-2xl font-bold text-[#F59E0B]">
              {displayScore !== null ? `${displayScore.toFixed(1)} / 5` : "Pendente"}
            </div>
            {job.score !== null && compatibility && (
              <div className="mt-0.5 text-[10px] text-muted">
                Motor técnico: {compatibility.score.toFixed(1)}/5
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction("favorite")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              job.isFavorite
                ? "border-[#F59E0B]/50 bg-[#F59E0B]/15 text-[#F59E0B]"
                : "border-border bg-surface-hover text-foreground"
            }`}
          >
            <Star className="size-3.5" />
            {job.isFavorite ? "Favoritada" : "Favoritar"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => runAction("save")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              job.isSaved
                ? "border-[#22C55E]/50 bg-[#22C55E]/15 text-[#22C55E]"
                : "border-border bg-surface-hover text-foreground"
            }`}
          >
            <Bookmark className="size-3.5" />
            {job.isSaved ? "Salva" : "Salvar"}
          </button>

          {!job.isDiscarded ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction("discard")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs font-medium text-muted hover:text-red-300"
            >
              <Trash2 className="size-3.5" />
              Descartar
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction("restore")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-2 text-xs font-medium text-[#22C55E]"
            >
              <RotateCcw className="size-3.5" />
              Restaurar
            </button>
          )}

          {job.trackerNum ? (
            <>
              <Link
                href={`/pipeline/${job.trackerNum}/cv-studio`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs font-medium text-foreground hover:border-[#22C55E]/40"
              >
                <FileText className="size-3.5 text-[#22C55E]" />
                Gerar / Editar Currículo
              </Link>
              <Link
                href={`/pipeline/${job.trackerNum}/apply`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#101318] hover:bg-[#FBBF24]"
              >
                <Send className="size-3.5" />
                Abrir Candidatura
              </Link>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction("queue_evaluate")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#101318] hover:bg-[#FBBF24]"
            >
              <Sparkles className="size-3.5" />
              Enviar para Avaliação
            </button>
          )}

          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs font-medium text-foreground hover:border-[#F59E0B]/40"
            >
              <span>Link original</span>
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        {feedback && (
          <div className="mt-3 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-2 text-xs text-[#22C55E]">
            {feedback}
          </div>
        )}
      </section>

      {/* Inteligência de Compatibilidade (10 dimensões) */}
      {compatibility && (
        <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Inteligência de Compatibilidade (10 Dimensões)
              </h2>
              <p className="mt-0.5 text-xs text-muted">{compatibility.whyMatches}</p>
            </div>
            <button
              type="button"
              disabled={analyzing}
              onClick={recalculateCompatibility}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-medium text-[#F59E0B] hover:bg-[#F59E0B]/20 disabled:opacity-60"
            >
              <Sparkles className="size-3.5" />
              {analyzing ? "Analisando..." : "Recalcular Compatibilidade"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {compatibility.dimensions.map((dim) => {
              const pct = Math.round((dim.score / 5) * 100);
              const colorClass =
                dim.status === "atende"
                  ? "bg-[#22C55E]"
                  : dim.status === "nao_atende"
                    ? "bg-red-400"
                    : "bg-[#F59E0B]";
              return (
                <div key={dim.key} className="rounded-lg border border-border bg-surface-hover/40 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{dim.label}</span>
                    <span className="font-mono font-semibold text-foreground">{dim.score.toFixed(1)}/5</span>
                  </div>
                  <div className="my-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                    <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-muted">{dim.evidence}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 pt-2 md:grid-cols-2">
            <div className="rounded-lg border border-[#22C55E]/25 bg-[#22C55E]/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#22C55E]">
                <CheckCircle2 className="size-4" />
                Requisitos atendidos
              </h3>
              <ul className="space-y-1.5 text-xs text-muted">
                {compatibility.metRequirements.length > 0 ? (
                  compatibility.metRequirements.map((item, idx) => <li key={idx}>• {item}</li>)
                ) : (
                  <li>• Nenhum requisito direto confirmado na descrição atual.</li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-300">
                <AlertTriangle className="size-4" />
                Requisitos faltantes
              </h3>
              <ul className="space-y-1.5 text-xs text-muted">
                {compatibility.missingRequirements.length > 0 ? (
                  compatibility.missingRequirements.map((item, idx) => <li key={idx}>• {item}</li>)
                ) : (
                  <li>• Nenhuma lacuna eliminatória detectada.</li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]">
                <ShieldAlert className="size-4" />
                Riscos identificados
              </h3>
              <ul className="space-y-1.5 text-xs text-muted">
                {compatibility.risks.length > 0 ? (
                  compatibility.risks.map((item, idx) => <li key={idx}>• {item}</li>)
                ) : (
                  <li>• Baixo risco identificado.</li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-surface-hover/50 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Lightbulb className="size-4 text-[#F59E0B]" />
                Como melhorar a candidatura
              </h3>
              <ul className="space-y-1.5 text-xs text-muted">
                {compatibility.improvementTips.map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          {!job.description && (
            <div className="border-t border-border pt-4">
              <label htmlFor="customJd" className="mb-1.5 block text-xs font-medium text-muted">
                Cole a descrição completa da vaga abaixo para refinar a análise de compatibilidade:
              </label>
              <textarea
                id="customJd"
                rows={4}
                value={customJd}
                onChange={(e) => setCustomJd(e.target.value)}
                placeholder="Cole aqui os requisitos e atividades da vaga..."
                className="w-full rounded-lg border border-border bg-surface-hover p-3 text-xs text-foreground placeholder:text-faint focus:border-[#F59E0B] focus:outline-none"
              />
            </div>
          )}
        </section>
      )}

      {/* Requirements from official report */}
      {(job.mandatoryRequirements.length > 0 || job.desirableRequirements.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Requisitos Obrigatórios (Relatório)</h2>
            <ul className="space-y-2.5 text-xs">
              {job.mandatoryRequirements.map((req, idx) => {
                const met = /atende/i.test(req.status) && !/n[aã]o atende/i.test(req.status);
                return (
                  <li key={idx} className="rounded-lg border border-border bg-surface-hover/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground">{req.label}</span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${
                          met ? "text-[#22C55E]" : "text-[#F59E0B]"
                        }`}
                      >
                        {met ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                        {req.status}
                      </span>
                    </div>
                    {req.evidence && <p className="mt-1 text-muted">{req.evidence}</p>}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Requisitos Desejáveis & Tecnologias</h2>
            {job.desirableRequirements.length > 0 && (
              <ul className="mb-4 space-y-2 text-xs">
                {job.desirableRequirements.map((req, idx) => (
                  <li key={idx} className="rounded-lg border border-border bg-surface-hover/50 p-3">
                    <div className="font-medium text-foreground">{req.label}</div>
                    {req.evidence && <p className="mt-1 text-muted">{req.evidence}</p>}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-1.5">
              {job.technologies.length > 0 ? (
                job.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md border border-border bg-surface-hover px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {tech}
                  </span>
                ))
              ) : (
                <p className="text-xs text-muted">Nenhuma tecnologia específica indexada ainda.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Description */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Descrição da Vaga</h2>
        {job.description ? (
          <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{job.description}</div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted">
            Descrição completa ainda não extraída para esta vaga. Clique em{" "}
            <strong className="text-foreground">Enviar para Avaliação</strong> ou cole a descrição acima.
          </div>
        )}
      </section>
    </div>
  );
}
