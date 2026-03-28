'use client';

import { Button } from '@seawatts/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@seawatts/ui/dropdown-menu';
import { cn } from '@seawatts/ui/lib/utils';
import {
  Check,
  ChevronDown,
  Clock,
  FolderPlus,
  Reply,
  ReplyAll,
  Star,
} from 'lucide-react';

interface BottomActionBarProps {
  isStarred?: boolean;
  onStar: () => void;
  onSnooze: () => void;
  onDone: () => void;
  onAddToFolder?: () => void;
  onReply: () => void;
  onReplyAll: () => void;
}

export function BottomActionBar({
  isStarred = false,
  onStar,
  onSnooze,
  onDone,
  onAddToFolder,
  onReply,
  onReplyAll,
}: BottomActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm safe-area-inset-bottom">
      <div className="flex items-center justify-between px-2 py-2">
        {/* Left action icons */}
        <div className="flex items-center gap-1">
          {/* Star */}
          <Button
            className="size-10"
            onClick={onStar}
            size="icon"
            variant="ghost"
          >
            <Star
              className={cn(
                'size-5',
                isStarred && 'fill-yellow-400 text-yellow-400',
              )}
            />
          </Button>

          {/* Snooze */}
          <Button
            className="size-10"
            onClick={onSnooze}
            size="icon"
            variant="ghost"
          >
            <Clock className="size-5" />
          </Button>

          {/* Done / Archive */}
          <Button
            className="size-10"
            onClick={onDone}
            size="icon"
            variant="ghost"
          >
            <Check className="size-5" />
          </Button>

          {/* Add to folder */}
          {onAddToFolder && (
            <Button
              className="size-10"
              onClick={onAddToFolder}
              size="icon"
              variant="ghost"
            >
              <FolderPlus className="size-5" />
            </Button>
          )}
        </div>

        {/* Reply dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-1 px-4" variant="ghost">
              Reply All
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onReply}>
              <Reply className="mr-2 size-4" />
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReplyAll}>
              <ReplyAll className="mr-2 size-4" />
              Reply All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
