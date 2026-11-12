import fs from "node:fs";
import path from "node:path";
import { careerOpsRoot } from "@/lib/career-ops";
import { atomicWrite } from "@/lib/core/safe-write";

export type TelegramEventType =
  | "new_job"
  | "high_match_job"
  | "priority_opportunity"
  | "pending_application"
  | "upcoming_interview"
  | "application_update"
  | "automation_error";

export type NotificationLogItem = {
  id: string;
  eventType: TelegramEventType;
  title: string;
  message: string;
  status: "sent" | "failed" | "skipped";
  error?: string;
  createdAt: string;
};

export function isTelegramConfigured(): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = process.env.TELEGRAM_DEFAULT_CHAT_ID?.trim() ?? "";
  return Boolean(
    token &&
      chatId &&
      !token.includes("seu_bot_token") &&
      !chatId.includes("seu_chat_id"),
  );
}

function logPath(): string {
  return path.join(careerOpsRoot(), "data", "notifications-log.json");
}

export function readNotificationLogs(): NotificationLogItem[] {
  const file = logPath();
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as NotificationLogItem[]) : [];
  } catch {
    return [];
  }
}

function appendLog(item: NotificationLogItem) {
  const logs = readNotificationLogs();
  logs.unshift(item);
  atomicWrite(logPath(), JSON.stringify(logs.slice(0, 100), null, 2));
}

export async function sendTelegramNotification({
  eventType,
  title,
  message,
  chatIdOverride,
}: {
  eventType: TelegramEventType;
  title: string;
  message: string;
  chatIdOverride?: string;
}): Promise<{ ok: boolean; status: "sent" | "failed" | "skipped"; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = chatIdOverride?.trim() || process.env.TELEGRAM_DEFAULT_CHAT_ID?.trim() || "";

  if (!token || !chatId || token.includes("seu_bot_token") || chatId.includes("seu_chat_id")) {
    const entry: NotificationLogItem = {
      id: `notif-${Date.now()}`,
      eventType,
      title,
      message,
      status: "skipped",
      error: "TELEGRAM_BOT_TOKEN ou TELEGRAM_DEFAULT_CHAT_ID não configurado no ambiente do servidor.",
      createdAt: new Date().toISOString(),
    };
    appendLog(entry);
    return { ok: false, status: "skipped", error: entry.error };
  }

  const text = `*CareerOps — ${title}*\n${message}`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const errText = `Telegram HTTP ${res.status}`;
      appendLog({
        id: `notif-${Date.now()}`,
        eventType,
        title,
        message,
        status: "failed",
        error: errText,
        createdAt: new Date().toISOString(),
      });
      return { ok: false, status: "failed", error: errText };
    }

    appendLog({
      id: `notif-${Date.now()}`,
      eventType,
      title,
      message,
      status: "sent",
      createdAt: new Date().toISOString(),
    });
    return { ok: true, status: "sent" };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Erro de rede ao contatar Telegram.";
    appendLog({
      id: `notif-${Date.now()}`,
      eventType,
      title,
      message,
      status: "failed",
      error: errMsg,
      createdAt: new Date().toISOString(),
    });
    return { ok: false, status: "failed", error: errMsg };
  }
}
