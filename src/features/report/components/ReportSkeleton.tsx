import { Skeleton } from "../../../app/components/ui/skeleton";
import { Panel } from "./primitives";

export function ReportSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Panel className="p-5 flex items-center gap-5">
        <Skeleton className="h-14 w-16" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2 w-full" />
        </div>
      </Panel>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Panel key={i} className="p-4 space-y-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-20" />
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="p-5 lg:col-span-2 space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-32 w-full" />
        </Panel>
        <Panel className="p-5 space-y-3">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </Panel>
      </div>

      <Panel className="p-5 space-y-3">
        <Skeleton className="h-3 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </Panel>
    </div>
  );
}
