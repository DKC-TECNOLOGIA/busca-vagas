"use client";

import Link from "next/link";
import {
  Briefcase,
  Sparkles,
  CheckCircle2,
  Send,
  Calendar,
  Activity,
  TrendingUp,
  Award,
  ExternalLink,
  FileText,
  ArrowUpRight,
  Radar,
} from "lucide-react";
import type { DashboardData } from "@/lib/dashboard/loader";

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "amber",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "amber" | "green" | "slate";
}) {
  const accentStyles =
    accent === "green"
      ? "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]"
      : accent === "amber"
        ? "border-[#F59E0B]/25 bg-[#F59E0B]/10 text-[#F59E0B]"
        : "border-[#2A3442] bg-[#222A35] text-[#94A3B8]";

  return (
    <div className="group rounded-xl border border-border bg-surface p-4 transition-all hover:border-[#F59E0B]/40">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">{title}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={`rounded-lg border p-2 ${accentStyles}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2.5 text-[11px] text-faint">{subtitle}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function HorizontalBarList({
  items,
  maxValue,
  barColorClass = "bg-[#F59E0B]",
  valueFormatter = (v: number) => String(v),
}: {
  items: Array<{ label: string; value: number; meta?: string }>;
  maxValue: number;
  barColorClass?: string;
  valueFormatter?: (v: number) => string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-surface-hover/30 px-4 text-center text-xs text-muted">
        Sem registros suficientes ainda para exibir este gráfico.
      </div>
    );
  }

  const safeMax = maxValue > 0 ? maxValue : 1;

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.max(4, Math.min(100, Math.round((item.value / safeMax) * 100)));
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-foreground">{item.label}</span>
              <span className="shrink-0 font-mono text-muted">
                {valueFormatter(item.value)}
                {item.meta ? ` · ${item.meta}` : ""}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const { kpis, charts, recommendedJobs } = data;

  const maxPeriodCount = Math.max(...charts.jobsByPeriod.map((d) => d.count), 1);
  const maxStatusCount = Math.max(...charts.applicationsByStatus.map((d) => d.count), 1);
  const maxSeniorityCount = Math.max(...charts.seniorityDistribution.map((d) => d.count), 1);
  const maxTechCount = Math.max(...charts.topTechnologies.map((d) => d.count), 1);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#22C55E]">
              <span className="size-1.5 rounded-full bg-[#22C55E]" />
              Motor career-ops ativo
            </span>
            <span className="text-xs text-faint">{data.totalEvaluated} vagas avaliadas</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Dashboard de Carreira
          </h1>
          <p className="mt-1 text-sm text-muted">
            Indicadores reais consolidados do scanner, relatórios de compatibilidade e pipeline de candidaturas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <Radar className="size-3.5 text-[#F59E0B]" />
            Executar Scanner
          </Link>
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-2 rounded-lg bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#101318] transition-colors hover:bg-[#FBBF24]"
          >
            <span>Ver Pipeline</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </header>

      {/* 8 KPI Cards */}
      <section aria-label="Indicadores principais" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total de vagas encontradas"
          value={kpis.totalDiscovered}
          subtitle="Registros únicos no histórico de varredura"
          icon={Briefcase}
          accent="amber"
        />
        <KpiCard
          title="Vagas novas"
          value={kpis.newJobsCount}
          subtitle="Pendentes ou recém-capturadas pelo scanner"
          icon={Sparkles}
          accent="amber"
        />
        <KpiCard
          title="Vagas compatíveis"
          value={kpis.compatibleJobsCount}
          subtitle="Avaliadas com nota >= 3,0 / 5"
          icon={CheckCircle2}
          accent="green"
        />
        <KpiCard
          title="Candidaturas enviadas"
          value={kpis.sentApplicationsCount}
          subtitle="Confirmadas manualmente após avaliação"
          icon={Send}
          accent="green"
        />
        <KpiCard
          title="Entrevistas agendadas"
          value={kpis.scheduledInterviewsCount}
          subtitle="Processos em fase de entrevista"
          icon={Calendar}
          accent="amber"
        />
        <KpiCard
          title="Processos em andamento"
          value={kpis.activeProcessesCount}
          subtitle="Aplicado, respondido, teste ou entrevista"
          icon={Activity}
          accent="slate"
        />
        <KpiCard
          title="Taxa de conversão"
          value={`${kpis.conversionRate}%`}
          subtitle="Avanços sobre candidaturas enviadas"
          icon={TrendingUp}
          accent="green"
        />
        <KpiCard
          title="Pontuação média"
          value={kpis.avgScore > 0 ? `${kpis.avgScore.toFixed(2)} / 5` : "—"}
          subtitle="Média de compatibilidade das vagas avaliadas"
          icon={Award}
          accent="amber"
        />
      </section>

      {/* 6 Charts Grid */}
      <section aria-label="Gráficos analíticos" className="grid gap-4 lg:grid-cols-2">
        {/* 1. Vagas encontradas por período */}
        <ChartCard
          title="Vagas encontradas por período"
          subtitle="Volume descoberto por data de captura no scanner"
        >
          {charts.jobsByPeriod.length === 0 ? (
            <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
              Nenhuma varredura registrada ainda.
            </div>
          ) : (
            <div className="flex h-44 items-end gap-3 pt-4">
              {charts.jobsByPeriod.map((point) => {
                const heightPct = Math.max(12, Math.round((point.count / maxPeriodCount) * 100));
                return (
                  <div key={point.date} className="flex flex-1 flex-col items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#F59E0B]">{point.count}</span>
                    <div className="flex h-28 w-full max-w-[56px] items-end rounded-md bg-surface-hover/70 p-1">
                      <div
                        className="w-full rounded-sm bg-gradient-to-t from-[#F59E0B] to-[#FBBF24] transition-all"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-muted">{point.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* 2. Candidaturas por status */}
        <ChartCard
          title="Candidaturas por status"
          subtitle="Distribuição atual no tracker oficial"
        >
          <HorizontalBarList
            items={charts.applicationsByStatus.map((item) => ({
              label: item.status,
              value: item.count,
            }))}
            maxValue={maxStatusCount}
            barColorClass="bg-[#22C55E]"
          />
        </ChartCard>

        {/* 3. Compatibilidade por empresa */}
        <ChartCard
          title="Compatibilidade por empresa"
          subtitle="Pontuação média (0 a 5) nas empresas avaliadas"
        >
          <HorizontalBarList
            items={charts.compatibilityByCompany.map((item) => ({
              label: item.company,
              value: item.avgScore,
              meta: `${item.count} vaga(s)`,
            }))}
            maxValue={5}
            barColorClass="bg-[#F59E0B]"
            valueFormatter={(v) => `${v.toFixed(1)}/5`}
          />
        </ChartCard>

        {/* 4. Distribuição por senioridade */}
        <ChartCard
          title="Distribuição por senioridade"
          subtitle="Classificação das vagas analisadas"
        >
          <HorizontalBarList
            items={charts.seniorityDistribution.map((item) => ({
              label: item.seniority,
              value: item.count,
            }))}
            maxValue={maxSeniorityCount}
            barColorClass="bg-[#F59E0B]"
          />
        </ChartCard>

        {/* 5. Evolução das entrevistas */}
        <ChartCard
          title="Evolução das entrevistas"
          subtitle="Histórico de convites e etapas de entrevista"
        >
          {charts.interviewEvolution.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-hover/25 px-4 text-center">
              <Calendar className="mb-2 size-5 text-muted" />
              <p className="text-xs font-medium text-foreground">Nenhuma entrevista registrada até o momento</p>
              <p className="mt-1 text-[11px] text-muted">
                Assim que você confirmar candidaturas e agendar entrevistas, a evolução aparecerá aqui.
              </p>
            </div>
          ) : (
            <HorizontalBarList
              items={charts.interviewEvolution}
              maxValue={Math.max(...charts.interviewEvolution.map((i) => i.value), 1)}
              barColorClass="bg-[#22C55E]"
            />
          )}
        </ChartCard>

        {/* 6. Principais tecnologias exigidas */}
        <ChartCard
          title="Principais tecnologias exigidas"
          subtitle="Competências mais recorrentes nas descrições analisadas"
        >
          <HorizontalBarList
            items={charts.topTechnologies.map((item) => ({
              label: item.name,
              value: item.count,
            }))}
            maxValue={maxTechCount}
            barColorClass="bg-[#22C55E]"
            valueFormatter={(v) => `${v} vaga(s)`}
          />
        </ChartCard>
      </section>

      {/* Recommended Opportunities */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Oportunidades recomendadas</h2>
            <p className="text-xs text-muted">
              Melhores vagas disponíveis ordenadas pela pontuação real de compatibilidade com seu currículo.
            </p>
          </div>
          <Link
            href="/pipeline"
            className="text-xs font-medium text-[#F59E0B] hover:underline"
          >
            Abrir todas no Pipeline →
          </Link>
        </div>

        {recommendedJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted">
            Nenhuma vaga avaliada ainda. Execute o scanner ou avalie uma vaga para ver recomendações aqui.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recommendedJobs.map((job) => {
              const highFit = (job.score ?? 0) >= 4.0;
              return (
                <div
                  key={job.n}
                  className="flex flex-col justify-between rounded-xl border border-border bg-surface-hover/40 p-4 transition-colors hover:border-[#F59E0B]/40"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-medium text-[#F59E0B]">{job.company}</span>
                        <h3 className="text-sm font-semibold text-foreground">{job.role}</h3>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${
                          highFit
                            ? "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]"
                            : "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]"
                        }`}
                      >
                        {job.score?.toFixed(1)}/5
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="rounded bg-surface px-2 py-0.5">{job.location}</span>
                      <span className="rounded bg-surface px-2 py-0.5">{job.seniority}</span>
                      <span className="rounded bg-surface px-2 py-0.5">{job.status}</span>
                      {job.hasPdf && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#22C55E]/15 px-2 py-0.5 text-[#22C55E]">
                          <FileText className="size-3" />
                          PDF pronto
                        </span>
                      )}
                    </div>

                    {job.notes && <p className="line-clamp-2 text-xs text-muted">{job.notes}</p>}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                    <Link
                      href={`/pipeline/${job.n}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-[#101318] transition-colors hover:bg-[#FBBF24]"
                    >
                      Ver análise
                    </Link>
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
                      >
                        <span>Abrir vaga</span>
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
