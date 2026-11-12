import test from "node:test";
import assert from "node:assert/strict";
import {
  buildJobCatalog,
  extractJobDescription,
  extractRequirementsFromReport,
  extractSalaryText,
  inferModality,
} from "../../src/lib/vagas/catalog.mjs";

test("inferModality classifies remote, hybrid and onsite accurately", () => {
  assert.equal(inferModality("Todo Brasil (Home office)"), "Remoto");
  assert.equal(inferModality("Feira de Santana - BA", "Presencial"), "Presencial");
  assert.equal(inferModality("São Paulo - Híbrido"), "Híbrido");
});

test("extractSalaryText extracts disclosed salary or returns Não divulgado", () => {
  assert.equal(extractSalaryText("Salário R$ 3.000-4.000 PJ"), "R$ 3.000-4.000 PJ");
  assert.equal(extractSalaryText("Salário não divulgado"), "Não divulgado");
});

test("buildJobCatalog merges evaluated reports and scan history without inventing salaries", () => {
  const reportMd = `
## B) Requisitos e compatibilidade
| Requisito | Situação | Evidência |
|---|---|---|
| Ensino Médio Completo | Atende | Confirmado |
| Superior (diferencial) | Atende | Em andamento |

## Job Description (archived verbatim)
> Suporte Windows, Linux e Active Directory.
`;
  const catalog = buildJobCatalog({
    applications: [
      { n: 5, company: "Stefanini", role: "ANALISTA SUPORTE JR", score: "4.3/5", status: "Evaluated", pdf: "✅", url: "https://gupy.io/5", location: "Remoto", notes: "CLT" },
    ],
    reportsByNum: { "5": reportMd },
    scanHistoryRows: [
      { url: "https://gupy.io/5", title: "ANALISTA SUPORTE JR", company: "Stefanini", location: "Remoto", first_seen: "2026-11-12", status: "added" },
      { url: "https://gupy.io/99", title: "Help Desk", company: "Acme", location: "Feira de Santana - BA", first_seen: "2026-11-12", status: "added" },
    ],
  });

  assert.equal(catalog.length, 2);
  assert.equal(catalog[0].id, "005");
  assert.equal(catalog[0].mandatoryRequirements.length, 1);
  assert.equal(catalog[0].desirableRequirements.length, 1);
  assert.equal(catalog[0].salaryText, "Não divulgado");
  assert.ok(extractJobDescription(reportMd).includes("Active Directory"));
  assert.equal(extractRequirementsFromReport(reportMd).mandatory.length, 1);
});
