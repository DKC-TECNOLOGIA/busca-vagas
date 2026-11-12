import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { careerOpsRoot, readApplications } from "@/lib/career-ops";
import { parseTsvRows } from "@/lib/dashboard/analytics.mjs";

export type CvVersionEntry = {
  reportNum: string;
  company: string;
  role: string;
  pdfFileName: string;
  pdfPath: string;
  htmlExists: boolean;
  generatedAt: string;
  sizeKb: number;
};

export type CurriculosData = {
  cvMarkdown: string;
  profile: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    targetRoles: string[];
    headline: string;
  };
  versions: CvVersionEntry[];
  evaluatedJobs: Array<{
    n: string;
    company: string;
    role: string;
    score: string;
    hasPdf: boolean;
  }>;
};

function readSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function loadCurriculosData(): CurriculosData {
  const root = careerOpsRoot();
  const cvMarkdown = readSafe(path.join(root, "cv.md"));
  const profileRaw = readSafe(path.join(root, "config", "profile.yml"));

  let parsedProfile: Record<string, any> = {};
  try {
    parsedProfile = (yaml.load(profileRaw) as Record<string, any>) || {};
  } catch {
    parsedProfile = {};
  }

  const candidate = parsedProfile.candidate ?? {};
  const targetRoles = Array.isArray(parsedProfile.target_roles?.primary)
    ? parsedProfile.target_roles.primary.map(String)
    : [];

  const applications = readApplications();
  const appByNum = new Map(applications.map((a) => [String(a.n).padStart(3, "0"), a]));

  const pdfIndexRaw = readSafe(path.join(root, "data", "pdf-index.tsv"));
  const pdfRows = parseTsvRows(pdfIndexRaw);
  const versions: CvVersionEntry[] = [];

  for (const row of pdfRows) {
    const reportNum = String(row.report_num || row.report || "").padStart(3, "0");
    const relPdf = row.pdf_path || row.path || row.file || "";
    if (!relPdf) continue;
    const absPdf = path.isAbsolute(relPdf) ? relPdf : path.join(root, relPdf);
    if (!fs.existsSync(absPdf)) continue;
    const stat = fs.statSync(absPdf);
    const absHtml = absPdf.replace(/\.pdf$/i, ".html");
    const app = appByNum.get(reportNum);

    versions.push({
      reportNum: reportNum === "000" ? "—" : reportNum,
      company: app?.company || row.company || "—",
      role: app?.role || row.role || path.basename(absPdf, ".pdf"),
      pdfFileName: path.basename(absPdf),
      pdfPath: relPdf.replace(/\\/g, "/"),
      htmlExists: fs.existsSync(absHtml),
      generatedAt: row.date || stat.mtime.toISOString().slice(0, 10),
      sizeKb: Math.max(1, Math.round(stat.size / 1024)),
    });
  }

  // Also scan output/pdf for any PDF not listed in pdf-index.tsv
  const pdfDir = path.join(root, "output", "pdf");
  if (fs.existsSync(pdfDir)) {
    const knownFiles = new Set(versions.map((v) => v.pdfFileName));
    for (const file of fs.readdirSync(pdfDir)) {
      if (!file.endsWith(".pdf") || knownFiles.has(file)) continue;
      const absPdf = path.join(pdfDir, file);
      const stat = fs.statSync(absPdf);
      versions.push({
        reportNum: "—",
        company: "Personalizado",
        role: file.replace(/^cv-douglas-|\.pdf$/g, "").replace(/-/g, " "),
        pdfFileName: file,
        pdfPath: `output/pdf/${file}`,
        htmlExists: fs.existsSync(absPdf.replace(/\.pdf$/i, ".html")),
        generatedAt: stat.mtime.toISOString().slice(0, 10),
        sizeKb: Math.max(1, Math.round(stat.size / 1024)),
      });
    }
  }

  versions.sort((a, b) => b.reportNum.localeCompare(a.reportNum));

  return {
    cvMarkdown,
    profile: {
      fullName: String(candidate.full_name || ""),
      title: String(candidate.title || ""),
      email: String(candidate.email || ""),
      phone: String(candidate.phone || ""),
      location: String(candidate.location || ""),
      linkedin: String(candidate.linkedin?.url || ""),
      targetRoles,
      headline: String(parsedProfile.narrative?.headline || ""),
    },
    versions,
    evaluatedJobs: applications.map((a) => ({
      n: String(a.n).padStart(3, "0"),
      company: a.company,
      role: a.role,
      score: a.score,
      hasPdf: Boolean(a.pdf && a.pdf.includes("✅")),
    })),
  };
}
