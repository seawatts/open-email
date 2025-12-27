'use client';

import { Button } from '@seawatts/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';

import type { ThreadAction } from './types';

interface PendingActionsCardProps {
  actions: ThreadAction[];
  onApprove: (actionId: string, approved: boolean) => void;
}

export function PendingActionsCard({
  actions,
  onApprove,
}: PendingActionsCardProps) {
  if (actions.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-800 dark:text-amber-200">
          Pending Approval
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map((action) => (
          <div
            className="grid grid-cols-[1fr_auto] items-center rounded-md bg-white p-2 dark:bg-amber-900/50"
            key={action.id}
          >
            <div>
              <p className="text-sm font-medium capitalize">
                {action.actionType}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(action.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() => onApprove(action.id, true)}
                size="sm"
                variant="ghost"
              >
                <CheckCircle className="size-4 text-green-600" />
              </Button>
              <Button
                onClick={() => onApprove(action.id, false)}
                size="sm"
                variant="ghost"
              >
                <XCircle className="size-4 text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
