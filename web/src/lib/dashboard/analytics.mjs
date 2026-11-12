// Pure aggregation helpers for CareerOps Dashboard (0 mocks, 100% real data)

const TECH_PATTERNS = [
  { name: "Windows", regex: /\bwindows\b/i },
  { name: "Redes / TCP-IP", regex: /\b(redes|tcp\/ip|wi-?fi|vpn|dns|dhcp)\b/i },
  { name: "SQL / Banco de Dados", regex: /\b(sql|oracle|postgresql|mysql|dbeaver)\b/i },
  { name: "Microsoft 365 / Office", regex: /\b(microsoft 365|office 365|m365|pacote office|excel)\b/i },
  { name: "Active Directory", regex: /\b(active directory|\bad\b)\b/i },
  { name: "ITSM / Chamados", regex: /\b(itsm|service desk|help desk|milvus|glpi|jira|zendesk|freshdesk|sla|itil)\b/i },
  { name: "Linux", regex: /\blinux\b/i },
  { name: "ERP / TOTVS", regex: /\b(erp|totvs|winthor|protheus|rm|omie|sap)\b/i },
  { name: "Hardware / Impressoras", regex: /\b(hardware|impressoras|pdv|perif[eé]ricos|notebooks|desktops)\b/i },
  { name: "Cloud (AWS/Azure)", regex: /\b(aws|azure|gcp|cloud)\b/i },
  { name: "Python / Automação", regex: /\b(python|rpa|automa[cç][aã]o|power automate|uipath)\b/i },
];

/**
 * @param {string} content
 * @returns {Array<Record<string, string>>}
 */
export function parseTsvRows(content) {
  if (!content || typeof content !== "string") return [];
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const raw = (cols[j] ?? "").trim();
      obj[headers[j]] = raw.startsWith("'") ? raw.slice(1) : raw;
    }
    rows.push(obj);
  }
  return rows;
}

export function inferSeniority(role, reportContent = "") {
  const combined = `${role || ""} ${reportContent || ""}`.toLowerCase();
  if (/\best[aá]gio|estagi[aá]ri[oa]|intern\b/i.test(combined)) return "Estágio";
  if (/\bs[eê]nior|\bsr\b|especialista|lead\b/i.test(role || "")) return "Sênior";
  if (/\bpleno\b|\bn2\b/i.test(role || "")) return "Pleno";
  if (/\bj[uú]nior|\bjr\b|\bn1\b|assistente|auxiliar/i.test(role || "")) return "Júnior";
  if (/senioridade\s*\|\s*j[uú]nior/i.test(reportContent || "")) return "Júnior";
  if (/senioridade\s*\|\s*pleno/i.test(reportContent || "")) return "Pleno";
  if (/senioridade\s*\|\s*s[eê]nior/i.test(reportContent || "")) return "Sênior";
  return "Não especificada";
}

export function parseNumericScore(scoreStr) {
  if (typeof scoreStr === "number" && Number.isFinite(scoreStr)) return scoreStr;
  if (!scoreStr || typeof scoreStr !== "string") return null;
  const normalized = scoreStr.replace(",", ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*5)?/);
  if (!match) return null;
  const val = Number(match[1]);
  return Number.isFinite(val) && val >= 0 && val <= 5 ? val : null;
}

