import { NextResponse } from "next/server";
import { sendTelegramNotification, type TelegramEventType } from "@/lib/notifications/telegram";
import { checkRateLimit, clientIpFromRequest } from "@/lib/security/rate-limit.mjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = checkRateLimit(`tg:${clientIpFromRequest(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limite de envio atingido. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  let body: { eventType?: TelegramEventType; title?: string; message?: string };
  try {
    body = (await req.json()) as { eventType?: TelegramEventType; title?: string; message?: string };
  } catch {
    body = {};
  }

  const result = await sendTelegramNotification({
    eventType: body.eventType || "priority_opportunity",
    title: body.title || "Teste de Integração Telegram",
    message: body.message || "Conexão com o bot do CareerOps validada com sucesso no backend.",
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
