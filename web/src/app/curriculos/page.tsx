import { loadCurriculosData } from "@/lib/curriculos/loader";
import { CurriculosView } from "@/components/curriculos/curriculos-view";

export const dynamic = "force-dynamic";

export default async function CurriculosPage() {
  const data = loadCurriculosData();
  return <CurriculosView initialData={data} />;
}