export function extractTechnologies(texts) {
  const counts = new Map();
  for (const text of texts) {
    if (!text) continue;
    for (const tech of TECH_PATTERNS) {
      if (tech.regex.test(text)) {
        counts.set(tech.name, (counts.get(tech.name) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

const APPLIED_STATUSES = new Set(["applied", "responded", "assessment", "interview", "offer", "hired"]);
const ACTIVE_PROCESS_STATUSES = new Set(["applied", "responded", "assessment", "interview"]);

/**
 * @param {object} params
 * @param {Array<Record<string, string>>} [params.scanHistoryRows]
 * @param {number} [params.pendingCount]
 * @param {Array<Record<string, any>>} [params.applications]
 * @param {Record<string, string>} [params.reportsByNum]
 * @param {number} [params.activeInterviewsCount]
 * @param {Array<{ label: string; value: number; meta?: string }>} [params.interviewTimeline]
 */
export function computeDashboardMetrics({
  scanHistoryRows = [],
  pendingCount = 0,
  applications = [],
  reportsByNum = {},
  activeInterviewsCount = 0,
  interviewTimeline = [],
}) {
  const totalDiscovered = scanHistoryRows.length;
  const newJobsCount =
    pendingCount > 0
      ? pendingCount
      : scanHistoryRows.filter((r) => r.status === "added").length;

  const evaluatedApps = applications.map((app) => {
    const score = parseNumericScore(app.score);
    const reportText = reportsByNum[String(app.n)] ?? "";
    const statusLower = String(app.status || "").trim().toLowerCase();
    const seniority = inferSeniority(app.role, reportText);
    return {
      ...app,
      numericScore: score,
      statusLower,
      seniority,
      reportText,
    };
  });

  const compatibleJobs = evaluatedApps.filter((a) => (a.numericScore ?? 0) >= 3.0);
  const sentApplications = evaluatedApps.filter((a) => APPLIED_STATUSES.has(a.statusLower));
  const activeProcesses = evaluatedApps.filter((a) => ACTIVE_PROCESS_STATUSES.has(a.statusLower));
  const interviewStatusCount = evaluatedApps.filter((a) => a.statusLower === "interview").length;
  const scheduledInterviews = Math.max(activeInterviewsCount, interviewStatusCount);

  const progressedCount = evaluatedApps.filter((a) =>
    ["responded", "assessment", "interview", "offer", "hired"].includes(a.statusLower),
  ).length;
  const conversionRate =
    sentApplications.length > 0
      ? Number(((progressedCount / sentApplications.length) * 100).toFixed(1))
      : 0;

  const validScores = evaluatedApps
    .map((a) => a.numericScore)
    .filter((s) => typeof s === "number");
  const avgScore =
    validScores.length > 0
      ? Number((validScores.reduce((acc, s) => acc + s, 0) / validScores.length).toFixed(2))
      : 0;

  // Chart 1: Vagas encontradas por período (first_seen)
  const periodMap = new Map();
  for (const row of scanHistoryRows) {
    const dateKey = (row.first_seen || row.posted_at || "").slice(0, 10);
    if (!dateKey) continue;
    periodMap.set(dateKey, (periodMap.get(dateKey) ?? 0) + 1);
  }
  const jobsByPeriod = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-10)
    .map(([date, count]) => ({ date, count }));

  // Chart 2: Candidaturas por status
  const statusMap = new Map();
  for (const app of evaluatedApps) {
    const label = app.status || "Evaluated";
    statusMap.set(label, (statusMap.get(label) ?? 0) + 1);
  }
  const applicationsByStatus = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Chart 3: Compatibilidade por empresa (média por empresa)
  const companyMap = new Map();
  for (const app of evaluatedApps) {
    if (typeof app.numericScore !== "number") continue;
    const company = app.company && app.company !== "?" ? app.company : "Não identificada";
    const current = companyMap.get(company) ?? { total: 0, count: 0 };
    current.total += app.numericScore;
    current.count += 1;
    companyMap.set(company, current);
  }
  const compatibilityByCompany = Array.from(companyMap.entries())
    .map(([company, { total, count }]) => ({
      company,
      avgScore: Number((total / count).toFixed(2)),
      count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8);

  // Chart 4: Distribuição por senioridade
  const seniorityMap = new Map();
  for (const app of evaluatedApps) {
    seniorityMap.set(app.seniority, (seniorityMap.get(app.seniority) ?? 0) + 1);
  }
  const seniorityDistribution = Array.from(seniorityMap.entries())
    .map(([seniority, count]) => ({ seniority, count }))
    .sort((a, b) => b.count - a.count);

  // Chart 6: Principais tecnologias exigidas
  const topTechnologies = extractTechnologies(
    evaluatedApps.map((a) => `${a.role} ${a.notes} ${a.reportText}`),
  );

  // Recommended opportunities (score >= 3.0, ordered desc)
  const recommendedJobs = evaluatedApps
    .filter((a) => typeof a.numericScore === "number")
    .sort((a, b) => (b.numericScore ?? 0) - (a.numericScore ?? 0))
    .slice(0, 6)
    .map((a) => ({
      n: a.n,
      company: a.company,
      role: a.role,
      score: a.numericScore,
      status: a.status,
      location: a.location || "Não informado",
      hasPdf: Boolean(a.pdf && a.pdf.includes("✅")),
      url: a.url || "",
      reportPath: a.reportPath || "",
      notes: a.notes || "",
      seniority: a.seniority,
    }));

  return {
    kpis: {
      totalDiscovered,
      newJobsCount,
      compatibleJobsCount: compatibleJobs.length,
      sentApplicationsCount: sentApplications.length,
      scheduledInterviewsCount: scheduledInterviews,
      activeProcessesCount: activeProcesses.length,
      conversionRate,
      avgScore,
    },
    charts: {
      jobsByPeriod,
      applicationsByStatus,
      compatibilityByCompany,
      seniorityDistribution,
      interviewEvolution: interviewTimeline,
      topTechnologies,
    },
    recommendedJobs,
  };
}
