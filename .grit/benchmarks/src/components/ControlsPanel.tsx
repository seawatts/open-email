import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '@openrouter-monorepo/frontend/components/ui/Button';
import { Checkbox } from '@openrouter-monorepo/frontend/components/ui/CheckBox';
import { Label } from '@openrouter-monorepo/frontend/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openrouter-monorepo/frontend/components/ui/Select';

interface ControlsPanelProps {
  availableFiles: string[];
  selectedFile: string;
  onFileChange: (file: string) => void;
  showBaseline: boolean;
  onShowBaselineChange: (value: boolean) => void;
  showAllTogether: boolean;
  onShowAllTogetherChange: (value: boolean) => void;
  showRelative: boolean;
  onShowRelativeChange: (value: boolean) => void;
  categories: string[];
  selectedCategories: Set<string>;
  onCategoryChange: (category: string) => void;
  onReset: () => void;
}

export function ControlsPanel({
  availableFiles,
  selectedFile,
  onFileChange,
  showBaseline,
  onShowBaselineChange,
  showAllTogether,
  onShowAllTogetherChange,
  showRelative,
  onShowRelativeChange,
  categories,
  selectedCategories,
  onCategoryChange,
  onReset,
}: ControlsPanelProps) {
  const handleFileChange = (value: string) => {
    onFileChange(value);
    const url = new URL(window.location.href);
    url.searchParams.set('file', value);
    window.history.pushState({}, '', url);
  };

  const formatFileName = (file: string): string => {
    // Format timestamp: 2025-11-25T14-45-22-898Z.json -> 2025-11-25 14:45:22
    return file.replace('.json', '').replace('T', ' ').replace(/-/g, ':').slice(0, -5);
  };

  return (
    <div className='flex flex-wrap gap-4 rounded-lg border bg-card p-4 shadow-sm'>
      <div className='flex flex-col gap-2'>
        <Label>Result File:</Label>
        <Select
          value={selectedFile}
          onValueChange={handleFileChange}
        >
          <SelectTrigger className='w-[200px]'>
            <SelectValue>{formatFileName(selectedFile)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableFiles.map((file) => (
              <SelectItem
                key={file}
                value={file}
              >
                {formatFileName(file)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex flex-col gap-2'>
        <Label>Display:</Label>
        <div className='flex flex-wrap gap-3'>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='show-baseline'
              checked={showBaseline}
              onCheckedChange={onShowBaselineChange}
            />
            <Label
              htmlFor='show-baseline'
              className='cursor-pointer text-sm font-normal'
            >
              Show Baseline
            </Label>
          </div>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='show-all-together'
              checked={showAllTogether}
              onCheckedChange={onShowAllTogetherChange}
            />
            <Label
              htmlFor='show-all-together'
              className='cursor-pointer text-sm font-normal'
            >
              Show All Together
            </Label>
          </div>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='show-relative'
              checked={showRelative}
              onCheckedChange={onShowRelativeChange}
            />
            <Label
              htmlFor='show-relative'
              className='cursor-pointer text-sm font-normal'
            >
              Show Relative to Baseline
            </Label>
          </div>
        </div>
      </div>

      <div className='flex w-full flex-col gap-2'>
        <div className='flex items-center gap-3'>
          <Label className='shrink-0'>Filter by Category:</Label>
          <div className='h-px flex-1 bg-border' />
          <Button
            variant='ghost'
            size='sm'
            onClick={onReset}
            className='h-7 shrink-0 text-xs'
          >
            <ArrowPathIcon className='mr-1.5 h-3.5 w-3.5' />
            Reset
          </Button>
        </div>
        <div className='grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-4'>
          {categories.map((category) => (
            <div
              key={category}
              className='flex items-center gap-2'
            >
              <Checkbox
                id={`category-${category}`}
                checked={selectedCategories.has(category)}
                onCheckedChange={() => onCategoryChange(category)}
              />
              <Label
                htmlFor={`category-${category}`}
                className='cursor-pointer text-sm font-normal'
              >
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
