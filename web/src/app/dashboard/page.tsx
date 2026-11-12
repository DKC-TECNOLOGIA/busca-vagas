import { loadDashboardData } from "@/lib/dashboard/loader";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = loadDashboardData();
  return <DashboardView data={data} />;
}
