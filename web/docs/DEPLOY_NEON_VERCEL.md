# Guia de Deploy e Segurança — CareerOps (Neon + Vercel + Telegram)

## 1. Banco de Dados (Neon PostgreSQL)
1. Crie um projeto no [Neon](https://neon.tech).
2. Execute a migration [001_initial_schema.sql](../db/migrations/001_initial_schema.sql) no SQL Editor do Neon (cria `users`, as 18 tabelas de domínio, triggers de auditoria e políticas RLS).
3. Copie a connection string (`postgresql://...?sslmode=require`) para `DATABASE_URL`.

## 2. Variáveis de Ambiente (`web/.env.local` ou Vercel)
Baseado em [web/.env.example](../.env.example):
- `DATABASE_URL`: String de conexão do Neon (apenas servidor).
- `AUTH_SECRET`: Chave aleatória com 32+ caracteres para assinatura HMAC-SHA256 dos cookies `HttpOnly`.
- `TELEGRAM_BOT_TOKEN`: Token do bot criado no `@BotFather` (apenas servidor).
- `TELEGRAM_DEFAULT_CHAT_ID`: Seu `chat_id` no Telegram (apenas servidor).
- `CAREER_OPS_ROOT`: Caminho do diretório raiz de dados (padrão `..` quando rodando localmente dentro do repositório).

> **Segurança:** Nunca use o prefixo `NEXT_PUBLIC_` em nenhuma dessas variáveis. Todas são lidas exclusivamente em Route Handlers e Server Components.

## 3. Execução Local Integrada ao Motor `career-ops`
```bash
cd career-ops/web
npm run build
npm start
```
Acesse `http://localhost:3000/dashboard`.

## 4. Verificações de Qualidade
- `npm run typecheck` (TypeScript)
- `npm run build` (Next.js production build)
- `node --test tests/lib/dashboard-analytics.test.mjs tests/lib/vagas-catalog.test.mjs tests/lib/compatibility-engine.test.mjs tests/lib/candidaturas-stages.test.mjs tests/lib/rate-limit.test.mjs`
- Na raiz `career-ops/`: `npm run verify` e `npm run lint`
