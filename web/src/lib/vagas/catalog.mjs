import crypto from "node:crypto";
import { inferSeniority, parseNumericScore } from "../dashboard/analytics.mjs";

const TECH_TAGS = [
  "Windows",
  "Linux",
  "SQL",
  "Oracle",
  "PostgreSQL",
  "Redes",
  "TCP/IP",
  "Active Directory",
  "Microsoft 365",
  "Milvus",
  "ITSM",
  "ITIL",
  "TOTVS",
  "WinThor",
  "AWS",
  "Python",
  "Excel",
];

export function stableJobId(url, trackerNum = null) {
  if (trackerNum !== null && trackerNum !== undefined && String(trackerNum).trim() !== "") {
    return String(trackerNum).padStart(3, "0");
  }
  const hash = crypto.createHash("sha1").update(String(url || "")).digest("hex").slice(0, 10);
  return `job-${hash}`;
}

export function inferModality(location = "", title = "", reportContent = "") {
  const text = `${location} ${title} ${reportContent}`.toLowerCase();
  if (/\b(remoto|remote|home office|home-office|todo brasil|work from home)\b/i.test(text)) {
    if (/\b(h[ií]brido|hybrid|presencial)\b/i.test(location.toLowerCase())) {
      return "Híbrido";
    }
    return "Remoto";
  }
  if (/\b(h[ií]brido|hybrid)\b/i.test(text)) return "Híbrido";
  if (/\b(presencial|on-site|onsite|unidade )\b/i.test(text)) return "Presencial";
  return "Não informado";
}

export function extractSalaryText(notes = "", reportContent = "") {
  const combined = `${notes}\n${reportContent}`;
  const match = combined.match(/R\$\s*[\d.,]+(?:\s*(?:a|-|–|até)\s*(?:R\$\s*)?[\d.,]+)?(?:\s*(?:CLT|PJ|bruto|m[eê]s|\/m[eê]s))?/i);
  if (match) return match[0].trim();
  if (/sal[aá]rio\s*(?:n[aã]o divulgado|a combinar)/i.test(combined) || /salary:\s*not disclosed/i.test(combined)) {
    return "Não divulgado";
  }
  return "Não divulgado";
}

export function extractJobDescription(reportContent = "") {
  if (!reportContent) return "";
  const match = reportContent.match(/##\s*Job Description[^\n]*\n([\s\S]*?)(?:\n##\s+|$)/i);
  if (!match) return "";
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n")
    .trim();
}

export function extractRequirementsFromReport(reportContent = "") {
  const mandatory = [];
  const desirable = [];
  const sectionMatch = reportContent.match(/##\s*B\)\s*Requisitos[^\n]*\n([\s\S]*?)(?:\n##\s+|$)/i);
  if (sectionMatch) {
    const lines = sectionMatch[1].split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith("|") || line.includes("---")) continue;
      const cols = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 2 && cols[0].toLowerCase() !== "requisito") {
        const reqName = cols[0];
        const status = cols[1];
        const evidence = cols[2] || "";
        if (/diferencial|desej[aá]vel/i.test(reqName)) {
          desirable.push({ label: reqName, status, evidence });
        } else {
          mandatory.push({ label: reqName, status, evidence });
        }
      }
    }
  }
  return { mandatory, desirable };
}

export function detectTechnologies(text = "") {
  const found = [];
  for (const tag of TECH_TAGS) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) {
      found.push(tag);
    }
  }
  return found;
}

/**
 * @param {object} params
 * @param {Array<Record<string, string>>} [params.scanHistoryRows]
 * @param {Array<Record<string, any>>} [params.applications]
 * @param {Record<string, string>} [params.reportsByNum]
 * @param {Record<string, string>} [params.discardReasonsByUrl]
 * @param {Record<string, { isFavorite?: boolean; isSaved?: boolean; isDiscarded?: boolean; discardReason?: string }>} [params.userState]
 */
