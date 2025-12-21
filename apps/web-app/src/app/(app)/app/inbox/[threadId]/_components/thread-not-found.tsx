import { Button } from '@seawatts/ui/button';
import Link from 'next/link';

export function ThreadNotFound() {
  return (
    <div className="grid place-items-center gap-4 py-16">
      <p className="text-muted-foreground">Thread not found</p>
      <Link href="/app/inbox">
        <Button variant="outline">Back to Inbox</Button>
      </Link>
    </div>
  );
}

