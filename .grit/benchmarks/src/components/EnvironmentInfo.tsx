import type { BenchmarkData } from '../types';

interface EnvironmentInfoProps {
  data: BenchmarkData;
}

export function EnvironmentInfo({ data }: EnvironmentInfoProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <h2 className="mb-4">Environment Information</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="font-medium text-muted-foreground">Timestamp:</dt>
        <dd className="text-muted-foreground">
          {new Date(data.timestamp).toLocaleString()}
        </dd>
        <dt className="font-medium text-muted-foreground">Node.js:</dt>
        <dd className="text-muted-foreground">{data.environment.node}</dd>
        <dt className="font-medium text-muted-foreground">pnpm:</dt>
        <dd className="text-muted-foreground">{data.environment.pnpm}</dd>
        <dt className="font-medium text-muted-foreground">Biome:</dt>
        <dd className="text-muted-foreground">{data.environment.biome}</dd>
        <dt className="font-medium text-muted-foreground">OS:</dt>
        <dd className="text-muted-foreground">{data.environment.os}</dd>
        <dt className="font-medium text-muted-foreground">CPU:</dt>
        <dd className="text-muted-foreground">{data.environment.cpu}</dd>
        <dt className="font-medium text-muted-foreground">Commit:</dt>
        <dd className="text-muted-foreground">
          {data.environment.commit.substring(0, 8)}
        </dd>
      </dl>
    </div>
  );
}
