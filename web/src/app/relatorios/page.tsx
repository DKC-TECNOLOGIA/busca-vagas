import Link from "next/link";
import { FileBarChart, ExternalLink, FileText } from "lucide-react";
import { readApplications, requestReportReader } from "@/lib/career-ops";
import { parseNumericScore } from "@/lib/dashboard/analytics.mjs";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const applications = readApplications();
  const readReport = requestReportReader();

  const items = applications
    .map((app) => {
      const report = readReport(app);
      const score = parseNumericScore(app.score);
      let verdict = "";
      if (report?.content) {
        const m = report.content.match(/##\s*Veredito\s*\n+([^\n]+)/i);
        if (m) verdict = m[1].replace(/\*\*/g, "").trim();
      }
      return {
        n: String(app.n),
        company: app.company,
        role: app.role,
        date: app.date,
        score,
        status: app.status,
        hasPdf: Boolean(app.pdf && app.pdf.includes("✅")),
        verdict,
        notes: app.notes,
        url: app.url,
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="border-b border-border pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Relatórios de Compatibilidade
        </h1>
        <p className="mt-1 text-sm text-muted">
          Todos os pareceres estruturados gerados em <span className="font-mono">reports/</span> ordenados por aderência.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-xs text-muted">
          Nenhum relatório encontrado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.n}
              className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-[#F59E0B]">#{item.n.padStart(3, "0")}</span>
                  <span className="font-semibold text-foreground">{item.company}</span>
                  <span className="text-faint">·</span>
                  <span className="text-muted">{item.date}</span>
                  <span className="rounded-full border border-border bg-surface-hover px-2 py-0.5 text-[10px] text-muted">
                    {item.status}
                  </span>
                  {item.hasPdf && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-2 py-0.5 text-[10px] text-[#22C55E]">
                      <FileText className="size-3" /> PDF
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-semibold text-foreground">{item.role}</h2>
                {item.verdict && <p className="text-xs text-muted">{item.verdict}</p>}
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-bold ${
                    (item.score ?? 0) >= 4
                      ? "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]"
                      : (item.score ?? 0) >= 3
                        ? "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]"
                        : "border-border bg-surface-hover text-muted"
                  }`}
                >
                  {item.score !== null ? `${item.score.toFixed(1)}/5` : "—"}
                </span>
                <Link
                  href={`/vagas/${item.n.padStart(3, "0")}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-[#101318] hover:bg-[#FBBF24]"
                >
                  <FileBarChart className="size-3.5" />
                  Abrir Análise
                </Link>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg border border-border bg-surface-hover p-1.5 text-muted hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
