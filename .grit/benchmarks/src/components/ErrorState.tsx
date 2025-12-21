import { PageHeader } from './PageHeader';

interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className='main-content-container-lg flex flex-col gap-4'>
      <PageHeader />
      <div className='rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive'>
        {error}
      </div>
    </div>
  );
}
