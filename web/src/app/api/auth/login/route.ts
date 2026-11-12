import { NextResponse } from "next/server";
import { getSql, isDatabaseConfigured } from "@/lib/db/neon";
import { sessionCookieOptions, signSessionToken, verifyPassword } from "@/lib/auth/session";
import { checkRateLimit, clientIpFromRequest } from "@/lib/security/rate-limit.mjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = checkRateLimit(`login:${clientIpFromRequest(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Banco Neon não configurado. Defina DATABASE_URL em web/.env.local." },
      { status: 503 },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, email, password_hash, full_name, is_active
      FROM public.users
      WHERE email = ${email}
      LIMIT 1
    `;

    const user = rows[0] as
      | { id: string; email: string; password_hash: string; full_name: string; is_active: boolean }
      | undefined;

    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    await sql`UPDATE public.users SET last_login_at = NOW() WHERE id = ${user.id}`;

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.full_name || "",
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, fullName: user.full_name || "" },
    });
    res.cookies.set({ ...sessionCookieOptions(), value: token });
    return res;
  } catch (err) {
    console.error("[auth/login] erro ao autenticar:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Erro interno ao autenticar." }, { status: 500 });
  }
}
