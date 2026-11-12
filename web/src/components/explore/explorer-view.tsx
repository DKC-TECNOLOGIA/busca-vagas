"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, ChevronDown, RotateCcw, AlertTriangle, Sparkles, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { instrumentSerif } from "@/lib/fonts";
import { normalizeTextKey } from "@/lib/core/normalize-text-key.mjs";
import { paramsToFilters, paramsToAi, type ExploreFilters } from "@/lib/explore";
import { CHINA_PRESET } from "@/lib/employer-preset.mjs";
import { shouldStartScanOnLoad } from "@/lib/scan-on-load.mjs";
import { FilterBuilder } from "./filter-builder";
import { DiscoveringState } from "./discovering-state";
import { AiHuntView } from "./ai-hunt-view";
import { ExploreModeToggle } from "./explore-mode-toggle";
import { AiSearchBox } from "./ai-search-box";
import { ResultsList, type EnrichedOffer } from "./results-list";
import { useExplore } from "./explore-provider";
import { ScheduleJobAction } from "./schedule-job-action";

// Same shape as core normalizeTextKey(s, " ") — never [^a-z0-9] (#2666).
const norm = (s: string) => normalizeTextKey(s, " ");
const CLI_NAMES: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
  copilot: "Copilot CLI",
  qwen: "Qwen CLI",
  antigravity: "Antigravity CLI",
};

