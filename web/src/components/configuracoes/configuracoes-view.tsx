"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Database,
  Save,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Settings,
} from "lucide-react";
import type { UserPreferencesData } from "@/app/api/configuracoes/route";
import type { NotificationLogItem } from "@/lib/notifications/telegram";

export function ConfiguracoesView({
  initialPreferences,
  systemStatus,
  initialLogs,
}: {
  initialPreferences: UserPreferencesData;
  systemStatus: {
    neonConfigured: boolean;
    telegramConfigured: boolean;
    careerOpsRoot: string;
  };
  initialLogs: NotificationLogItem[];
}) {
  const [prefs, setPrefs] = useState<UserPreferencesData>(initialPreferences);
  const [logs, setLogs] = useState<NotificationLogItem[]>(initialLogs);
  const [saving, setSaving] = useState(false);
  const [testingTg, setTestingTg] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const savePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setFeedback({ ok: false, text: data.error || "Erro ao salvar preferências." });
        return;
      }
      setFeedback({ ok: true, text: "Preferências salvas com sucesso." });
    } finally {
      setSaving(false);
    }
  };

  const testTelegram = async () => {
    setTestingTg(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/notifications/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "priority_opportunity",
          title: "Teste CareerOps",
          message: "Notificação de teste disparada pelo painel /configuracoes.",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; status?: string };
      setFeedback({
        ok: Boolean(data.ok),
        text: data.ok
          ? "Mensagem de teste enviada para o Telegram!"
          : data.error || "Não foi possível enviar para o Telegram.",
      });
      setLogs((prev) => [
        {
          id: `ui-${Date.now()}`,
          eventType: "priority_opportunity",
          title: "Teste CareerOps",
          message: "Notificação de teste disparada pelo painel /configuracoes.",
          status: data.ok ? "sent" : "failed",
          error: data.error,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setTestingTg(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Configurações & Integrações
          </h1>
          <p className="mt-1 text-sm text-muted">
            Preferências de notificação Telegram, conexão Neon PostgreSQL e parâmetros da plataforma.
          </p>
        </div>
        <Link
          href="/config"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-hover"
        >
          <Settings className="size-3.5 text-[#F59E0B]" />
          Configuração YAML (Core)
        </Link>
      </header>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs ${
            feedback.ok
              ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
              : "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
          }`}
        >
          {feedback.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Banco Neon PostgreSQL</span>
            <Database className={`size-4 ${systemStatus.neonConfigured ? "text-[#22C55E]" : "text-[#F59E0B]"}`} />
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {systemStatus.neonConfigured ? "DATABASE_URL configurada" : "Aguardando DATABASE_URL"}
          </p>
          <p className="mt-1 text-[11px] text-faint">
            Credenciais mantidas exclusivamente no backend (<span className="font-mono">web/.env.local</span>).
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Bot Telegram</span>
            <Bell className={`size-4 ${systemStatus.telegramConfigured ? "text-[#22C55E]" : "text-[#F59E0B]"}`} />
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {systemStatus.telegramConfigured ? "Token configurado no backend" : "Aguardando TELEGRAM_BOT_TOKEN"}
          </p>
          <button
            type="button"
            disabled={testingTg}
            onClick={testTelegram}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-hover px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-[#F59E0B]/40"
          >
            <Send className="size-3 text-[#F59E0B]" />
            {testingTg ? "Testando..." : "Testar Notificação Telegram"}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Motor career-ops</span>
            <ShieldCheck className="size-4 text-[#22C55E]" />
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">Conectado (Local-First)</p>
          <p className="mt-1 truncate font-mono text-[11px] text-faint" title={systemStatus.careerOpsRoot}>
            {systemStatus.careerOpsRoot}
          </p>
        </div>
      </div>

      {/* Preferences Form */}
      <form onSubmit={savePreferences} className="space-y-5 rounded-xl border border-border bg-surface p-6 text-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-foreground">Regras de Notificações (Telegram & Painel)</h2>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 font-semibold text-[#101318] hover:bg-[#FBBF24]"
          >
            <Save className="size-3.5" />
            {saving ? "Salvando..." : "Salvar Preferências"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["telegramEnabled", "Ativar envio de alertas via Telegram"],
              ["notifyNewJob", "Nova vaga encontrada no scanner"],
              ["notifyHighMatch", "Vaga com alta compatibilidade"],
              ["notifyPriorityOpportunity", "Nova oportunidade prioritária"],
              ["notifyPendingApplication", "Candidatura pendente de envio"],
              ["notifyUpcomingInterview", "Entrevista próxima"],
              ["notifyStatusChange", "Atualização de processo seletivo"],
              ["notifyAutomationError", "Erros na automação"],
            ] as Array<[keyof UserPreferencesData, string]>
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-hover/40 px-3.5 py-2.5"
            >
              <span className="text-foreground">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(prefs[key])}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                className="size-4 accent-[#F59E0B]"
              />
            </label>
          ))}
        </div>

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-muted">Score mínimo para alerta (0 a 5)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={prefs.minMatchScoreNotify}
              onChange={(e) => setPrefs({ ...prefs, minMatchScoreNotify: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-muted">Intervalo do scanner automático (min)</label>
            <input
              type="number"
              min="15"
              step="15"
              value={prefs.autoScanIntervalMinutes}
              onChange={(e) => setPrefs({ ...prefs, autoScanIntervalMinutes: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-muted">Formato padrão de PDF</label>
            <select
              value={prefs.defaultCvFormat}
              onChange={(e) => setPrefs({ ...prefs, defaultCvFormat: e.target.value === "letter" ? "letter" : "a4" })}
              className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
            >
              <option value="a4">A4 (Brasil)</option>
              <option value="letter">Letter (EUA)</option>
            </select>
          </div>
        </div>
      </form>

      {/* Notification Logs */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Log Recente de Notificações</h2>
        {logs.length === 0 ? (
          <p className="text-xs text-muted">Nenhuma notificação registrada ainda.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {logs.slice(0, 8).map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-hover/40 px-3.5 py-2.5"
              >
                <div>
                  <span className="font-semibold text-foreground">{l.title}</span>
                  <span className="ml-2 text-muted">{l.error || l.message}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                    l.status === "sent"
                      ? "bg-[#22C55E]/15 text-[#22C55E]"
                      : "bg-[#F59E0B]/15 text-[#F59E0B]"
                  }`}
                >
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