export function buildJobCatalog({
  scanHistoryRows = [],
  applications = [],
  reportsByNum = {},
  discardReasonsByUrl = {},
  userState = {},
}) {
  const byUrl = new Map();

  for (const app of applications) {
    const url = (app.url || "").trim();
    const num = String(app.n);
    const id = stableJobId(url || `app-${num}`, num);
    const reportContent = reportsByNum[num] || "";
    const state = userState[id] || userState[url] || {};
    const { mandatory, desirable } = extractRequirementsFromReport(reportContent);
    const description = extractJobDescription(reportContent);
    const techText = `${app.role} ${app.notes} ${description} ${reportContent}`;
    const score = parseNumericScore(app.score);
    const statusLower = String(app.status || "").toLowerCase();

    let opportunityStatus = "Avaliada";
    if (state.isDiscarded || statusLower === "discarded" || statusLower === "skip") {
      opportunityStatus = "Descartada";
    } else if (["applied", "responded", "assessment", "interview", "offer", "hired"].includes(statusLower)) {
      opportunityStatus = "Candidatura enviada";
    } else if (state.isSaved) {
      opportunityStatus = "Salva";
    }

    const item = {
      id,
      trackerNum: num,
      company: app.company || "Não identificada",
      role: app.role || "Sem título",
      description,
      mandatoryRequirements: mandatory,
      desirableRequirements: desirable,
      technologies: detectTechnologies(techText),
      location: app.location || "Não informado",
      modality: inferModality(app.location, app.role, reportContent),
      seniority: inferSeniority(app.role, reportContent),
      salaryText: extractSalaryText(app.notes, reportContent),
      url,
      discoveredAt: app.date || "",
      postedAt: app.date || "",
      score,
      status: opportunityStatus,
      trackerStatus: app.status || "Evaluated",
      hasPdf: Boolean(app.pdf && app.pdf.includes("✅")),
      reportPath: app.reportPath || "",
      notes: app.notes || "",
      isFavorite: Boolean(state.isFavorite),
      isSaved: Boolean(state.isSaved),
      isDiscarded: Boolean(state.isDiscarded || statusLower === "discarded" || statusLower === "skip"),
      discardReason: state.discardReason || "",
    };

    if (url) byUrl.set(url, item);
    else byUrl.set(id, item);
  }

  for (const row of scanHistoryRows) {
    const url = (row.url || "").trim();
    if (!url) continue;
    if (byUrl.has(url)) {
      const existing = byUrl.get(url);
      if (!existing.postedAt && row.posted_at) existing.postedAt = row.posted_at;
      if (!existing.discoveredAt && row.first_seen) existing.discoveredAt = row.first_seen;
      if (existing.location === "Não informado" && row.location) {
        existing.location = row.location;
        existing.modality = inferModality(row.location, existing.role, "");
      }
      continue;
    }

    const id = stableJobId(url, null);
    const state = userState[id] || userState[url] || {};
    const discardReason = state.discardReason || discardReasonsByUrl[url] || "";
    const isDiscarded =
      Boolean(state.isDiscarded) ||
      Boolean(discardReason) ||
      row.status === "skipped_title";

    let opportunityStatus = "Nova";
    if (isDiscarded) opportunityStatus = "Descartada";
    else if (state.isSaved) opportunityStatus = "Salva";

    byUrl.set(url, {
      id,
      trackerNum: null,
      company: row.company || "Não identificada",
      role: row.title || "Sem título",
      description: "",
      mandatoryRequirements: [],
      desirableRequirements: [],
      technologies: detectTechnologies(row.title || ""),
      location: row.location || "Não informado",
      modality: inferModality(row.location, row.title, ""),
      seniority: inferSeniority(row.title, ""),
      salaryText: "Não divulgado",
      url,
      discoveredAt: row.first_seen || "",
      postedAt: row.posted_at || row.first_seen || "",
      score: null,
      status: opportunityStatus,
      trackerStatus: null,
      hasPdf: false,
      reportPath: "",
      notes: row.portal ? `Fonte: ${row.portal}` : "",
      isFavorite: Boolean(state.isFavorite),
      isSaved: Boolean(state.isSaved),
      isDiscarded,
      discardReason:
        discardReason ||
        (row.status === "skipped_title" ? "Filtrada por título no scanner" : ""),
    });
  }

  return Array.from(byUrl.values()).sort((a, b) => {
    const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.isDiscarded !== b.isDiscarded) return a.isDiscarded ? 1 : -1;
    return (b.postedAt || b.discoveredAt || "").localeCompare(a.postedAt || a.discoveredAt || "");
  });
}
