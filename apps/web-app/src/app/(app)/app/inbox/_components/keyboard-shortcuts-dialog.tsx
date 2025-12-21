'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@seawatts/ui/dialog';
import { cn } from '@seawatts/ui/lib/utils';
import { Keyboard } from 'lucide-react';

import {
  KEYBOARD_SHORTCUTS,
  type KeyboardShortcut,
} from './use-keyboard-shortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

function ShortcutKeys({ keys }: { keys: string }) {
  // Split by space for sequences, but handle special cases
  const parts = keys.split(/(?<=[^+])\s+/);

  return (
    <div className="flex items-center gap-1">
      {parts.map((part, i) => {
        // Handle modifier combinations like "Shift+i"
        if (part.includes('+')) {
          const modifiers = part.split('+');
          return (
            <span className="flex items-center gap-0.5" key={i}>
              {modifiers.map((mod, j) => (
                <ShortcutKey key={j}>{mod}</ShortcutKey>
              ))}
            </span>
          );
        }
        return <ShortcutKey key={i}>{part}</ShortcutKey>;
      })}
    </div>
  );
}

function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-foreground">{shortcut.description}</span>
      <ShortcutKeys keys={shortcut.keys} />
    </div>
  );
}

function ShortcutCategory({
  title,
  shortcuts,
}: {
  title: string;
  shortcuts: KeyboardShortcut[];
}) {
  if (shortcuts.length === 0) return null;

  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="divide-y divide-border/50">
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.keys} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const categories = {
    actions: KEYBOARD_SHORTCUTS.filter((s) => s.category === 'actions'),
    compose: KEYBOARD_SHORTCUTS.filter((s) => s.category === 'compose'),
    navigation: KEYBOARD_SHORTCUTS.filter((s) => s.category === 'navigation'),
    selection: KEYBOARD_SHORTCUTS.filter((s) => s.category === 'selection'),
    view: KEYBOARD_SHORTCUTS.filter((s) => s.category === 'view'),
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 overflow-y-auto py-4 md:grid-cols-2">
          <div className="space-y-6">
            <ShortcutCategory
              shortcuts={categories.navigation}
              title="Navigation"
            />
            <ShortcutCategory shortcuts={categories.actions} title="Actions" />
          </div>
          <div className="space-y-6">
            <ShortcutCategory shortcuts={categories.compose} title="Compose" />
            <ShortcutCategory
              shortcuts={categories.selection}
              title="Selection"
            />
            <ShortcutCategory shortcuts={categories.view} title="View" />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-center text-xs text-muted-foreground">
            Press <ShortcutKey>?</ShortcutKey> anytime to show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Toast notification for keyboard actions
interface ActionToastProps {
  message: string;
  shortcut?: string;
  className?: string;
}

export function ActionToast({
  message,
  shortcut,
  className,
}: ActionToastProps) {
  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-background px-4 py-2 shadow-lg',
        className,
      )}
    >
      <span className="text-sm font-medium">{message}</span>
      {shortcut && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          Press <ShortcutKey>z</ShortcutKey> to undo
        </span>
      )}
    </div>
  );
}
