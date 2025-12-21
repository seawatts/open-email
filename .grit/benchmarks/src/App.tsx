import type { BenchmarkData, BenchmarkResult, SortBy } from './types';

import { isErr, wrap } from '@openrouter-monorepo/type-utils/result-monad';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BenchmarkChart } from './components/BenchmarkChart';
import { ChartHeader } from './components/ChartHeader';
import { ControlsPanel } from './components/ControlsPanel';
import { EnvironmentInfo } from './components/EnvironmentInfo';
import { ErrorState } from './components/ErrorState';
import { LoadingState } from './components/LoadingState';
import { PageHeader } from './components/PageHeader';
import { RuleDetail } from './components/RuleDetail';
import { StatsGrid } from './components/StatsGrid';

function parseRoute(): {
  view: 'overview' | 'rule';
  ruleName?: string;
} {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('rule/')) {
    const ruleName = decodeURIComponent(hash.slice(5));
    return {
      view: 'rule',
      ruleName,
    };
  }
  return {
    view: 'overview',
  };
}

export function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    function handleHashChange() {
      setRoute(parseRoute());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToRule = useCallback((ruleName: string) => {
    window.location.hash = `rule/${encodeURIComponent(ruleName)}`;
  }, []);

  const navigateToOverview = useCallback(() => {
    window.location.hash = '';
  }, []);

  if (route.view === 'rule' && route.ruleName) {
    return (
      <RuleDetail
        ruleName={route.ruleName}
        onBack={navigateToOverview}
      />
    );
  }

  return <BenchmarkOverview onRuleClick={navigateToRule} />;
}

function BenchmarkOverview({ onRuleClick }: { onRuleClick: (ruleName: string) => void }) {
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showAllTogether, setShowAllTogether] = useState(true);
  const [showRelative, setShowRelative] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('slowest');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  async function loadAvailableFiles() {
    const fetchResult = await wrap(async () => {
      const response = await fetch('/api/results');
      if (!response.ok) {
        throw new Error('Failed to fetch available files');
      }
      return response.json() as Promise<string[]>;
    });

    if (isErr(fetchResult)) {
      setError('Failed to load available result files');
      return;
    }

    const files = fetchResult.data;
    setAvailableFiles(files);

    const urlParams = new URLSearchParams(window.location.search);
    const hashFile = window.location.hash.slice(1);
    const queryFile = urlParams.get('file');
    const initialFile = queryFile || hashFile;
    if (initialFile && files.includes(initialFile)) {
      setSelectedFile(initialFile);
    } else if (files.length > 0) {
      // Files are sorted descending, so first is most recent
      setSelectedFile(files[0]!);
    }
  }

  async function loadData() {
    if (!selectedFile) {
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    const fetchResult = await wrap(async () => {
      const response = await fetch(`./results/${selectedFile}`);
      if (!response.ok) {
        throw new Error(`Failed to load: ${response.status} ${response.statusText}`);
      }
      return response.json() as Promise<BenchmarkData>;
    });

    if (isErr(fetchResult)) {
      const errorMessage =
        fetchResult.error instanceof Error ? fetchResult.error.message : 'Unknown error';
      setError(
        `Error: ${errorMessage}. Please run 'pnpm bench:grit' to generate benchmark results.`,
      );
      setLoading(false);
      return;
    }

    const json = fetchResult.data;
    setData(json);

    if (json.rules) {
      const categories = new Set<string>(json.rules.map((r: BenchmarkResult) => r.category));
      setSelectedCategories(categories);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadAvailableFiles();
  }, []);

  useEffect(() => {
    void loadData();
  }, [
    selectedFile,
  ]);

  const categories = useMemo(() => {
    if (!data?.rules) {
      return [];
    }
    return Array.from(new Set(data.rules.map((r) => r.category))).sort();
  }, [
    data,
  ]);

  const slowestRule = useMemo(() => {
    if (!data?.rules || data.rules.length === 0) {
      return null;
    }
    return (
      [
        ...data.rules,
      ].sort((a, b) => b.mean - a.mean)[0] ?? null
    );
  }, [
    data,
  ]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleReset = () => {
    setShowBaseline(true);
    setShowAllTogether(true);
    setShowRelative(true);
    setSortBy('slowest');
    if (data?.rules) {
      const allCategories = new Set<string>(data.rules.map((r) => r.category));
      setSelectedCategories(allCategories);
    }
  };

  if (loading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState error={error} />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className='main-content-container-lg flex flex-col gap-4'>
      <PageHeader />

      {error && (
        <div className='rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive'>
          {error}
        </div>
      )}

      <StatsGrid
        data={data}
        slowestRule={slowestRule}
      />

      <ControlsPanel
        availableFiles={availableFiles}
        selectedFile={selectedFile}
        onFileChange={setSelectedFile}
        showBaseline={showBaseline}
        onShowBaselineChange={setShowBaseline}
        showAllTogether={showAllTogether}
        onShowAllTogetherChange={setShowAllTogether}
        showRelative={showRelative}
        onShowRelativeChange={setShowRelative}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoryChange={handleCategoryChange}
        onReset={handleReset}
      />

      <ChartHeader
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      <BenchmarkChart
        data={data}
        showBaseline={showBaseline}
        showAllTogether={showAllTogether}
        showRelative={showRelative}
        sortBy={sortBy}
        selectedCategories={selectedCategories}
        onRuleClick={onRuleClick}
      />

      <EnvironmentInfo data={data} />
    </div>
  );
}
