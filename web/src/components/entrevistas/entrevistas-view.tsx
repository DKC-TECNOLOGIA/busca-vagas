"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Plus,
  Video,
  User,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import type { InterviewEntry, InterviewOutcome, PrepSuggestion } from "@/lib/entrevistas/store";

const TYPE_LABELS: Record<InterviewEntry["interviewType"], string> = {
  triagem: "Triagem",
  rh: "Entrevista RH",
  tecnica: "Entrevista Técnica",
  gestor: "Gestor / Liderança",
  painel: "Painel",
  proposta: "Alinhamento de Proposta",
  outro: "Outro",
};

const OUTCOME_BADGES: Record<InterviewOutcome, { label: string; cls: string }> = {
  pendente: { label: "Agendada", cls: "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]" },
  aprovado: { label: "Aprovado", cls: "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]" },
  reprovado: { label: "Reprovado", cls: "border-red-500/40 bg-red-500/15 text-red-300" },
  remarcado: { label: "Remarcada", cls: "border-border bg-surface-hover text-muted" },
  cancelado: { label: "Cancelada", cls: "border-border bg-surface-hover text-faint" },
};

export function EntrevistasView({
  initialItems,
  suggestions,
}: {
  initialItems: InterviewEntry[];
  suggestions: PrepSuggestion[];
}) {
  const [items, setItems] = useState<InterviewEntry[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Calendar state
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Form state
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewEntry["interviewType"]>("rh");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [preparation, setPreparation] = useState("");

  const applySuggestion = (num: string) => {
    setSelectedSuggestion(num);
    const found = suggestions.find((s) => s.n === num);
    if (found) {
      setCompany(found.company);
      setRole(found.role);
      if (found.prepText) setPreparation(found.prepText);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/entrevistas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          role,
          interviewType,
          scheduledAt,
          recruiterName,
          meetingLink,
          notes,
          preparation,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; item?: InterviewEntry };
      if (!res.ok || !data.item) {
        setFeedback(data.error || "Erro ao agendar entrevista.");
        return;
      }
      setItems((prev) => [...prev, data.item!].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
      setShowForm(false);
      setCompany("");
      setRole("");
      setScheduledAt("");
      setRecruiterName("");
      setMeetingLink("");
      setNotes("");
      setPreparation("");
      setSelectedSuggestion("");
      setFeedback("Entrevista agendada com sucesso.");
    } finally {
      setSaving(false);
    }
  };

  const updateOutcome = async (id: string, outcome: InterviewOutcome, outcomeFeedback?: string) => {
    const res = await fetch("/api/entrevistas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, outcome, feedback: outcomeFeedback }),
    });
    const data = (await res.json()) as { ok?: boolean; item?: InterviewEntry };
    if (res.ok && data.item) {
      setItems((prev) => prev.map((i) => (i.id === id ? data.item! : i)));
    }
  };

  const removeInterview = async (id: string) => {
    const res = await fetch(`/api/entrevistas?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const interviewsByDay = useMemo(() => {
    const map = new Map<string, InterviewEntry[]>();
    for (const item of items) {
      const dayKey = item.scheduledAt.slice(0, 10);
      const list = map.get(dayKey) ?? [];
      list.push(item);
      map.set(dayKey, list);
    }
    return map;
  }, [items]);

  const upcoming = items.filter((i) => i.outcome === "pendente" || i.outcome === "remarcado");
  const history = items.filter((i) => i.outcome !== "pendente" && i.outcome !== "remarcado");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Agenda e Preparação de Entrevistas
          </h1>
          <p className="mt-1 text-sm text-muted">
            Calendário de entrevistas, links de reunião, roteiro de preparação e histórico de resultados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#101318] hover:bg-[#FBBF24]"
        >
          <Plus className="size-4" />
          Agendar Entrevista
        </button>
      </header>

      {feedback && (
        <div className="rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-4 py-2 text-xs text-[#22C55E]">
          {feedback}
        </div>
      )}

      {/* New Interview Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-[#F59E0B]/40 bg-surface p-5 text-xs">
          <h2 className="text-sm font-semibold text-foreground">Nova Entrevista</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-muted">Importar preparação de vaga avaliada (opcional)</label>
              <select
                value={selectedSuggestion}
                onChange={(e) => applySuggestion(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
              >
                <option value="">Selecionar vaga...</option>
                {suggestions.map((s) => (
                  <option key={s.n} value={s.n}>
                    #{s.n} — {s.company} ({s.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-muted">Empresa *</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-muted">Cargo *</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-muted">Tipo de entrevista</label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value as InterviewEntry["interviewType"])}
                className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
              >
                {Object.entries(TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-muted">Data e horário *</label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-muted">Nome do recrutador</label>
              <input
                type="text"
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-muted">Link da reunião</label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-muted">Preparação para entrevista</label>
              <textarea
                rows={3}
                value={preparation}
                onChange={(e) => setPreparation(e.target.value)}
                placeholder="Tópicos técnicos, perguntas para o recrutador, casos de suporte..."
                className="w-full rounded-lg border border-border bg-surface-hover p-3 text-foreground"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-muted">Observações</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border bg-surface-hover px-3.5 py-2 text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#F59E0B] px-4 py-2 font-semibold text-[#101318]"
            >
              {saving ? "Salvando..." : "Confirmar Agendamento"}
            </button>
          </div>
        </form>
      )}

      {/* Calendar + Upcoming */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calendar className="size-4 text-[#F59E0B]" />
              {viewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="rounded-md border border-border bg-surface-hover p-1.5 text-muted hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="rounded-md border border-border bg-surface-hover p-1.5 text-muted hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 rounded-lg bg-surface-hover/20" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const isoDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayItems = interviewsByDay.get(isoDay) ?? [];
              return (
                <div
                  key={isoDay}
                  className={`flex h-16 flex-col rounded-lg border p-1.5 text-xs ${
                    dayItems.length > 0
                      ? "border-[#F59E0B]/50 bg-[#F59E0B]/10"
                      : "border-border/70 bg-surface-hover/30"
                  }`}
                >
                  <span className="font-mono text-[11px] text-muted">{day}</span>
                  {dayItems.slice(0, 2).map((item) => (
                    <span
                      key={item.id}
                      className="mt-0.5 truncate rounded bg-[#F59E0B] px-1 text-[9px] font-semibold text-[#101318]"
                    >
                      {item.scheduledAt.slice(11, 16)} {item.company}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        {/* Upcoming List */}
        <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="size-4 text-[#22C55E]" />
            Próximas Entrevistas ({upcoming.length})
          </h2>

          {upcoming.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted">
              Nenhuma entrevista agendada no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-surface-hover/50 p-4 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-[#F59E0B]">{item.company}</span>
                      <h3 className="text-sm font-semibold text-foreground">{item.role}</h3>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${OUTCOME_BADGES[item.outcome].cls}`}>
                      {TYPE_LABELS[item.interviewType]}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-muted">
                    <div>
                      Data: <span className="font-mono text-foreground">{item.scheduledAt.replace("T", " ")}</span>
                    </div>
                    {item.recruiterName && (
                      <div className="flex items-center gap-1">
                        <User className="size-3.5" /> Recrutador: {item.recruiterName}
                      </div>
                    )}
                    {item.meetingLink && (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#22C55E] hover:underline"
                      >
                        <Video className="size-3.5" /> Entrar na reunião
                      </a>
                    )}
                  </div>

                  {item.preparation && (
                    <div className="mt-3 rounded-lg border border-border bg-surface p-2.5 text-[11px] text-muted">
                      <div className="mb-1 flex items-center gap-1 font-semibold text-foreground">
                        <BookOpen className="size-3 text-[#F59E0B]" /> Preparação
                      </div>
                      <p className="whitespace-pre-wrap">{item.preparation}</p>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
                    <select
                      value={item.outcome}
                      onChange={(e) => void updateOutcome(item.id, e.target.value as InterviewOutcome)}
                      className="rounded border border-border bg-surface px-2 py-1 text-[11px] text-foreground"
                    >
                      <option value="pendente">Agendada</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="reprovado">Reprovado</option>
                      <option value="remarcado">Remarcada</option>
                      <option value="cancelado">Cancelada</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void removeInterview(item.id)}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-300"
                    >
                      <Trash2 className="size-3" /> Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* History */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="size-4 text-[#F59E0B]" />
          Histórico de Entrevistas e Resultados ({history.length})
        </h2>
        {history.length === 0 ? (
          <p className="text-xs text-muted">Nenhuma entrevista concluída no histórico ainda.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-hover/40 px-4 py-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">{h.company}</span> — {h.role} (
                  {TYPE_LABELS[h.interviewType]})
                  <div className="font-mono text-[11px] text-muted">{h.scheduledAt.replace("T", " ")}</div>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${OUTCOME_BADGES[h.outcome].cls}`}>
                  {OUTCOME_BADGES[h.outcome].label}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
