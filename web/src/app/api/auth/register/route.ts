import { NextResponse } from "next/server";
import { getSql, isDatabaseConfigured } from "@/lib/db/neon";
import { hashPassword, sessionCookieOptions, signSessionToken } from "@/lib/auth/session";
import { checkRateLimit, clientIpFromRequest } from "@/lib/security/rate-limit.mjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = checkRateLimit(`register:${clientIpFromRequest(req)}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de cadastro. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Banco Neon não configurado. Defina DATABASE_URL em web/.env.local." },
      { status: 503 },
    );
  }

  let body: { email?: unknown; password?: unknown; fullName?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; password?: unknown; fullName?: unknown };
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "A senha deve ter no mínimo 8 caracteres." }, { status: 400 });
  }

  try {
    const sql = getSql();
    const existing = await sql`SELECT id FROM public.users WHERE email = ${email} LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await sql`
      INSERT INTO public.users (email, password_hash, full_name)
      VALUES (${email}, ${passwordHash}, ${fullName})
      RETURNING id, email, full_name
    `;
    const user = inserted[0] as { id: string; email: string; full_name: string };

    await sql`
      INSERT INTO public.profiles (id, email, full_name)
      VALUES (${user.id}, ${user.email}, ${user.full_name})
      ON CONFLICT (id) DO NOTHING
    `;
    await sql`
      INSERT INTO public.user_preferences (user_id)
      VALUES (${user.id})
      ON CONFLICT (user_id) DO NOTHING
    `;

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
    console.error("[auth/register] erro ao registrar:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Erro interno ao criar conta." }, { status: 500 });
  }
}
