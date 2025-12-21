'use client';

import { useCallback, useEffect, useRef } from 'react';

type ShortcutHandler = () => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: ShortcutHandler;
  description: string;
  category: 'navigation' | 'actions' | 'compose' | 'selection' | 'view';
  /** If true, prevents default browser behavior */
  preventDefault?: boolean;
  /** If true, only triggers when not in an input field */
  ignoreInInput?: boolean;
}

export interface KeyboardShortcut {
  keys: string;
  description: string;
  category: ShortcutConfig['category'];
}

// Global registry of shortcuts for the help dialog
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { category: 'navigation', description: 'Move down / Next email', keys: 'j' },
  { category: 'navigation', description: 'Move up / Previous email', keys: 'k' },
  { category: 'navigation', description: 'Open selected email', keys: 'Enter' },
  { category: 'navigation', description: 'Go back', keys: 'Escape' },
  { category: 'navigation', description: 'Go to inbox', keys: 'g i' },
  { category: 'navigation', description: 'Jump to first email', keys: 'g g' },
  { category: 'navigation', description: 'Jump to last email', keys: 'G' },

  // Actions
  { category: 'actions', description: 'Archive', keys: 'e' },
  { category: 'actions', description: 'Delete / Trash', keys: '#' },
  { category: 'actions', description: 'Snooze', keys: 'h' },
  { category: 'actions', description: 'Star / Unstar', keys: 's' },
  { category: 'actions', description: 'Mark as done', keys: 'd' },
  { category: 'actions', description: 'Mark as read', keys: 'Shift+i' },
  { category: 'actions', description: 'Mark as unread', keys: 'Shift+u' },
  { category: 'actions', description: 'Undo last action', keys: 'z' },

  // Compose
  { category: 'compose', description: 'Reply', keys: 'r' },
  { category: 'compose', description: 'Reply all', keys: 'a' },
  { category: 'compose', description: 'Forward', keys: 'f' },
  { category: 'compose', description: 'Compose new email', keys: 'c' },

  // Selection
  { category: 'selection', description: 'Select / Deselect', keys: 'x' },
  { category: 'selection', description: 'Select all', keys: '⌘+a' },
  { category: 'selection', description: 'Deselect all', keys: 'Escape' },

  // View
  { category: 'view', description: 'Search', keys: '/' },
  { category: 'view', description: 'Show keyboard shortcuts', keys: '?' },
  { category: 'view', description: 'Refresh', keys: 'Shift+r' },
  { category: 'view', description: 'Toggle AI panel', keys: 'Tab' },
];

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {},
) {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Keep shortcuts ref updated
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      const isInInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        // Skip if we're in an input and the shortcut should be ignored
        if (isInInput && shortcut.ignoreInInput !== false) {
          continue;
        }

        // Check modifier keys
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

        // Check if key matches
        const keyMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase() ||
          event.code.toLowerCase() === `key${shortcut.key.toLowerCase()}`;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler();
          return;
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Hook for handling key sequences (e.g., "g i" for go to inbox)
export function useKeySequence(
  sequences: Array<{
    keys: string[];
    handler: ShortcutHandler;
  }>,
  options: UseKeyboardShortcutsOptions = {},
) {
  const { enabled = true } = options;
  const sequenceBuffer = useRef<string[]>([]);
  const sequenceTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      const isInInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInInput) return;

      // Clear timeout and reset buffer after 1 second of inactivity
      if (sequenceTimeout.current) {
        clearTimeout(sequenceTimeout.current);
      }

      sequenceBuffer.current.push(event.key.toLowerCase());

      // Check for matching sequences
      for (const sequence of sequences) {
        const bufferStr = sequenceBuffer.current.join(' ');
        const sequenceStr = sequence.keys.join(' ');

        if (bufferStr === sequenceStr) {
          event.preventDefault();
          sequence.handler();
          sequenceBuffer.current = [];
          return;
        }

        // If buffer is longer than any sequence, reset
        if (sequenceBuffer.current.length > Math.max(...sequences.map((s) => s.keys.length))) {
          sequenceBuffer.current = [];
        }
      }

      // Reset buffer after 1 second
      sequenceTimeout.current = setTimeout(() => {
        sequenceBuffer.current = [];
      }, 1000);
    },
    [enabled, sequences],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeout.current) {
        clearTimeout(sequenceTimeout.current);
      }
    };
  }, [handleKeyDown]);
}
