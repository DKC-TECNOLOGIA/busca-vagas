import test from "node:test";
import assert from "node:assert/strict";
import { computeDashboardMetrics, parseTsvRows } from "../../src/lib/dashboard/analytics.mjs";

test("parseTsvRows parses scan-history TSV with leading spreadsheet quotes", () => {
  const tsv = [
    "url\tfirst_seen\tportal\ttitle\tcompany\tstatus",
    "https://example.com/1\t2026-11-12\tGupy\tAnalista Suporte Jr\tStefanini\tadded",
    "https://example.com/2\t2026-11-12\tGupy\t'Gerente TI\tEmpresa X\tskipped_title",
  ].join("\n");

  const rows = parseTsvRows(tsv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].company, "Stefanini");
  assert.equal(rows[1].title, "Gerente TI");
});

test("computeDashboardMetrics calculates 8 KPIs and 6 chart series from real data without fabrication", () => {
  const result = computeDashboardMetrics({
    scanHistoryRows: [
      { url: "u1", first_seen: "2026-11-12", status: "added" },
      { url: "u2", first_seen: "2026-11-12", status: "skipped_title" },
      { url: "u3", first_seen: "2026-11-11", status: "added" },
    ],
    pendingCount: 0,
    applications: [
      { n: 1, company: "Stefanini", role: "ANALISTA SUPORTE JR", score: "4.3/5", status: "Evaluated", pdf: "✅", url: "u1", notes: "Windows Linux" },
      { n: 2, company: "Gera", role: "Analista de Suporte - JR", score: "3.5/5", status: "Applied", pdf: "✅", url: "u3", notes: "SQL Oracle" },
      { n: 3, company: "Atento", role: "Especialista Chat", score: "2.7/5", status: "Evaluated", pdf: "❌", url: "u4", notes: "" },
    ],
    reportsByNum: {
      "1": "Suporte Windows, Linux, Active Directory e Redes TCP/IP",
      "2": "Consultas SQL e Oracle no banco",
      "3": "Atendimento chat",
    },
    activeInterviewsCount: 0,
    interviewTimeline: [],
  });

  assert.equal(result.kpis.totalDiscovered, 3);
  assert.equal(result.kpis.newJobsCount, 2);
  assert.equal(result.kpis.compatibleJobsCount, 2);
  assert.equal(result.kpis.sentApplicationsCount, 1);
  assert.equal(result.kpis.scheduledInterviewsCount, 0);
  assert.equal(result.kpis.activeProcessesCount, 1);
  assert.equal(result.kpis.conversionRate, 0);
  assert.equal(result.kpis.avgScore, 3.5);
  assert.equal(result.charts.jobsByPeriod.length, 2);
  assert.equal(result.charts.compatibilityByCompany[0].company, "Stefanini");
  assert.ok(result.charts.topTechnologies.some((t) => t.name === "Windows"));
  assert.equal(result.recommendedJobs[0].company, "Stefanini");
});
