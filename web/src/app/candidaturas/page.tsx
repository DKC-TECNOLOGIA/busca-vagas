import { loadKanbanApplications } from "@/lib/candidaturas/store";
import { KanbanView } from "@/components/candidaturas/kanban-view";

export const dynamic = "force-dynamic";

export default async function CandidaturasPage() {
  const cards = loadKanbanApplications();
  return <KanbanView initialCards={cards} />;
}
