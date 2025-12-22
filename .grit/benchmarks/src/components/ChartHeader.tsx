import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openrouter-monorepo/frontend/components/ui/Select';
import type { SortBy } from '../types';

interface ChartHeaderProps {
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
}

const sortByLabels: Record<SortBy, string> = {
  alphabetical: 'Alphabetical',
  category: 'Category',
  fastest: 'Fastest First',
  slowest: 'Slowest First',
};

export function ChartHeader({ sortBy, onSortByChange }: ChartHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-medium">Benchmark Results</h2>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <Select
          onValueChange={(value) => onSortByChange(value as SortBy)}
          value={sortBy}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue>{sortByLabels[sortBy]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slowest">{sortByLabels.slowest}</SelectItem>
            <SelectItem value="fastest">{sortByLabels.fastest}</SelectItem>
            <SelectItem value="alphabetical">
              {sortByLabels.alphabetical}
            </SelectItem>
            <SelectItem value="category">{sortByLabels.category}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
