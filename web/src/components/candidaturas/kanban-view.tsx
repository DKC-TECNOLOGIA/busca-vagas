"use client";

import { useState } from "react";
import {
  Plus,
  ExternalLink,
  Calendar,
  FileText,
  UserCheck,
  History,
  X,
  AlertTriangle,
  GripVertical,
} from "lucide-react";
import { KANBAN_STAGES } from "@/lib/candidaturas/stages.mjs";
import type { KanbanApplicationCard } from "@/lib/candidaturas/store";

export function KanbanView({ initialCards }: { initialCards: KanbanApplicationCard[] }) {
  const [cards, setCards] = useState<KanbanApplicationCard[]>(initialCards);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanApplicationCard | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ card: KanbanApplicationCard; toStage: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const moveCard = async (card: KanbanApplicationCard, toStage: string, confirmApplied = false) => {
    if (card.stage === toStage) return;
    if (toStage === "candidatura_enviada" && !confirmApplied) {
      setPendingConfirm({ card, toStage });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/candidaturas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, stage: toStage, confirmApplied }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        requiresConfirmation?: boolean;
        card?: KanbanApplicationCard;
      };
      if (!res.ok || !data.card) {
        if (data.requiresConfirmation) {
          setPendingConfirm({ card, toStage });
          return;
        }
        setFeedback(data.error || "Não foi possível mover o cartão.");
        return;
      }

      setCards((prev) => prev.map((c) => (c.id === card.id ? data.card! : c)));
      if (selectedCard?.id === card.id) setSelectedCard(data.card);
      setPendingConfirm(null);
      setFeedback(`Etapa atualizada para "${KANBAN_STAGES.find((s) => s.id === toStage)?.label ?? toStage}".`);
    } finally {
      setSaving(false);
    }
  };

  const saveCardDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/candidaturas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCard.id,
          appliedAt: selectedCard.appliedAt,
          resumeUsed: selectedCard.resumeUsed,
          expectedSalary: selectedCard.expectedSalary,
          recruiterContact: selectedCard.recruiterContact,
          notes: selectedCard.notes,
          nextAction: selectedCard.nextAction,
          followUpDate: selectedCard.followUpDate,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; card?: KanbanApplicationCard };
      if (!res.ok || !data.card) {
        setFeedback(data.error || "Falha ao salvar detalhes.");
        return;
      }
      setCards((prev) => prev.map((c) => (c.id === selectedCard.id ? data.card! : c)));
      setSelectedCard(data.card);
      setFeedback("Detalhes da candidatura salvos com sucesso.");
    } finally {
      setSaving(false);
    }
  };

  const createNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newRole.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/candidaturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: newCompany.trim(),
          role: newRole.trim(),
          jobUrl: newUrl.trim(),
          stage: "vaga_identificada",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; card?: KanbanApplicationCard };
      if (!res.ok || !data.card) {
        setFeedback(data.error || "Erro ao criar candidatura.");
        return;
      }
      setCards((prev) => [data.card!, ...prev]);
      setNewCompany("");
      setNewRole("");
      setNewUrl("");
      setShowCreateModal(false);
      setFeedback("Nova candidatura adicionada em '1. Vaga identificada'.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Kanban de Candidaturas
          </h1>
          <p className="mt-1 text-sm text-muted">
            Arraste e solte cartões entre as 11 etapas. O envio só é registrado após sua confirmação explícita.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#101318] hover:bg-[#FBBF24]"
        >
          <Plus className="size-4" />
          Nova Candidatura
        </button>
      </header>

      {feedback && (
        <div className="rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-4 py-2 text-xs text-[#22C55E]">
          {feedback}
        </div>
      )}

      {/* Horizontal 11-column Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_STAGES.map((stage) => {
          const columnCards = cards.filter((c) => c.stage === stage.id);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!draggedId) return;
                const card = cards.find((c) => c.id === draggedId);
                setDraggedId(null);
                if (card) void moveCard(card, stage.id);
              }}
              className="flex min-h-[540px] w-[275px] shrink-0 flex-col rounded-xl border border-border bg-surface/80 p-3"
            >
              <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
                <h2 className="text-xs font-semibold text-foreground">{stage.label}</h2>
                <span className="rounded-full bg-surface-hover px-2 py-0.5 font-mono text-[11px] text-muted">
                  {columnCards.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2.5">
                {columnCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDraggedId(card.id)}
                    onClick={() => setSelectedCard(card)}
                    className="cursor-pointer rounded-lg border border-border bg-surface-hover/60 p-3 transition-all hover:border-[#F59E0B]/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#F59E0B]">{card.company}</span>
                      <GripVertical className="size-3.5 shrink-0 text-faint" />
                    </div>
                    <p className="mt-1 text-xs font-medium text-foreground">{card.role}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                      {card.score !== "—" && (
                        <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[#22C55E]">
                          {card.score}
                        </span>
                      )}
                      {card.followUpDate && (
                        <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5">
                          <Calendar className="size-2.5" />
                          {card.followUpDate}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for Candidatura Enviada */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#F59E0B]/40 bg-[#191F27] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#F59E0B]" />
              <div>
                <h3 className="text-base font-semibold text-[#F8FAFC]">Confirmar envio de candidatura</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
                  Você confirma que já enviou sua candidatura para{" "}
                  <strong className="text-[#F8FAFC]">
                    {pendingConfirm.card.company} — {pendingConfirm.card.role}
                  </strong>
                  ? Analisar ou salvar uma vaga não conta como candidatura enviada.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="rounded-lg border border-border bg-surface-hover px-3.5 py-2 text-xs font-medium text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void moveCard(pendingConfirm.card, pendingConfirm.toStage, true)}
                className="rounded-lg bg-[#22C55E] px-3.5 py-2 text-xs font-semibold text-[#101318] hover:bg-[#4ADE80]"
              >
                Sim, confirmar envio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-[#191F27] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <span className="text-xs font-semibold text-[#F59E0B]">{selectedCard.company}</span>
                <h3 className="text-lg font-semibold text-foreground">{selectedCard.role}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="rounded-md p-1 text-muted hover:bg-surface-hover hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={saveCardDetails} className="mt-4 space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-muted">Etapa atual</label>
                  <select
                    value={selectedCard.stage}
                    onChange={(e) => void moveCard(selectedCard, e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
                  >
                    {KANBAN_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-muted">Data da inscrição</label>
                  <input
                    type="date"
                    value={selectedCard.appliedAt}
                    onChange={(e) => setSelectedCard({ ...selectedCard, appliedAt: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-muted">Currículo utilizado</label>
                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={selectedCard.resumeUsed}
                      onChange={(e) => setSelectedCard({ ...selectedCard, resumeUsed: e.target.value })}
                      className="w-full rounded-lg border border-border bg-surface-hover py-2 pl-8 pr-3 text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-muted">Salário esperado</label>
                  <input
                    type="text"
                    value={selectedCard.expectedSalary}
                    onChange={(e) => setSelectedCard({ ...selectedCard, expectedSalary: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-muted">Contato do recrutador</label>
                  <div className="relative">
                    <UserCheck className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={selectedCard.recruiterContact}
                      onChange={(e) => setSelectedCard({ ...selectedCard, recruiterContact: e.target.value })}
                      placeholder="Nome, e-mail ou LinkedIn"
                      className="w-full rounded-lg border border-border bg-surface-hover py-2 pl-8 pr-3 text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-muted">Data de acompanhamento</label>
                  <input
                    type="date"
                    value={selectedCard.followUpDate}
                    onChange={(e) => setSelectedCard({ ...selectedCard, followUpDate: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-muted">Próxima ação</label>
                <input
                  type="text"
                  value={selectedCard.nextAction}
                  onChange={(e) => setSelectedCard({ ...selectedCard, nextAction: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="mb-1 block text-muted">Observações</label>
                <textarea
                  rows={3}
                  value={selectedCard.notes}
                  onChange={(e) => setSelectedCard({ ...selectedCard, notes: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface-hover p-3 text-foreground"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {selectedCard.jobUrl ? (
                  <a
                    href={selectedCard.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#F59E0B] hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    Abrir link da vaga
                  </a>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#F59E0B] px-4 py-2 font-semibold text-[#101318] hover:bg-[#FBBF24]"
                >
                  {saving ? "Salvando..." : "Salvar Detalhes"}
                </button>
              </div>
            </form>

            {/* Histórico de alterações */}
            <div className="mt-6 border-t border-border pt-4">
              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <History className="size-3.5 text-[#F59E0B]" />
                Histórico de alterações
              </h4>
              <ul className="space-y-1.5 text-[11px] text-muted">
                {selectedCard.history.length === 0 ? (
                  <li>Sem alterações registradas ainda.</li>
                ) : (
                  selectedCard.history.map((h, i) => (
                    <li key={i} className="rounded border border-border bg-surface-hover/40 px-3 py-1.5">
                      <span className="font-mono text-faint">{h.changedAt.slice(0, 16).replace("T", " ")}</span> ·{" "}
                      {h.fromStage ? `${h.fromStage} → ` : ""}
                      <strong className="text-foreground">{h.toStage}</strong>
                      {h.note ? ` (${h.note})` : ""}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-[#191F27] p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-foreground">Adicionar Candidatura</h3>
            <form onSubmit={createNewCard} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block text-muted">Empresa</label>
                <input
                  type="text"
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-muted">Cargo</label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-muted">Link da vaga</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-border bg-surface-hover px-3 py-2 text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#F59E0B] px-4 py-2 font-semibold text-[#101318]"
                >
                  Criar cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
