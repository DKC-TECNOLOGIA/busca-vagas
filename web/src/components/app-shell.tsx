"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { CoMark } from "@/components/co-mark";
import { AssistantConsole } from "@/components/assistant-console";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackToTop } from "@/components/back-to-top";
import { CommandPalette } from "@/components/command-palette";
import { JobsProvider } from "@/components/jobs/job-store";
import { PipelineProvider } from "@/components/pipeline/pipeline-provider";
import { ApplyProvider } from "@/components/apply/apply-provider";
import { ExploreProvider } from "@/components/explore/explore-provider";
import { FirstScoreView } from "@/components/explore/first-score-view";
import { BetaBanner } from "@/components/beta/beta-banner";
import { WorkerPills } from "@/components/jobs/worker-pills";
import { UsageMeter } from "@/components/usage-meter";
import { visibleNavItems, isActivePath } from "@/lib/nav-items";

const SIDEBAR_STORAGE_KEY = "careerops:sidebar-collapsed";

export function AppShell({ children, followupsEnabled }: { children: React.ReactNode; followupsEnabled: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  // Tela de login ocupa viewport limpa sem sidebar
  if (pathname === "/login") {
    return (
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#101318] text-[#F8FAFC] focus:outline-none">
        {children}
      </main>
    );
  }

  return (
    <JobsProvider>
      <PipelineProvider>
        <ApplyProvider>
          <ExploreProvider>
            <a
              href="#main-content"
              className="sr-only rounded-md bg-brand text-sm font-medium text-brand-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:px-3 focus:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              Ir para o conteúdo
            </a>
            <MobileNav followupsEnabled={followupsEnabled} />
            <div className="flex min-h-screen bg-background text-foreground">
              <aside
                className={cn(
                  "sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-r border-border bg-surface/90 backdrop-blur-sm transition-all duration-200 print:hidden md:flex",
                  collapsed ? "w-[74px] p-3" : "w-64 p-4",
                )}
              >
                <div className={cn("mb-6 flex items-center", collapsed ? "justify-center" : "justify-between px-1")}>
                  <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
                    <CoMark size={30} />
                    {!collapsed && (
                      <div className="flex flex-col leading-none">
                        <span className="text-base font-semibold tracking-tight text-foreground">CareerOps</span>
                        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand-text">
                          Career Intelligence
                        </span>
                      </div>
                    )}
                  </Link>
                  {!collapsed && (
                    <button
                      type="button"
                      onClick={toggleSidebar}
                      title="Recolher menu"
                      aria-label="Recolher menu lateral"
                      className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                    >
                      <PanelLeftClose className="size-4" />
                    </button>
                  )}
                </div>

                {collapsed && (
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    title="Expandir menu"
                    aria-label="Expandir menu lateral"
                    className="mb-4 flex w-full items-center justify-center rounded-md border border-border/60 bg-surface-hover/50 p-2 text-muted transition-colors hover:text-foreground"
                  >
                    <PanelLeftOpen className="size-4" />
                  </button>
                )}

                {!collapsed && <CommandPalette followupsEnabled={followupsEnabled} />}

                <nav className="flex flex-col gap-1" aria-label="Navegação principal">
                  {visibleNavItems(followupsEnabled).map(({ href, label, icon: Icon, chip }) => {
                    const active = isActivePath(href, pathname);
                    return (
                      <Link
                        key={href}
                        href={href}
                        title={collapsed ? label : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          collapsed && "justify-center px-2",
                          active
                            ? "bg-brand-soft text-brand-text shadow-xs ring-1 ring-brand/25"
                            : "text-muted hover:bg-surface-hover hover:text-foreground",
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", active ? "text-brand-text" : "text-muted group-hover:text-foreground")} />
                        {!collapsed && <span className="truncate">{label}</span>}
                        {!collapsed && chip && (
                          <span className="ml-auto rounded-full border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-text">
                            {chip}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {!collapsed && <WorkerPills />}

                <div className="mt-auto space-y-3 pt-4">
                  {!collapsed && <UsageMeter />}
                  {!collapsed && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Aparência</span>
                        <span className="font-mono text-[10px] text-faint">TEMA</span>
                      </div>
                      <ThemeToggle showLabel />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sair"
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border border-border/70 px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <LogOut className="size-4 shrink-0" />
                    {!collapsed && <span>Sair da conta</span>}
                  </button>
                </div>
              </aside>
              <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-hidden focus:outline-none">
                {children}
              </main>
              <div className="print:hidden">
                <AssistantConsole />
                <BackToTop />
                <FirstScoreView />
                <BetaBanner />
              </div>
            </div>
          </ExploreProvider>
        </ApplyProvider>
      </PipelineProvider>
    </JobsProvider>
  );
}
