import { loadAutomacoesData } from "@/lib/automacoes/loader";
import { AutomacoesView } from "@/components/automacoes/automacoes-view";

export const dynamic = "force-dynamic";

export default async function AutomacoesPage() {
  const data = loadAutomacoesData();
  return <AutomacoesView initialData={data} />;
}
