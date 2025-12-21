'use client';

import type { HighlightData, HighlightType } from '@seawatts/api/email/types';
import { Badge } from '@seawatts/ui/badge';
import { Button } from '@seawatts/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@seawatts/ui/popover';
import {
  Building,
  Calendar,
  CheckSquare,
  DollarSign,
  ExternalLink,
  Package,
  Plane,
  Utensils,
} from 'lucide-react';
import { useState } from 'react';

// Icon mapping for highlight types
const HIGHLIGHT_ICONS = {
  action_item: CheckSquare,
  event: Calendar,
  flight: Plane,
  hotel: Building,
  package_tracking: Package,
  payment: DollarSign,
  reservation: Utensils,
} satisfies Record<HighlightType, React.ComponentType<{ className?: string }>>;

// Color classes for highlights
const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  action_item:
    'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  event:
    'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  flight:
    'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
  hotel:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  package_tracking:
    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  payment:
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  reservation:
    'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800',
};

interface HighlightChipProps {
  actionLabel?: string | null;
  actionUrl?: string | null;
  data: HighlightData;
  highlightType: HighlightType;
  subtitle?: string | null;
  title: string;
}

function formatHighlightDetails(data: HighlightData): string[] {
  const details: string[] = [];

  switch (data.type) {
    case 'flight':
      details.push(`${data.airline} ${data.flightNumber}`);
      details.push(`${data.departure} → ${data.arrival}`);
      if (data.departureTime) {
        details.push(
          `Departs: ${new Date(data.departureTime).toLocaleString()}`,
        );
      }
      break;
    case 'hotel':
      details.push(data.hotelName);
      details.push(`Check-in: ${new Date(data.checkIn).toLocaleDateString()}`);
      details.push(
        `Check-out: ${new Date(data.checkOut).toLocaleDateString()}`,
      );
      if (data.confirmationNumber) {
        details.push(`Confirmation: ${data.confirmationNumber}`);
      }
      break;
    case 'package_tracking':
      details.push(`${data.carrier}`);
      details.push(`Tracking: ${data.trackingNumber}`);
      if (data.estimatedDelivery) {
        details.push(`Delivery: ${data.estimatedDelivery}`);
      }
      if (data.status) {
        details.push(`Status: ${data.status}`);
      }
      break;
    case 'payment':
      details.push(`${data.amount} ${data.currency}`);
      if (data.payee) {
        details.push(`To: ${data.payee}`);
      }
      if (data.dueDate) {
        details.push(`Due: ${new Date(data.dueDate).toLocaleDateString()}`);
      }
      break;
    case 'event':
      details.push(data.eventName);
      details.push(new Date(data.dateTime).toLocaleString());
      if (data.location) {
        details.push(`At: ${data.location}`);
      }
      break;
    case 'reservation':
      details.push(data.venue);
      details.push(new Date(data.dateTime).toLocaleString());
      if (data.partySize) {
        details.push(`Party of ${data.partySize}`);
      }
      if (data.confirmationNumber) {
        details.push(`Confirmation: ${data.confirmationNumber}`);
      }
      break;
    case 'action_item':
      details.push(data.task);
      if (data.deadline) {
        details.push(`Due: ${new Date(data.deadline).toLocaleDateString()}`);
      }
      if (data.assignedBy) {
        details.push(`From: ${data.assignedBy}`);
      }
      break;
  }

  return details;
}

export function HighlightChip({
  actionLabel,
  actionUrl,
  data,
  highlightType,
  subtitle,
  title,
}: HighlightChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = HIGHLIGHT_ICONS[highlightType];
  const colorClass = HIGHLIGHT_COLORS[highlightType];
  const details = formatHighlightDetails(data);

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 ${colorClass}`}
          type="button"
        >
          <Icon className="h-3 w-3" />
          <span className="max-w-[150px] truncate">{title}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium leading-tight">{title}</h4>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1 text-sm">
            {details.map((detail, index) => (
              <p className="text-muted-foreground" key={index}>
                {detail}
              </p>
            ))}
          </div>

          {/* Action button */}
          {actionUrl && actionLabel && (
            <Button asChild className="w-full" size="sm" variant="outline">
              <a href={actionUrl} rel="noopener noreferrer" target="_blank">
                <ExternalLink className="mr-2 h-3 w-3" />
                {actionLabel}
              </a>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface HighlightChipsProps {
  highlights: Array<{
    actionLabel?: string | null;
    actionUrl?: string | null;
    data: HighlightData | Record<string, unknown>;
    highlightType: HighlightType;
    id: string;
    subtitle?: string | null;
    title: string;
  }>;
  maxDisplay?: number;
}

export function HighlightChips({
  highlights,
  maxDisplay = 3,
}: HighlightChipsProps) {
  if (!highlights || highlights.length === 0) {
    return null;
  }

  const displayHighlights = highlights.slice(0, maxDisplay);
  const remainingCount = highlights.length - maxDisplay;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {displayHighlights.map((highlight) => (
        <HighlightChip
          actionLabel={highlight.actionLabel}
          actionUrl={highlight.actionUrl}
          data={highlight.data as HighlightData}
          highlightType={highlight.highlightType}
          key={highlight.id}
          subtitle={highlight.subtitle}
          title={highlight.title}
        />
      ))}
      {remainingCount > 0 && (
        <Badge className="rounded-full" variant="secondary">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}
