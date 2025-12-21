import { PageHeader } from './PageHeader';

export function LoadingState() {
  return (
    <div className='main-content-container-lg flex flex-col gap-4'>
      <PageHeader />
      <div className='py-16 text-center text-muted-foreground'>
        <p>Loading benchmark results...</p>
      </div>
    </div>
  );
}
