export const KANBAN_STAGES = [
  { id: "vaga_identificada", label: "1. Vaga identificada", trackerStatus: "Evaluated" },
  { id: "em_analise", label: "2. Em análise", trackerStatus: "Evaluated" },
  { id: "curriculo_preparado", label: "3. Currículo preparado", trackerStatus: "Evaluated" },
  { id: "candidatura_enviada", label: "4. Candidatura enviada", trackerStatus: "Applied" },
  { id: "triagem", label: "5. Triagem", trackerStatus: "Responded" },
  { id: "entrevista_rh", label: "6. Entrevista RH", trackerStatus: "Interview" },
  { id: "entrevista_tecnica", label: "7. Entrevista técnica", trackerStatus: "Interview" },
  { id: "proposta_recebida", label: "8. Proposta recebida", trackerStatus: "Offer" },
  { id: "aprovado", label: "9. Aprovado", trackerStatus: "Hired" },
  { id: "reprovado", label: "10. Reprovado", trackerStatus: "Rejected" },
  { id: "desistencia", label: "11. Desistência", trackerStatus: "Discarded" },
];

export const STAGE_IDS = new Set(KANBAN_STAGES.map((s) => s.id));

export function mapTrackerStatusToKanbanStage(trackerStatus = "", hasPdf = false) {
  const s = String(trackerStatus || "").trim().toLowerCase();
  if (s === "applied") return "candidatura_enviada";
  if (s === "responded" || s === "assessment") return "triagem";
  if (s === "interview") return "entrevista_rh";
  if (s === "offer") return "proposta_recebida";
  if (s === "hired") return "aprovado";
  if (s === "rejected") return "reprovado";
  if (s === "discarded" || s === "skip") return "desistencia";
  return hasPdf ? "curriculo_preparado" : "em_analise";
}

export function mapKanbanStageToTrackerStatus(stageId) {
  const found = KANBAN_STAGES.find((s) => s.id === stageId);
  return found ? found.trackerStatus : "Evaluated";
}

/**
 * Regra estrita: encontrar/analisar vaga não significa candidatura enviada.
 * Só permite entrar em `candidatura_enviada` com confirmação explícita do usuário.
 */
export function validateStageTransition({ fromStage, toStage, confirmApplied }) {
  if (!STAGE_IDS.has(toStage)) {
    return { ok: false, error: `Etapa inválida: ${toStage}` };
  }
  if (toStage === "candidatura_enviada" && fromStage !== "candidatura_enviada" && confirmApplied !== true) {
    return {
      ok: false,
      requiresConfirmation: true,
      error: "Confirmação obrigatória: confirme que você realmente enviou esta candidatura antes de movê-la para 'Candidatura enviada'.",
    };
  }
  return { ok: true };
}
