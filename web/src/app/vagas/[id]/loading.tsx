import { Skeleton } from "@/components/ui/skeleton";

export default function VagaDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