export function ExplorerView({
  seed,
  inboxUrls,
  evaluated,
  rootExists,
}: {
  seed: { filters: ExploreFilters; seededFrom: string[] };
  inboxUrls: string[];
  evaluated: { n: string; company: string; role: string }[];
  rootExists: boolean;
}) {
  const { filters, setFilters, initFilters, phase, running, offers, discover, loadFresh, status, employerOutcome, error, scannerMissing, mode, setMode, aiIntent, setAiIntent, discoverAI, companiesScanned, companiesAvailable, capHit, droppedNoDate, partial } = useExplore();
  const scanNote =
    companiesScanned > 0
      ? `Varredura em ${companiesScanned.toLocaleString()}${companiesAvailable > companiesScanned ? ` de ${companiesAvailable.toLocaleString()}` : ""} empresa${companiesScanned === 1 ? "" : "s"}${partial ? " · algumas fontes ficaram indisponíveis" : ""}.`
      : undefined;
  const inited = useRef(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [cli, setCli] = useState<{ id: string | null; name?: string }>({ id: null });
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    let active = true;
    const readLocal = () => {
      try {
        return JSON.parse(localStorage.getItem("career-ops:config") || "{}") as { cliId?: string };
      } catch {
        return {};
      }
    };
    const local = readLocal();
    if (local.cliId) {
      setCli({ id: local.cliId, name: CLI_NAMES[local.cliId] || local.cliId });
      return;
    }
    fetch("/api/clis")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { remembered?: string | null; clis?: { id: string; name: string; installed: boolean }[] } | null) => {
        if (!active || !data) return;
        const picked =
          data.clis?.find((c) => c.id === data.remembered && c.installed) ||
          data.clis?.find((c) => c.installed);
        if (picked) {
          setCli({ id: picked.id, name: picked.name || CLI_NAMES[picked.id] || picked.id });
          try {
            const next = { ...readLocal(), cliId: picked.id };
            localStorage.setItem("career-ops:config", JSON.stringify(next));
          } catch {
            // ignore storage errors
          }
        } else {
          setCli({ id: null });
        }
      })
      .catch(() => {
        if (active) setCli({ id: null });
      });
    return () => {
      active = false;
    };
  }, []);

  // Initialize once from the URL (shareable search) or the server seed — without
  // clobbering anything the assistant set before this mount.
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const sp = new URLSearchParams(window.location.search);
    const ai = paramsToAi(sp);
    if (ai !== null) {
      setMode("ai");
      setAiIntent(ai);
    } else if (sp.get("view") === "fresh") {
      // Today's "See all N" (#84) hands off here instead of a bare config form —
      // load the SAME /api/whats-new offers it already showed, through the normal
      // results-phase UI. The config form (Refine search / Re-cast) stays reachable.
      // Force scan mode: a session restored in "ai" mode (sessionStorage rehydrate)
      // must not show the AI-search UI for this scan-only hand-off.
      setMode("scan");
      initFilters(seed.filters);
      void loadFresh();
    } else {
      initFilters(sp.toString() ? paramsToFilters(sp) : seed.filters);
      // Onboarding hand-off: ?run=1 on Explore starts the scan. Pipeline never does.
      if (shouldStartScanOnLoad(window.location.pathname, window.location.search)) {
        setFirstRun(true);
        void discover();
      }
    }
  }, [seed.filters, initFilters, setMode, setAiIntent, discover, loadFresh]);

  const enriched: EnrichedOffer[] = useMemo(() => {
    const trackedUrls = new Set(inboxUrls);
    return offers.map((o) => {
      const inPipeline = trackedUrls.has(o.url);
      const c = norm(o.company);
      const t = norm(o.title);
      const ev = evaluated.find((a) => {
        if (norm(a.company) !== c) return false;
        const ar = norm(a.role);
        return ar.length > 3 && (t.includes(ar) || ar.includes(t.split(" ").slice(0, 3).join(" ")));
      });
      return { ...o, inPipeline, evaluatedN: ev?.n };
    });
  }, [offers, inboxUrls, evaluated]);

  const isAi = mode === "ai";
  const isResults = phase === "results";
  const employer = filters.preset === CHINA_PRESET;
  const canDiscover = !running && (employer ? (filters.employers?.length ?? 0) > 0 : filters.ats.length > 0);
  const scanRunning = running && !isAi && !employer;
  // Keep one ResultsList mounted across scanning → revealing → results so
  // filter/sort/scroll and co-rise survive the 850ms reveal handoff.
  const showScanList = !isAi && offers.length > 0 && (scanRunning || isResults);

  if (running && isAi) return <AiHuntView cliName={cli.name} />;

  return (
    <div className={scanRunning ? undefined : "mx-auto max-w-5xl px-5 py-8 md:px-8"}>
      <p role="status" aria-live="polite" aria-atomic="true" className="mb-4 text-sm text-muted">{!isAi && (employerOutcome?.message || (employer && running ? "Varrendo empresas selecionadas…" : ""))}</p>
      {scanRunning && <DiscoveringState />}
      {!scanRunning && (
        <>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Compass className="size-6 text-brand-text" />
            <h1 className={`${instrumentSerif.className} text-3xl text-foreground`}>Explorar Vagas</h1>
            <span className="rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-text">Novo</span>
          </div>
          <div className="w-full sm:ml-auto sm:w-auto">
            <ExploreModeToggle mode={mode} onChange={setMode} cliConfigured={!!cli.id} />
          </div>
        </div>
        {!isResults && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            {isAi
              ? "Descreva a vaga em português natural — a IA busca na web aberta usando seu próprio provedor. Os resultados ficam como não verificados até você avaliar."
              : employer ? "Varra os sites das empresas selecionadas usando seus termos de cargo e local, sem gastar tokens. Abra a vaga original para conferir os detalhes." : "Varra a rede pública de ATS — Greenhouse, Lever, Ashby e Workday. Vagas recentes compatíveis com você, sem gastar tokens. Você só consome tokens quando escolher avaliar uma vaga."}
          </p>
        )}
      </header>

      {!rootExists && (
        <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Seu diretório base do career-ops ainda não está configurado — a descoberta precisa de um perfil para preencher os filtros iniciais.
        </div>
      )}

      {isAi ? (
        phase === "blocked" && !cli.id ? (
          <BlockedCard />
        ) : (
          <div className="space-y-6">
            <AiSearchBox
              intent={aiIntent}
              onIntent={setAiIntent}
              onSubmit={() => void discoverAI()}
              cliConfigured={!!cli.id}
              cliName={cli.name}
              onRunScan={() => setMode("scan")}
            />
            {phase === "results" && <ResultsList offers={enriched} />}
            {phase === "empty-loose" && (
              <EmptyState
                tone="loose"
                title="Nenhuma vaga pública encontrada ainda."
                body="A busca com IA lê o que está público na web. Tente termos mais amplos ou rode a Varredura grátis na rede de ATS."
                onRerun={() => setMode("scan")}
                rerunLabel="Rodar Varredura grátis"
              />
            )}
            {phase === "failed" && <FailedCard msg={error || status} scannerMissing={scannerMissing} onRetry={() => void discoverAI()} />}
          </div>
        )
      ) : (
        <>
          {isResults && !employer ? (
            <div className="mb-6 rounded-xl border border-border bg-surface/30">
              <button type="button" onClick={() => setRefineOpen((v) => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground">
                <Compass className="size-4 text-brand-text" /> Refinar busca
                <ChevronDown className={cn("ml-auto size-4 text-muted transition-transform", refineOpen && "rotate-180")} />
              </button>
              {refineOpen && (
                <div className="space-y-4 border-t border-border p-4">
                  <FilterBuilder filters={filters} onChange={setFilters} seededFrom={seed.seededFrom} disabled={running} />
                  <DiscoverBar canDiscover={canDiscover} onDiscover={discover} label="Refazer busca (grátis)" filters={filters} />
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-border bg-surface/30 p-5">
              <FilterBuilder filters={filters} onChange={setFilters} seededFrom={seed.seededFrom} disabled={running} />
              <div className="mt-5">
                <DiscoverBar canDiscover={canDiscover} onDiscover={discover} label="Buscar vagas (grátis)" filters={filters} />
              </div>
            </div>
          )}

          {isResults && firstRun && !employerOutcome && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <p className="text-[13px] leading-relaxed text-foreground">
                Estas são vagas ativas alinhadas ao seu currículo. <span className="text-emerald-800 dark:text-emerald-400">Nada aqui consumiu tokens.</span> Escolha a que mais interessa — ao avaliar, você verá sua pontuação exata e os motivos.
              </p>
            </div>
          )}

          {isResults && capHit && (
            <CappedBanner companiesScanned={companiesScanned} companiesAvailable={companiesAvailable} onRefine={() => setRefineOpen(true)} />
          )}
        </>
      )}
      </>
      )}

      {showScanList && (
        <div className={scanRunning ? "relative z-[1] mx-auto max-w-5xl px-5 pb-10 md:px-8" : undefined}>
          <ResultsList offers={enriched} />
        </div>
      )}

      {!scanRunning && !isAi && (
        <>
          {!employerOutcome && phase === "empty-current" && (
            <EmptyState
              tone="good"
              title="Tudo em dia por aqui."
              body="Nenhuma novidade desde sua última varredura. Seu pipeline está atualizado."
              note={scanNote}
              onRerun={() => {
                setFilters({ ...filters, sinceDays: Math.max(filters.sinceDays, 30) });
                void discover();
              }}
              rerunLabel="Ampliar para 30 dias"
            />
          )}
          {!employerOutcome && phase === "empty-loose" && (
            <EmptyState
              tone="loose"
              title="Nenhuma vaga recente encontrada ainda."
              body="A descoberta é gratuita — ajuste os filtros e refaça a busca quantas vezes quiser."
              note={scanNote}
              onRerun={() => {
                setFilters({ ...filters, sinceDays: 30, block: [], allow: [] });
                void discover();
              }}
              rerunLabel="Ampliar para 30 dias · limpar local"
            />
          )}
          {!employerOutcome && phase === "degraded" && (
            <DegradedCard
              onRetry={() => void discover()}
              companiesScanned={companiesScanned}
              companiesAvailable={companiesAvailable}
              capHit={capHit}
              droppedNoDate={droppedNoDate}
              partial={partial}
            />
          )}
          {!employerOutcome && phase === "failed" && <FailedCard msg={error || status} scannerMissing={scannerMissing} onRetry={() => void discover()} />}
        </>
      )}
    </div>
  );
}

function DiscoverBar({ canDiscover, onDiscover, label, filters }: { canDiscover: boolean; onDiscover: () => void; label: string; filters: ExploreFilters }) {
  const { running } = useExplore();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={!canDiscover && !running}
        aria-disabled={!canDiscover}
        aria-describedby={filters.preset === CHINA_PRESET ? "employer-selection" : undefined}
        onClick={() => { if (canDiscover) onDiscover(); }}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition-all hover:brightness-110 disabled:opacity-50 max-sm:min-h-[44px]"
      >
        <Compass className="size-4" /> {label}
      </button>
      {filters.preset !== CHINA_PRESET && <ScheduleJobAction filters={filters} />}
      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Avaliar uma vaga depois consome tokens. Descobrir vagas nunca consome.
      </span>
    </div>
  );
}

