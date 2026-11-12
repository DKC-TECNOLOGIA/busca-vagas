import { loadVagasCatalog } from "@/lib/vagas/loader";
import { VagasListView } from "@/components/vagas/vagas-list-view";

export const dynamic = "force-dynamic";

export default async function VagasPage() {
  const jobs = loadVagasCatalog();
  return <VagasListView initialJobs={jobs} />;
}
