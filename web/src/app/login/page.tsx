"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles, ArrowRight, AlertCircle, Lock, Mail, User } from "lucide-react";
import { CoMark } from "@/components/co-mark";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login" ? { email, password } : { email, password, fullName },
        ),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(data.error || "Não foi possível autenticar.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro de conexão ao tentar autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101318] px-4 py-12 text-[#F8FAFC]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.08),transparent_45%)]"
      />
      <div className="relative z-10 grid w-full max-w-5xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <CoMark size={38} />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#F8FAFC]">CareerOps</h1>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#F59E0B]">
                Plataforma Inteligente de Carreira
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-[#F8FAFC] sm:text-4xl">
            Sua central de monitoramento de vagas, compatibilidade e candidaturas.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-[#94A3B8]">
            Conectada ao motor local do <span className="font-mono text-[#F8FAFC]">career-ops</span> e ao banco
            PostgreSQL serverless no Neon, com controle de etapas, geração de currículos ATS e alertas no Telegram.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#2A3442] bg-[#191F27] p-4">
              <Sparkles className="mb-2.5 size-5 text-[#F59E0B]" />
              <p className="text-sm font-medium text-[#F8FAFC]">Score 0–5 Real</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Análise transparente sem inventar qualificações.</p>
            </div>
            <div className="rounded-xl border border-[#2A3442] bg-[#191F27] p-4">
              <ShieldCheck className="mb-2.5 size-5 text-[#22C55E]" />
              <p className="text-sm font-medium text-[#F8FAFC]">Humano no Controle</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Envio confirmado apenas por você.</p>
            </div>
            <div className="rounded-xl border border-[#2A3442] bg-[#191F27] p-4">
              <Lock className="mb-2.5 size-5 text-[#F59E0B]" />
              <p className="text-sm font-medium text-[#F8FAFC]">Isolamento RLS</p>
              <p className="mt-1 text-xs text-[#94A3B8]">Sessão segura e preparada para multiusuário.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#2A3442] bg-[#191F27] p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-[#2A3442] pb-4">
            <div>
              <h3 className="text-xl font-semibold text-[#F8FAFC]">
                {mode === "login" ? "Acessar conta" : "Criar conta"}
              </h3>
              <p className="mt-1 text-xs text-[#94A3B8]">
                {mode === "login"
                  ? "Entre com suas credenciais para acessar seu painel."
                  : "Cadastre o primeiro usuário ou nova conta na plataforma."}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-xs font-medium text-[#94A3B8]">
                  Nome completo
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Douglas Emanuel"
                    className="w-full rounded-lg border border-[#2A3442] bg-[#222A35] py-2.5 pl-10 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#F59E0B] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#94A3B8]">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="w-full rounded-lg border border-[#2A3442] bg-[#222A35] py-2.5 pl-10 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[#94A3B8]">
                Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-[#2A3442] bg-[#222A35] py-2.5 pl-10 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-[#101318] transition-colors hover:bg-[#FBBF24] disabled:opacity-60"
            >
              <span>{loading ? "Processando..." : mode === "login" ? "Entrar no CareerOps" : "Criar minha conta"}</span>
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between border-t border-[#2A3442] pt-4 text-xs text-[#94A3B8]">
            <span>{mode === "login" ? "Ainda não tem conta?" : "Já possui conta?"}</span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === "login" ? "register" : "login");
              }}
              className="font-medium text-[#F59E0B] hover:underline"
            >
              {mode === "login" ? "Criar conta" : "Fazer login"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
