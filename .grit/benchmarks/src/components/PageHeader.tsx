import { ThemeToggle } from './ThemeToggle';

export function PageHeader() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1>Grit Rules Benchmark Results</h1>
        <p className="text-muted-foreground">
          Performance analysis of Biome.js Grit rules
        </p>
      </div>
      <ThemeToggle />
    </div>
  );
}
