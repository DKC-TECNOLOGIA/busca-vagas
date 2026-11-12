import test from "node:test";
import assert from "node:assert/strict";
import {
  KANBAN_STAGES,
  mapTrackerStatusToKanbanStage,
  validateStageTransition,
} from "../../src/lib/candidaturas/stages.mjs";

test("KANBAN_STAGES contains all 11 required stages", () => {
  assert.equal(KANBAN_STAGES.length, 11);
});

test("validateStageTransition blocks moving to candidatura_enviada without explicit user confirmation", () => {
  const blocked = validateStageTransition({
    fromStage: "curriculo_preparado",
    toStage: "candidatura_enviada",
    confirmApplied: false,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.requiresConfirmation, true);

  const allowed = validateStageTransition({
    fromStage: "curriculo_preparado",
    toStage: "candidatura_enviada",
    confirmApplied: true,
  });
  assert.equal(allowed.ok, true);
});

test("mapTrackerStatusToKanbanStage separates Evaluated with/without PDF from Applied", () => {
  assert.equal(mapTrackerStatusToKanbanStage("Evaluated", true), "curriculo_preparado");
  assert.equal(mapTrackerStatusToKanbanStage("Evaluated", false), "em_analise");
  assert.equal(mapTrackerStatusToKanbanStage("Applied", true), "candidatura_enviada");
});
