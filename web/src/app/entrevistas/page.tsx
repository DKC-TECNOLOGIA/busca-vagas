import { loadInterviewSuggestions, readInterviews } from "@/lib/entrevistas/store";
import { EntrevistasView } from "@/components/entrevistas/entrevistas-view";

export const dynamic = "force-dynamic";

export default async function EntrevistasPage() {
  const items = readInterviews().sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const suggestions = loadInterviewSuggestions();
  return <EntrevistasView initialItems={items} suggestions={suggestions} />;
}