function EmptyState({ tone, title, body, note, onRerun, rerunLabel }: { tone: "good" | "loose"; title: string; body: string; note?: string; onRerun: () => void; rerunLabel: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/30 px-6 py-12 text-center">
      <div className={cn("mx-auto grid size-12 place-items-center rounded-full", tone === "good" ? "bg-emerald-500/12 text-emerald-500" : "bg-brand-soft text-brand-text")}>
        <Sparkles className="size-6" />
      </div>
      <h2 className={`${instrumentSerif.className} mt-4 text-2xl text-foreground`}>{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{body}</p>
      {note && <p className="mx-auto mt-1 max-w-md text-[12px] text-faint">{note}</p>}
      <button onClick={onRerun} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-brand/40 hover:text-brand-text">
        <RotateCcw className="size-4" /> {rerunLabel}
      </button>
    </div>
  );
}

function DegradedCard({
  onRetry,
  companiesScanned,
  companiesAvailable,
  capHit,
  droppedNoDate,
  partial,
}: {
  onRetry: () => void;
  companiesScanned: number;
  companiesAvailable: number;
  capHit: boolean;
  droppedNoDate: number;
  partial: boolean;
}) {
  // 0 results, but the scan was NOT a clean full search → never "all caught up".
  // Pick the most informative reason (authoritative when the scanner's --json mode
  // is available; otherwise the 0-companies fallback).
  let title = "A varredura rodou, mas não conseguiu acessar nenhuma fonte.";
  let body =
    "Os diretórios públicos de ATS não responderam — geralmente uma instabilidade temporária de rede ou limite de requisições. Tente novamente em alguns instantes.";
  if (companiesScanned > 0 && capHit) {
    title = "Nenhuma vaga encontrada no recorte pesquisado.";
    body = `A varredura atingiu o limite configurado e pesquisou ${companiesScanned.toLocaleString()}${companiesAvailable > companiesScanned ? ` de ${companiesAvailable.toLocaleString()}` : ""} empresas. Aumente a profundidade da varredura em Refinar busca ou ajuste os termos.`;
  } else if (companiesScanned > 0 && droppedNoDate > 0) {
    title = "Vagas recentes foram ignoradas por falta de data.";
    body = `${droppedNoDate.toLocaleString()} vaga${droppedNoDate === 1 ? "" : "s"} combinaram com os filtros, mas não tinham data de publicação clara e foram descartadas pelo filtro de período. Tente ampliar o intervalo de dias.`;
  } else if (companiesScanned > 0 && partial) {
    title = "Alguns portais ficaram indisponíveis.";
    body = `A varredura pesquisou ${companiesScanned.toLocaleString()} empresas, mas uma ou mais fontes não responderam — resultado parcial. Tentar novamente geralmente resolve.`;
  }
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
      <AlertTriangle className="mx-auto size-6 text-amber-500" />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">{body}</p>
      <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-text">
        <RotateCcw className="size-4" /> Tentar novamente
      </button>
    </div>
  );
}

