import { Skeleton } from "@/components/ui/skeleton";

export default function CurriculosLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
