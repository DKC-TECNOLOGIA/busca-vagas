import { careerOpsRoot } from "@/lib/career-ops";
import { isDatabaseConfigured } from "@/lib/db/neon";
import { isTelegramConfigured, readNotificationLogs } from "@/lib/notifications/telegram";
import { readUserPreferences } from "@/app/api/configuracoes/route";
import { ConfiguracoesView } from "@/components/configuracoes/configuracoes-view";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const initialPreferences = readUserPreferences();
  const initialLogs = readNotificationLogs();

  return (
    <ConfiguracoesView
      initialPreferences={initialPreferences}
      initialLogs={initialLogs}
      systemStatus={{
        neonConfigured: isDatabaseConfigured(),
        telegramConfigured: isTelegramConfigured(),
        careerOpsRoot: careerOpsRoot(),
      }}
    />
  );
}
