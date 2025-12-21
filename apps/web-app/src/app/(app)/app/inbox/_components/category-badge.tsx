'use client';

import { Badge } from '@seawatts/ui/badge';
import { cn } from '@seawatts/ui/lib/utils';
import {
  AlertCircle,
  Archive,
  Clock,
  Info,
  type LucideIcon,
  Mail,
} from 'lucide-react';

type EmailCategory =
  | 'urgent'
  | 'needs_reply'
  | 'awaiting_other'
  | 'fyi'
  | 'spam_like';

const categoryConfig: Record<
  EmailCategory,
  {
    label: string;
    icon: LucideIcon;
    className: string;
  }
> = {
  awaiting_other: {
    className:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: Clock,
    label: 'Waiting',
  },
  fyi: {
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    icon: Info,
    label: 'FYI',
  },
  needs_reply: {
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: Mail,
    label: 'Reply Needed',
  },
  spam_like: {
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    icon: Archive,
    label: 'Low Priority',
  },
  urgent: {
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: AlertCircle,
    label: 'Urgent',
  },
};

interface CategoryBadgeProps {
  category: EmailCategory;
  confidence?: number;
  size?: 'sm' | 'md';
}

export function CategoryBadge({
  category,
  confidence,
  size = 'sm',
}: CategoryBadgeProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        'gap-1 font-medium',
        config.className,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1',
      )}
      variant="secondary"
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {config.label}
      {confidence !== undefined && (
        <span className="ml-1 opacity-70">{Math.round(confidence * 100)}%</span>
      )}
    </Badge>
  );
}






