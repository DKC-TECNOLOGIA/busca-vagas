import { Skeleton } from "@/components/ui/skeleton";

export default function CandidaturasLoading() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6">
      <Skeleton className="h-10 w-72" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[540px] w-[275px] shrink-0 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
