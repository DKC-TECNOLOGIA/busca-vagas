"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Radar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type { AutomacoesData } from "@/lib/automacoes/loader";

export function AutomacoesView({ initialData }: { initialData: AutomacoesData }) {
  const router = useRouter();
  const [data, setData] = useState<AutomacoesData>(initialData);
  const [running, setRunning] = useState(false);
  const [positiveText, setPositiveText] = useState(initialData.titleFilter.positive.join("\n"));
  const [negativeText, setNegativeText] = useState(initialData.titleFilter.negative.join("\n"));
  const [locationsText, setLocationsText] = useState(initialData.locationFilter.allow.join("\n"));
  const [feedback, setFeedback] = useState<string | null>(null);

  const triggerScan = async () => {
    setRunning(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/automacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_scan" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; run?: AutomacoesData["runs"][number] };
      if (!res.ok || !json.run) {
        setFeedback(json.error || "Não foi possível iniciar o scanner.");
        return;
      }
      setData((prev) => ({ ...prev, runs: [json.run!, ...prev.runs] }));
      setFeedback("Scanner iniciado em segundo plano. A página pode continuar sendo usada normalmente.");
      setTimeout(() => router.refresh(), 2500);
    } finally {
      setRunning(false);
    }
  };

  const toggleSource = async (name: string) => {
    setFeedback(null);
    const res = await fetch("/api/automacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_source", name }),
    });
    const json = (await res.json()) as { ok?: boolean; enabled?: boolean; error?: string };
    if (!res.ok) {
      setFeedback(json.error || "Erro ao alternar fonte.");
      return;
    }
    setData((prev) => ({
      ...prev,
      sources: prev.sources.map((s) => (s.name === name ? { ...s, enabled: Boolean(json.enabled) } : s)),
    }));
    setFeedback(`Fonte "${name}" ${json.enabled ? "habilitada" : "desabilitada"} em portals.yml.`);
  };

  const saveFilters = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch("/api/automacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_filters",
        positive: positiveText.split(/\r?\n/),
        negative: negativeText.split(/\r?\n/),
        locations: locationsText.split(/\r?\n/),
      }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      setFeedback(json.error || "Erro ao salvar filtros.");
      return;
    }
    setFeedback("Filtros de título e localização salvos em portals.yml.");
    router.refresh();
  };

  const lastRun = data.runs[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Central de Automações
          </h1>
          <p className="mt-1 text-sm text-muted">
            Execução em segundo plano do <span className="font-mono">scan.mjs</span>, monitoramento de portais e
            configuração de filtros (<span className="font-mono">portals.yml</span>).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/scheduled-scans"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-hover"
          >
            <Clock className="size-3.5 text-[#F59E0B]" />
            Agendamentos OS ({data.scheduledJobsCount})
          </Link>
          <button
            type="button"
            disabled={running}
            onClick={triggerScan}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#101318] hover:bg-[#FBBF24] disabled:opacity-60"
          >
            {running ? <RefreshCw className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Executar Scanner Agora
          </button>
        </div>
      </header>

      {feedback && (
        <div className="rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-4 py-2 text-xs text-[#22C55E]">
          {feedback}
        </div>
      )}

      {/* Status Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Última execução</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {lastRun ? `${lastRun.runType} (${lastRun.status})` : "Nenhuma execução registrada"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-faint">
            {lastRun ? lastRun.startedAt.slice(0, 19).replace("T", " ") : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Próxima execução programada</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {data.nextScheduledRun ? data.nextScheduledRun.slice(0, 16).replace("T", " ") : "Sob demanda"}
          </div>
          <div className="mt-1 text-[11px] text-faint">
            {data.scheduledJobsCount} tarefa(s) ativa(s) em scheduled-jobs.json
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Portais & Queries monitoradas</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {data.sources.filter((s) => s.enabled).length} empresa(s) · {data.searchQueries.filter((q) => q.enabled).length} query(s)
          </div>
          <div className="mt-1 text-[11px] text-faint">Fonte: portals.yml</div>
        </div>
      </div>

      {/* Sources + History */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Radar className="size-4 text-[#F59E0B]" />
            Portais Monitorados (Empresas)
          </h2>
          <div className="space-y-2.5">
            {data.sources.map((src) => (
              <div
                key={src.name}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-hover/40 p-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{src.name}</span>
                    <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">
                      {src.scanMethod}
                    </span>
                  </div>
                  {src.careersUrl && (
                    <a
                      href={src.careersUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#F59E0B] hover:underline"
                    >
                      {src.careersUrl} <ExternalLink className="size-3" />
                    </a>
                  )}
                  {src.notes && <p className="text-[11px] text-muted">{src.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => void toggleSource(src.name)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                    src.enabled
                      ? "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]"
                      : "border-border bg-surface text-muted"
                  }`}
                >
                  {src.enabled ? "Habilitada" : "Desabilitada"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Histórico de Execuções & Erros</h2>
          {data.runs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted">
              Nenhuma execução disparada pela plataforma ainda. Clique em <strong>Executar Scanner Agora</strong>.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.runs.slice(0, 8).map((r) => (
                <div key={r.id} className="rounded-lg border border-border bg-surface-hover/40 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-foreground">{r.runType}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        r.status === "completed"
                          ? "bg-[#22C55E]/15 text-[#22C55E]"
                          : r.status === "failed"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-[#F59E0B]/15 text-[#F59E0B]"
                      }`}
                    >
                      {r.status === "completed" ? (
                        <CheckCircle2 className="size-3" />
                      ) : r.status === "failed" ? (
                        <AlertTriangle className="size-3" />
                      ) : (
                        <RefreshCw className="size-3 animate-spin" />
                      )}
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{r.summary}</p>
                  {r.error && <p className="mt-1 text-[11px] text-red-300">Erro: {r.error}</p>}
                  <div className="mt-1 font-mono text-[10px] text-faint">{r.startedAt.slice(0, 19).replace("T", " ")}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Filters Editor */}
      <form onSubmit={saveFilters} className="space-y-4 rounded-xl border border-border bg-surface p-5 text-xs">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sliders className="size-4 text-[#F59E0B]" />
            Configuração de Filtros (portals.yml)
          </h2>
          <button
            type="submit"
            className="rounded-lg bg-[#F59E0B] px-3.5 py-1.5 font-semibold text-[#101318] hover:bg-[#FBBF24]"
          >
            Salvar Filtros
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-muted">Títulos positivos (1 por linha)</label>
            <textarea
              rows={7}
              value={positiveText}
              onChange={(e) => setPositiveText(e.target.value)}
              className="w-full rounded-lg border border-border bg-[#101318] p-2.5 font-mono text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-muted">Títulos negativos / excluir (1 por linha)</label>
            <textarea
              rows={7}
              value={negativeText}
              onChange={(e) => setNegativeText(e.target.value)}
              className="w-full rounded-lg border border-border bg-[#101318] p-2.5 font-mono text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-muted">Localizações permitidas (1 por linha)</label>
            <textarea
              rows={7}
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
              className="w-full rounded-lg border border-border bg-[#101318] p-2.5 font-mono text-foreground"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