function CappedBanner({ companiesScanned, companiesAvailable, onRefine }: { companiesScanned: number; companiesAvailable: number; onRefine: () => void }) {
  // Results ARE present, but the scan was capped — tell the user there's more, so a
  // partial list never reads as "everything there is".
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-2.5 text-[13px]">
      <span className="text-foreground">
        Exibindo recorte limitado — pesquisadas {companiesScanned.toLocaleString()}
        {companiesAvailable > companiesScanned ? ` de ${companiesAvailable.toLocaleString()}` : ""} empresas.
      </span>
      <button onClick={onRefine} className="font-medium text-brand-text hover:underline">
        Aumentar profundidade para buscar mais
      </button>
    </div>
  );
}

function FailedCard({ msg, scannerMissing, onRetry }: { msg: string; scannerMissing: boolean; onRetry: () => void }) {
  // The scanner-missing case (data-only / pre-scan-ats-full checkout) must NOT
  // offer a "Try again" that re-fails forever — give a real next step instead.
  // The caller decides this from the response body's SCANNER_MISSING code, never
  // from the error text and never from the bare 400: a runtime scan error ("The
  // scanner returned no readable output.") mentions the scanner too, and 400 is
  // a shared channel that also carries malformed-request and MODE_MISSING
  // failures. Neither may be misreported as a broken checkout.
  if (scannerMissing) {
    return (
      <div className="rounded-2xl border border-border bg-surface/30 px-6 py-10 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand-text">
          <Compass className="size-6" />
        </div>
        <h2 className={`${instrumentSerif.className} mt-4 text-2xl text-foreground`}>A descoberta precisa do pacote completo</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
          Seu diretório do career-ops parece conter apenas dados ou está em uma versão antiga. Atualize o repositório ou cole a URL de uma vaga no pipeline para avaliar diretamente.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/pipeline" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110">
            Abrir pipeline
          </Link>
          <Link href="/configuracoes" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-brand/40 hover:text-brand-text">
            Abrir Configurações
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
      <AlertTriangle className="mx-auto size-6 text-amber-500" />
      <p className="mt-2 text-sm font-medium text-foreground">Não foi possível concluir a busca.</p>
      <p className="mt-1 text-[13px] text-muted">{msg}</p>
      <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-text">
        <RotateCcw className="size-4" /> Tentar novamente
      </button>
    </div>
  );
}

function BlockedCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface/30 px-6 py-12 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand-text">
        <Sparkles className="size-6" />
      </div>
      <h2 className={`${instrumentSerif.className} mt-4 text-2xl text-foreground`}>A busca com IA precisa de uma CLI</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
        Conecte Claude Code, Gemini ou outra CLI de agente — sua chave, seus tokens, sua máquina. A Varredura grátis continua disponível sem CLI.
      </p>
      <Link href="/config" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110">
        <Settings className="size-4" /> Abrir Configurações de CLI
      </Link>
    </div>
  );
}
