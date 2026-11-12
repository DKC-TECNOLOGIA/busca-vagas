import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCompatibility } from "../../src/lib/compatibility/engine.mjs";

const SAMPLE_CV = `
Assistente de TI N1 - Atacadão São Roque (Maio de 2026 - atual)
Suporte N1/N2 a mais de 40 PDVs em seis filiais, média de 178 chamados/mês via Milvus.
Windows, Linux, redes TCP/IP, impressoras, Microsoft 365, Active Directory básico, TOTVS WinThor, Oracle SQL e DBeaver.
Ensino médio completo. Graduação em Jogos Digitais (Unifaticie, 3º semestre).
Cursos: Analista de Redes em andamento, SQL/Oracle.
`;

test("evaluateCompatibility scores Junior N1 remote role high without fabricating skills", () => {
  const res = evaluateCompatibility({
    title: "ANALISTA SUPORTE JR",
    company: "Stefanini",
    location: "Remoto",
    description: "Suporte N1 em Windows, Linux, Active Directory, redes TCP/IP, Microsoft 365 e ITSM. Ensino médio completo.",
    cvText: SAMPLE_CV,
  });

  assert.ok(res.score >= 3.8, `Expected score >= 3.8, got ${res.score}`);
  assert.equal(res.dimensions.length, 10);
  assert.ok(res.metRequirements.length >= 3);
  assert.ok(res.risks.some((r) => r.includes("Salário não divulgado")));
});

test("evaluateCompatibility flags Senior fluent Spanish role as low fit with clear gaps", () => {
  const res = evaluateCompatibility({
    title: "ANALISTA DE SUPORTE SÊNIOR BILÍNGUE ESPANHOL",
    company: "Stefanini",
    location: "São Paulo",
    description: "Exige espanhol fluente, ensino superior completo e experiência sênior em SAP Basis.",
    cvText: SAMPLE_CV,
  });

  assert.ok(res.score < 3.0, `Expected score < 3.0, got ${res.score}`);
  assert.ok(res.missingRequirements.some((m) => m.includes("espanhol") || m.includes("idiomas") || m.includes("Fluência")));
  assert.ok(res.missingRequirements.some((m) => m.includes("Ensino Superior completo")));
});
