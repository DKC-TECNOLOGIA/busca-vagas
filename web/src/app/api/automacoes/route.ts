import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { NextResponse } from "next/server";
import { careerOpsRoot, rootScript } from "@/lib/career-ops";
import { atomicWrite } from "@/lib/core/safe-write";
import {
  automationRunsPath,
  readAutomationRuns,
  type AutomationRunRecord,
} from "@/lib/automacoes/loader";
import { sendTelegramNotification } from "@/lib/notifications/telegram";
import { checkRateLimit, clientIpFromRequest } from "@/lib/security/rate-limit.mjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = checkRateLimit(`automacoes:${clientIpFromRequest(req)}`, { limit: 15, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições em sequência. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const root = careerOpsRoot();

  if (action === "run_scan") {
    const scanScript = rootScript("scan");
    if (!fs.existsSync(scanScript)) {
      return NextResponse.json({ error: "Script scan.mjs não encontrado." }, { status: 500 });
    }

    const runId = `run-${crypto.randomUUID().slice(0, 8)}`;
    const record: AutomationRunRecord = {
      id: runId,
      runType: "scan.mjs",
      status: "running",
      startedAt: new Date().toISOString(),
      summary: "Execução manual disparada em segundo plano",
    };

    const runs = readAutomationRuns();
    runs.unshift(record);
    atomicWrite(automationRunsPath(), JSON.stringify(runs.slice(0, 50), null, 2));

    // Background execution without blocking the HTTP response
    const child = spawn(process.execPath, [scanScript, "--quiet"], {
      cwd: root,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("close", (code) => {
      const currentRuns = readAutomationRuns();
      const idx = currentRuns.findIndex((r) => r.id === runId);
      const finishedAt = new Date().toISOString();
      const ok = code === 0;
      const summaryLine = stdout
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .slice(-3)
        .join(" | ")
        .slice(0, 280);

      if (idx !== -1) {
        currentRuns[idx] = {
          ...currentRuns[idx],
          status: ok ? "completed" : "failed",
          finishedAt,
          summary: summaryLine || (ok ? "Varredura concluída." : "Falha na varredura."),
          error: ok ? undefined : (stderr.trim().slice(0, 300) || `Código de saída ${code}`),
        };
        atomicWrite(automationRunsPath(), JSON.stringify(currentRuns.slice(0, 50), null, 2));
      }

      if (!ok) {
        void sendTelegramNotification({
          eventType: "automation_error",
          title: "Erro na Automação (scan.mjs)",
          message: `A execução ${runId} falhou com código ${code}.`,
        });
      }
    });

    return NextResponse.json({ ok: true, run: record }, { status: 202 });
  }

  if (action === "toggle_source") {
    const sourceName = typeof body.name === "string" ? body.name.trim() : "";
    const portalsPath = path.join(root, "portals.yml");
    if (!sourceName || !fs.existsSync(portalsPath)) {
      return NextResponse.json({ error: "Fonte ou portals.yml não encontrado." }, { status: 400 });
    }
    const doc = (yaml.load(fs.readFileSync(portalsPath, "utf8")) as Record<string, any>) || {};
    const list = Array.isArray(doc.tracked_companies) ? doc.tracked_companies : [];
    const target = list.find((c: Record<string, any>) => String(c.name) === sourceName);
    if (!target) {
      return NextResponse.json({ error: "Fonte não encontrada em portals.yml." }, { status: 404 });
    }
    target.enabled = target.enabled === false;
    atomicWrite(portalsPath, yaml.dump(doc, { lineWidth: 120, noRefs: true }));
    return NextResponse.json({ ok: true, enabled: target.enabled });
  }

  if (action === "update_filters") {
    const portalsPath = path.join(root, "portals.yml");
    if (!fs.existsSync(portalsPath)) {
      return NextResponse.json({ error: "portals.yml não encontrado." }, { status: 404 });
    }
    const doc = (yaml.load(fs.readFileSync(portalsPath, "utf8")) as Record<string, any>) || {};
    if (Array.isArray(body.positive)) {
      doc.title_filter = doc.title_filter || {};
      doc.title_filter.positive = body.positive.map((s) => String(s).trim()).filter(Boolean);
    }
    if (Array.isArray(body.negative)) {
      doc.title_filter = doc.title_filter || {};
      doc.title_filter.negative = body.negative.map((s) => String(s).trim()).filter(Boolean);
    }
    if (Array.isArray(body.locations)) {
      doc.location_filter = doc.location_filter || {};
      doc.location_filter.allow = body.locations.map((s) => String(s).trim()).filter(Boolean);
    }
    atomicWrite(portalsPath, yaml.dump(doc, { lineWidth: 120, noRefs: true }));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
