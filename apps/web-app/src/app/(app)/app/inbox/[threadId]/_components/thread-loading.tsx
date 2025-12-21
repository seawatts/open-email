import { Skeleton } from '@seawatts/ui/skeleton';

export function ThreadLoading() {
  return (
    <div className="grid gap-6 p-4 lg:grid-cols-[1fr_auto]">
      <div className="grid gap-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      <div className="grid w-full gap-4 lg:w-80">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}

