'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@seawatts/ui/alert-dialog';
import { Badge } from '@seawatts/ui/badge';
import { Button } from '@seawatts/ui/button';
import { cn } from '@seawatts/ui/lib/utils';
import {
  AlertTriangle,
  Archive,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  FileText,
  Forward,
  Loader2,
  MessageSquare,
  Tag,
  Zap,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

type ActionType =
  | 'reply'
  | 'archive'
  | 'label'
  | 'forward'
  | 'schedule'
  | 'pay'
  | 'review'
  | 'custom';
type RiskLevel = 'low' | 'medium' | 'high';

interface SmartAction {
  id: string;
  label: string;
  description: string;
  type: ActionType;
  icon?: string;
  confidence: number;
  requiresConfirmation?: boolean;
  riskLevel?: RiskLevel;
  estimatedTime?: string;
  metadata?: Record<string, unknown>;
}

interface SmartActionButtonProps {
  action: SmartAction;
  isDemo?: boolean;
  onExecute?: (action: SmartAction) => Promise<void>;
  disabled?: boolean;
}

const iconMap: Record<string, typeof Zap> = {
  AlertTriangle,
  Archive,
  Calendar,
  Check,
  CreditCard,
  ExternalLink,
  FileText,
  Forward,
  MessageSquare,
  Tag,
  Zap,
};

const typeIcons: Record<ActionType, typeof Zap> = {
  archive: Archive,
  custom: Zap,
  forward: Forward,
  label: Tag,
  pay: CreditCard,
  reply: MessageSquare,
  review: FileText,
  schedule: Calendar,
};

const riskColors: Record<RiskLevel, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function SmartActionButton({
  action,
  isDemo,
  onExecute,
  disabled,
}: SmartActionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  const Icon =
    iconMap[action.icon ?? ''] ?? typeIcons[action.type] ?? ExternalLink;

  const handleExecute = async () => {
    if (action.requiresConfirmation && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setExecuting(true);
    setShowConfirm(false);

    if (isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else if (onExecute) {
      await onExecute(action);
    }

    setExecuting(false);
    setExecuted(true);
  };

  const handleConfirm = async () => {
    setExecuting(true);
    setShowConfirm(false);

    if (isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else if (onExecute) {
      await onExecute(action);
    }

    setExecuting(false);
    setExecuted(true);
  };

  if (executed) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
        <div className="rounded-full bg-green-500 p-2">
          <Check className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-green-700 dark:text-green-400">
            {action.label}
          </h4>
          <p className="text-xs text-green-600 dark:text-green-500">
            Completed
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'group relative rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-accent/50',
          disabled && 'opacity-50',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h4 className="text-sm font-medium">{action.label}</h4>
              {action.confidence >= 0.9 && (
                <Badge className="text-xs" variant="outline">
                  High confidence
                </Badge>
              )}
            </div>

            <p className="mb-2 text-xs text-muted-foreground">
              {action.description}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {action.estimatedTime && (
                <span className="text-xs text-muted-foreground">
                  ⏱ {action.estimatedTime}
                </span>
              )}
              {action.riskLevel && (
                <Badge
                  className={cn('text-xs', riskColors[action.riskLevel])}
                  variant="secondary"
                >
                  {action.riskLevel} risk
                </Badge>
              )}
            </div>
          </div>

          <Button
            className="h-8 gap-1 text-xs"
            disabled={disabled || executing}
            onClick={handleExecute}
            size="sm"
            variant={action.riskLevel === 'high' ? 'destructive' : 'default'}
          >
            {executing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Execute'
            )}
          </Button>
        </div>
      </div>

      <AlertDialog onOpenChange={setShowConfirm} open={showConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {action.description}
              {action.riskLevel === 'high' && (
                <span className="mt-2 flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  This is a high-risk action and cannot be undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                action.riskLevel === 'high'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
              onClick={handleConfirm}
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SmartActionsPanelProps {
  actions: SmartAction[];
  isDemo?: boolean;
  onActionExecuted?: (action: SmartAction) => Promise<void>;
  className?: string;
  title?: ReactNode;
  isLoading?: boolean;
}

export function SmartActionsPanel({
  actions,
  isDemo = false,
  onActionExecuted,
  className,
  title,
  isLoading,
}: SmartActionsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [executedActions, setExecutedActions] = useState<Set<string>>(
    new Set(),
  );

  if (!actions || actions.length === 0) return null;

  const handleExecute = async (action: SmartAction) => {
    if (onActionExecuted) {
      await onActionExecuted(action);
    }
    setExecutedActions((prev) => new Set(prev).add(action.id));
  };

  const completedCount = executedActions.size;
  const totalCount = actions.length;

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4',
        className,
      )}
    >
      <button
        className="flex w-full items-center justify-between"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <h3 className="flex items-center gap-2 font-semibold">
          <Zap className="h-4 w-4 text-primary" />
          {title || 'Smart Actions'}
          {completedCount > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {completedCount}/{totalCount} done
            </span>
          )}
        </h3>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Suggested actions based on this email
          </p>
          <div className="grid gap-2">
            {actions.map((action) => (
              <SmartActionButton
                action={action}
                disabled={isLoading}
                isDemo={isDemo}
                key={action.id}
                onExecute={handleExecute}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export type { SmartAction, ActionType, RiskLevel };
