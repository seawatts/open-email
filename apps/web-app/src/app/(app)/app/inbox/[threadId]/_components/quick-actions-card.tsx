'use client';

import { Button } from '@seawatts/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { Archive, Clock, Tag } from 'lucide-react';

interface QuickActionsCardProps {
  onArchive: () => void;
  onStar: () => void;
  onSnooze: () => void;
}

export function QuickActionsCard({
  onArchive,
  onStar,
  onSnooze,
}: QuickActionsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={onArchive} size="sm" variant="outline">
            <Archive className="mr-1 size-4" />
            Archive
          </Button>
          <Button onClick={onStar} size="sm" variant="outline">
            <Tag className="mr-1 size-4" />
            Star
          </Button>
          <Button onClick={onSnooze} size="sm" variant="outline">
            <Clock className="mr-1 size-4" />
            Snooze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
