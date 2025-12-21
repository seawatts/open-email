'use client';

import { Badge } from '@seawatts/ui/badge';
import { Button } from '@seawatts/ui/button';
import { Card, CardContent } from '@seawatts/ui/card';
import { cn } from '@seawatts/ui/lib/utils';
import {
  Calendar,
  CheckSquare,
  CreditCard,
  ExternalLink,
  Hotel,
  Package,
  Plane,
  Utensils,
} from 'lucide-react';

type HighlightType =
  | 'flight'
  | 'hotel'
  | 'package_tracking'
  | 'payment'
  | 'event'
  | 'reservation'
  | 'action_item';

interface HighlightData {
  type: HighlightType;
  [key: string]: unknown;
}

interface Highlight {
  id: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionUrl?: string;
  data: HighlightData;
}

interface HighlightCardProps {
  highlight: Highlight;
  className?: string;
}

const typeConfig: Record<
  HighlightType,
  {
    icon: typeof Plane;
    color: string;
    bg: string;
  }
> = {
  action_item: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    color: 'text-purple-600 dark:text-purple-400',
    icon: CheckSquare,
  },
  event: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    color: 'text-blue-600 dark:text-blue-400',
    icon: Calendar,
  },
  flight: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/20',
    color: 'text-cyan-600 dark:text-cyan-400',
    icon: Plane,
  },
  hotel: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/20',
    color: 'text-indigo-600 dark:text-indigo-400',
    icon: Hotel,
  },
  package_tracking: {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    color: 'text-orange-600 dark:text-orange-400',
    icon: Package,
  },
  payment: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/20',
    color: 'text-emerald-600 dark:text-emerald-400',
    icon: CreditCard,
  },
  reservation: {
    bg: 'bg-rose-100 dark:bg-rose-900/20',
    color: 'text-rose-600 dark:text-rose-400',
    icon: Utensils,
  },
};

function formatHighlightDetails(data: HighlightData): string[] {
  const details: string[] = [];

  switch (data.type) {
    case 'flight': {
      if (data.airline) details.push(String(data.airline));
      if (data.flightNumber) details.push(String(data.flightNumber));
      if (data.departure && data.arrival)
        details.push(`${data.departure} → ${data.arrival}`);
      if (data.departureTime)
        details.push(
          new Date(String(data.departureTime)).toLocaleString('en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
        );
      break;
    }
    case 'hotel': {
      if (data.hotelName) details.push(String(data.hotelName));
      if (data.checkIn && data.checkOut) {
        const checkIn = new Date(String(data.checkIn)).toLocaleDateString();
        const checkOut = new Date(String(data.checkOut)).toLocaleDateString();
        details.push(`${checkIn} - ${checkOut}`);
      }
      if (data.confirmationNumber)
        details.push(`Conf: ${data.confirmationNumber}`);
      break;
    }
    case 'package_tracking': {
      if (data.carrier) details.push(String(data.carrier));
      if (data.trackingNumber) details.push(String(data.trackingNumber));
      if (data.estimatedDelivery) {
        details.push(
          `Est. ${new Date(String(data.estimatedDelivery)).toLocaleDateString()}`,
        );
      }
      if (data.status) details.push(String(data.status));
      break;
    }
    case 'payment': {
      if (data.amount && data.currency)
        details.push(`${data.currency} ${data.amount}`);
      if (data.payee) details.push(`To: ${data.payee}`);
      if (data.dueDate)
        details.push(
          `Due: ${new Date(String(data.dueDate)).toLocaleDateString()}`,
        );
      break;
    }
    case 'event': {
      if (data.eventName) details.push(String(data.eventName));
      if (data.dateTime)
        details.push(
          new Date(String(data.dateTime)).toLocaleString('en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
        );
      if (data.location) details.push(String(data.location));
      break;
    }
    case 'reservation': {
      if (data.venue) details.push(String(data.venue));
      if (data.dateTime)
        details.push(
          new Date(String(data.dateTime)).toLocaleString('en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
        );
      if (data.partySize) details.push(`Party of ${data.partySize}`);
      if (data.confirmationNumber)
        details.push(`Conf: ${data.confirmationNumber}`);
      break;
    }
    case 'action_item': {
      if (data.task) details.push(String(data.task));
      if (data.deadline)
        details.push(
          `Due: ${new Date(String(data.deadline)).toLocaleDateString()}`,
        );
      if (data.assignedBy) details.push(`From: ${data.assignedBy}`);
      break;
    }
  }

  return details;
}

export function HighlightCard({ highlight, className }: HighlightCardProps) {
  const config = typeConfig[highlight.data.type];
  const Icon = config.icon;
  const details = formatHighlightDetails(highlight.data);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
              config.bg,
            )}
          >
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium leading-tight">{highlight.title}</h4>
                {highlight.subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {highlight.subtitle}
                  </p>
                )}
              </div>
              <Badge className="flex-shrink-0" variant="secondary">
                {highlight.data.type.replace('_', ' ')}
              </Badge>
            </div>

            {details.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {details.map((detail, i) => (
                  <span
                    className="rounded bg-muted px-2 py-0.5 text-xs"
                    key={i}
                  >
                    {detail}
                  </span>
                ))}
              </div>
            )}

            {highlight.actionUrl && highlight.actionLabel && (
              <Button
                asChild
                className="mt-2 h-7 text-xs"
                size="sm"
                variant="outline"
              >
                <a
                  href={highlight.actionUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  {highlight.actionLabel}
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface HighlightListProps {
  highlights: Highlight[];
  className?: string;
}

export function HighlightList({ highlights, className }: HighlightListProps) {
  if (!highlights || highlights.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {highlights.map((highlight) => (
        <HighlightCard highlight={highlight} key={highlight.id} />
      ))}
    </div>
  );
}
