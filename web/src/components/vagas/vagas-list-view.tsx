"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Star,
  Bookmark,
  Trash2,
  RotateCcw,
  ExternalLink,
  FileText,
  Sparkles,
  Send,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  SlidersHorizontal,
} from "lucide-react";
import type { JobListingItem } from "@/lib/vagas/loader";

type TabMode = "ativas" | "avaliadas" | "favoritas" | "salvas" | "descartadas";

export function VagasListView({ initialJobs }: { initialJobs: JobListingItem[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobListingItem[]>(initialJobs);
  const [tab, setTab] = useState<TabMode>("ativas");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filters
  const [roleQuery, setRoleQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("all");
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [seniorityFilter, setSeniorityFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [minScore, setMinScore] = useState<number>(0);

  const uniqueTechs = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      for (const t of j.technologies) set.add(t);
    }
    return Array.from(set).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const now = Date.now();
    return jobs.filter((job) => {
      if (tab === "ativas" && job.isDiscarded) return false;
      if (tab === "avaliadas" && (job.score === null || job.isDiscarded)) return false;
      if (tab === "favoritas" && !job.isFavorite) return false;
      if (tab === "salvas" && !job.isSaved) return false;
      if (tab === "descartadas" && !job.isDiscarded) return false;

      if (roleQuery && !`${job.role} ${job.description} ${job.notes}`.toLowerCase().includes(roleQuery.toLowerCase())) {
        return false;
      }
      if (companyFilter && !job.company.toLowerCase().includes(companyFilter.toLowerCase())) {
        return false;
      }
      if (locationFilter && !job.location.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
      if (modalityFilter !== "all" && job.modality !== modalityFilter) {
        return false;
      }
      if (salaryOnly && job.salaryText === "Não divulgado") {
        return false;
      }
      if (seniorityFilter !== "all" && job.seniority !== seniorityFilter) {
        return false;
      }
      if (techFilter !== "all" && !job.technologies.includes(techFilter)) {
        return false;
      }
      if (minScore > 0 && (job.score ?? -1) < minScore) {
        return false;
      }
      if (dateRangeFilter !== "all") {
        const refDate = Date.parse(job.postedAt || job.discoveredAt || "");
        if (!Number.isFinite(refDate)) return false;
        const diffDays = (now - refDate) / (1000 * 60 * 60 * 24);
        if (dateRangeFilter === "7d" && diffDays > 7) return false;
        if (dateRangeFilter === "30d" && diffDays > 30) return false;
      }
      return true;
    });
  }, [
    jobs,
    tab,
    roleQuery,
    companyFilter,
    locationFilter,
    modalityFilter,
    salaryOnly,
    seniorityFilter,
    techFilter,
    minScore,
    dateRangeFilter,
  ]);

  const runAction = async (
    id: string,
    action: "favorite" | "save" | "discard" | "restore" | "queue_evaluate",
    reason?: string,
  ) => {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/vagas/${encodeURIComponent(id)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        state?: { isFavorite?: boolean; isSaved?: boolean; isDiscarded?: boolean; discardReason?: string };
      };
      if (!res.ok) {
        setFeedback(data.error || "Não foi possível executar a ação.");
        return;
      }

      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== id) return j;
          const nextFav = data.state?.isFavorite ?? j.isFavorite;
          const nextSaved = data.state?.isSaved ?? j.isSaved;
          const nextDiscarded = data.state?.isDiscarded ?? j.isDiscarded;
          const nextReason = data.state?.discardReason ?? j.discardReason;
          let nextStatus = j.status;
          if (nextDiscarded) nextStatus = "Descartada";
          else if (j.score !== null) nextStatus = j.status === "Descartada" ? "Avaliada" : j.status;
          else if (nextSaved) nextStatus = "Salva";
          else nextStatus = "Nova";

          return {
            ...j,
            isFavorite: nextFav,
            isSaved: nextSaved,
            isDiscarded: nextDiscarded,
            discardReason: nextReason,
            status: nextStatus,
          };
        }),
      );

      if (action === "queue_evaluate") {
        setFeedback("Vaga adicionada à fila do pipeline para avaliação.");
      }
      router.refresh();
    } catch {
      setFeedback("Erro de rede ao salvar ação.");
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(
    () => ({
      ativas: jobs.filter((j) => !j.isDiscarded).length,
      avaliadas: jobs.filter((j) => j.score !== null && !j.isDiscarded).length,
      favoritas: jobs.filter((j) => j.isFavorite).length,
      salvas: jobs.filter((j) => j.isSaved).length,
      descartadas: jobs.filter((j) => j.isDiscarded).length,
    }),
    [jobs],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Busca de Vagas
          </h1>
          <p className="mt-1 text-sm text-muted">
            Oportunidades capturadas pelo scanner do <span className="font-mono">career-ops</span> com filtros,
            compatibilidade e ações rápidas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/explore"
            className="rounded-lg bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#101318] transition-colors hover:bg-[#FBBF24]"
          >
            Novo Scan / Explorar
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["ativas", `Ativas (${counts.ativas})`],
            ["avaliadas", `Avaliadas (${counts.avaliadas})`],
            ["favoritas", `Favoritas (${counts.favoritas})`],
            ["salvas", `Salvas (${counts.salvas})`],
            ["descartadas", `Descartadas (${counts.descartadas})`],
          ] as Array<[TabMode, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === key
                ? "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]"
                : "border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <SlidersHorizontal className="size-3.5 text-[#F59E0B]" />
          Filtros de Oportunidades
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={roleQuery}
              onChange={(e) => setRoleQuery(e.target.value)}
              placeholder="Cargo ou palavra-chave..."
              className="w-full rounded-lg border border-border bg-surface-hover py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-faint focus:border-[#F59E0B] focus:outline-none"
            />
          </div>
          <input
            type="text"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            placeholder="Filtrar por empresa..."
            className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs text-foreground placeholder:text-faint focus:border-[#F59E0B] focus:outline-none"
          />
          <input
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="Localização (ex: Feira de Santana)..."
            className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs text-foreground placeholder:text-faint focus:border-[#F59E0B] focus:outline-none"
          />
          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs text-foreground focus:border-[#F59E0B] focus:outline-none"
          >
            <option value="all">Modalidade: Todas</option>
            <option value="Remoto">Remoto</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Presencial">Presencial</option>
            <option value="Não informado">Não informado</option>
          </select>

          <select
            value={seniorityFilter}
            onChange={(e) => setSeniorityFilter(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs text-foreground focus:border-[#F59E0B] focus:outline-none"
          >
            <option value="all">Senioridade: Todas</option>
            <option value="Júnior">Júnior</option>
            <option value="Pleno">Pleno</option>
            <option value="Sênior">Sênior</option>
            <option value="Estágio">Estágio</option>
            <option value="Não especificada">Não especificada</option>
          </select>

          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs text-foreground focus:border-[#F59E0B] focus:outline-none"
          >
            <option value="all">Tecnologia: Todas</option>
            {uniqueTechs.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs text-foreground focus:border-[#F59E0B] focus:outline-none"
          >
            <option value="all">Data de publicação: Todas</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>

          <select
            value={String(minScore)}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-xs text-foreground focus:border-[#F59E0B] focus:outline-none"
          >
            <option value="0">Score: Qualquer</option>
            <option value="2.5">Score ≥ 2,5 / 5</option>
            <option value="3">Score ≥ 3,0 / 5</option>
            <option value="3.5">Score ≥ 3,5 / 5</option>
            <option value="4">Score ≥ 4,0 / 5</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={salaryOnly}
              onChange={(e) => setSalaryOnly(e.target.checked)}
              className="rounded border-border bg-surface-hover accent-[#F59E0B]"
            />
            Apenas vagas com salário divulgado
          </label>
          <span className="text-xs text-muted">
            Exibindo <strong className="text-foreground">{filteredJobs.length}</strong> de {jobs.length} vagas
          </span>
        </div>
      </section>

      {feedback && (
        <div className="rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-4 py-2.5 text-xs text-[#22C55E]">
          {feedback}
        </div>
      )}

      {/* Results List */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm font-medium text-foreground">Nenhuma vaga encontrada para estes filtros.</p>
          <p className="mt-1 text-xs text-muted">Ajuste os critérios acima ou execute uma nova varredura.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const isBusy = busyId === job.id;
            const highFit = (job.score ?? 0) >= 4.0;
            return (
              <article
                key={job.id}
                className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-[#F59E0B]/40"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#F59E0B]">
                        <Building2 className="size-3.5" />
                        {job.company}
                      </span>
                      <span className="rounded-full border border-border bg-surface-hover px-2 py-0.5 text-[11px] text-muted">
                        {job.status}
                      </span>
                      {job.seniority !== "Não especificada" && (
                        <span className="rounded-full border border-border bg-surface-hover px-2 py-0.5 text-[11px] text-foreground">
                          {job.seniority}
                        </span>
                      )}
                      {job.hasPdf && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-2 py-0.5 text-[11px] text-[#22C55E]">
                          <FileText className="size-3" />
                          PDF Pronto
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/vagas/${job.id}`}
                      className="block text-base font-semibold text-foreground transition-colors hover:text-[#F59E0B]"
                    >
                      {job.role}
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {job.location} ({job.modality})
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="size-3.5" />
                        {job.salaryText}
                      </span>
                      {(job.postedAt || job.discoveredAt) && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {job.postedAt || job.discoveredAt}
                        </span>
                      )}
                    </div>

                    {job.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.technologies.slice(0, 7).map((tech) => (
                          <span
                            key={tech}
                            className="rounded border border-border bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-muted"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {job.isDiscarded && job.discardReason && (
                      <p className="text-xs text-red-300/90">Motivo do descarte: {job.discardReason}</p>
                    )}
                  </div>

                  {/* Score & Actions */}
                  <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                    <div
                      className={`rounded-lg border px-3 py-1.5 text-center font-mono ${
                        job.score === null
                          ? "border-border bg-surface-hover text-muted"
                          : highFit
                            ? "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]"
                            : "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]"
                      }`}
                    >
                      <div className="text-sm font-bold">
                        {job.score !== null ? `${job.score.toFixed(1)} / 5` : "Não avaliada"}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => runAction(job.id, "favorite")}
                        title="Favoritar vaga"
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                          job.isFavorite
                            ? "border-[#F59E0B]/50 bg-[#F59E0B]/15 text-[#F59E0B]"
                            : "border-border bg-surface-hover text-muted hover:text-foreground"
                        }`}
                      >
                        <Star className="size-3.5" />
                        <span>{job.isFavorite ? "Favorita" : "Favoritar"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => runAction(job.id, "save")}
                        title="Salvar vaga"
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                          job.isSaved
                            ? "border-[#22C55E]/50 bg-[#22C55E]/15 text-[#22C55E]"
                            : "border-border bg-surface-hover text-muted hover:text-foreground"
                        }`}
                      >
                        <Bookmark className="size-3.5" />
                        <span>{job.isSaved ? "Salva" : "Salvar"}</span>
                      </button>

                      {!job.isDiscarded ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => runAction(job.id, "discard")}
                          title="Descartar vaga"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-red-500/40 hover:text-red-300"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Descartar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => runAction(job.id, "restore")}
                          title="Restaurar vaga"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-[#22C55E] transition-colors hover:bg-surface"
                        >
                          <RotateCcw className="size-3.5" />
                          <span>Restaurar</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/vagas/${job.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-[#101318] transition-colors hover:bg-[#FBBF24]"
                      >
                        <Sparkles className="size-3.5" />
                        <span>{job.score !== null ? "Ver Análise" : "Detalhes"}</span>
                      </Link>

                      {job.trackerNum ? (
                        <Link
                          href={`/pipeline/${job.trackerNum}/cv-studio`}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-[#F59E0B]/40"
                        >
                          <FileText className="size-3.5 text-[#22C55E]" />
                          <span>Currículo</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => runAction(job.id, "queue_evaluate")}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-[#F59E0B]/40"
                        >
                          <Sparkles className="size-3.5 text-[#F59E0B]" />
                          <span>Avaliar</span>
                        </button>
                      )}

                      {job.trackerNum && (
                        <Link
                          href={`/pipeline/${job.trackerNum}/apply`}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-[#22C55E]/40"
                        >
                          <Send className="size-3.5 text-[#F59E0B]" />
                          <span>Candidatura</span>
                        </Link>
                      )}

                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
