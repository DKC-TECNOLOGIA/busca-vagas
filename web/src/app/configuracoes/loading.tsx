import { Skeleton } from "@/components/ui/skeleton";

export default function ConfiguracoesLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
