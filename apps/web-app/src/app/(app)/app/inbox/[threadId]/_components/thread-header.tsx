'use client';

import { Avatar, AvatarFallback } from '@seawatts/ui/avatar';
import { Text } from '@seawatts/ui/custom/typography';
import { cn } from '@seawatts/ui/lib/utils';

interface ThreadHeaderProps {
  subject: string;
  participantEmails: string[];
  senderEmail?: string;
  senderName?: string;
}

// Generate a consistent color based on the email string
function getAvatarColor(email: string): string {
  const colors = [
    'bg-avatar-pink',
    'bg-avatar-blue',
    'bg-avatar-green',
    'bg-avatar-orange',
    'bg-avatar-purple',
  ];

  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length] ?? 'bg-avatar-blue';
}

function getInitial(name: string | undefined, email: string): string {
  if (name) {
    return name.charAt(0).toUpperCase();
  }
  return email.charAt(0).toUpperCase();
}

export function ThreadHeader({
  subject,
  participantEmails,
  senderEmail,
  senderName,
}: ThreadHeaderProps) {
  const primaryEmail = senderEmail ?? participantEmails[0] ?? '';
  const displayName = senderName ?? primaryEmail.split('@')[0] ?? 'Unknown';
  const initial = getInitial(senderName, primaryEmail);
  const avatarColor = getAvatarColor(primaryEmail);

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <Avatar className={cn('size-10', avatarColor)}>
          <AvatarFallback
            className={cn('text-white font-semibold', avatarColor)}
          >
            {initial}
          </AvatarFallback>
        </Avatar>

        {/* Subject and sender info */}
        <div className="min-w-0">
          <Text className="text-sm text-muted-foreground">{displayName}</Text>
          <h1 className="truncate font-medium text-foreground">{subject}</h1>
        </div>
      </div>
    </div>
  );
}
