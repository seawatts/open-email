import { Button } from '@seawatts/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ThreadHeaderProps {
  subject: string;
  participantEmails: string[];
}

export function ThreadHeader({
  subject,
  participantEmails,
}: ThreadHeaderProps) {
  return (
    <div className="sticky top-0 z-40 grid grid-cols-[auto_1fr] items-center gap-4 border-b border-border bg-background px-4 py-3">
      <Link href="/app/inbox">
        <Button size="sm" variant="ghost">
          <ArrowLeft className="size-4" />
        </Button>
      </Link>
      <div className="min-w-0">
        <h1 className="truncate font-semibold">{subject}</h1>
        <p className="text-sm text-muted-foreground">
          {participantEmails.join(', ')}
        </p>
      </div>
    </div>
  );
}

