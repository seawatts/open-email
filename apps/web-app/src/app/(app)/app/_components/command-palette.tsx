'use client';

import { useTRPC } from '@seawatts/api/react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@seawatts/ui/command';
import { toast } from '@seawatts/ui/sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Brain,
  FileText,
  Search,
  Settings,
  ToggleLeft,
  ToggleRight,
  Wand2,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type PaletteView = 'commands' | 'create-rule' | 'edit-memory';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<PaletteView>('commands');
  const [rulePrompt, setRulePrompt] = useState('');
  const [memoryText, setMemoryText] = useState('');

  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isInThread = /\/app\/inbox\/[^/]+/.test(pathname);

  const { data: settings } = useQuery(
    trpc.email.settings.get.queryOptions(),
  );

  const createRuleMutation = useMutation(
    trpc.email.rules.create.mutationOptions({
      onSuccess: () => {
        toast.success('Rule created');
        queryClient.invalidateQueries(trpc.email.rules.list.queryFilter());
        setRulePrompt('');
        setView('commands');
        setIsOpen(false);
      },
      onError: () => {
        toast.error('Failed to create rule');
      },
    }),
  );

  const updateSettingsMutation = useMutation(
    trpc.email.settings.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.email.settings.get.queryFilter());
        toast.success('Memory updated');
        setView('commands');
        setIsOpen(false);
      },
    }),
  );

  const toggleAutopilotMutation = useMutation(
    trpc.email.settings.toggleAutopilot.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.email.settings.get.queryFilter());
        toast.success(
          data.agentMode === 'autopilot'
            ? 'Autopilot enabled'
            : 'Autopilot disabled',
        );
        setIsOpen(false);
      },
    }),
  );

  const isAutopilot = settings?.preferences?.agentMode === 'autopilot';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setView('commands');
      setRulePrompt('');
    }
  }, []);

  const handleCreateRuleSubmit = useCallback(() => {
    const trimmed = rulePrompt.trim();
    if (!trimmed) return;
    createRuleMutation.mutate({ prompt: trimmed });
  }, [rulePrompt, createRuleMutation]);

  const handleMemorySave = useCallback(() => {
    updateSettingsMutation.mutate({ memory: memoryText });
  }, [memoryText, updateSettingsMutation]);

  if (view === 'create-rule') {
    return (
      <CommandDialog
        onOpenChange={handleOpenChange}
        open={isOpen}
        showCloseButton={false}
        title="Create Rule"
        description="Describe a rule in plain English"
      >
        <CommandInput
          placeholder="e.g. Archive all emails from noreply@github.com"
          value={rulePrompt}
          onValueChange={setRulePrompt}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateRuleSubmit();
            }
            if (e.key === 'Backspace' && !rulePrompt) {
              setView('commands');
            }
          }}
        />
        <CommandList>
          <CommandEmpty>
            {rulePrompt
              ? 'Press Enter to create this rule'
              : 'Type a rule in plain English'}
          </CommandEmpty>
          {rulePrompt && (
            <CommandGroup heading="Actions">
              <CommandItem onSelect={handleCreateRuleSubmit}>
                <Wand2 className="mr-2" />
                Create rule: &quot;{rulePrompt}&quot;
                <CommandShortcut>Enter</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    );
  }

  if (view === 'edit-memory') {
    return (
      <CommandDialog
        onOpenChange={handleOpenChange}
        open={isOpen}
        showCloseButton={false}
        title="Edit Memory"
        description="View and edit what the AI knows about you"
      >
        <div className="p-4">
          <textarea
            autoFocus
            className="min-h-[200px] w-full resize-y rounded-md border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setMemoryText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleMemorySave();
              }
              if (e.key === 'Escape') {
                setView('commands');
              }
            }}
            placeholder="The AI has no memory yet. Actions you take will teach it your preferences."
            value={memoryText}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Cmd+Enter to save, Esc to go back
            </span>
            <button
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              onClick={handleMemorySave}
              type="button"
            >
              Save
            </button>
          </div>
        </div>
      </CommandDialog>
    );
  }

  return (
    <CommandDialog
      onOpenChange={handleOpenChange}
      open={isOpen}
      showCloseButton={false}
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setIsOpen(false);
              const searchInput = document.querySelector<HTMLInputElement>(
                '[data-slot="command-input"], input[placeholder*="Search"]',
              );
              if (searchInput) {
                searchInput.focus();
              } else {
                router.push('/app/inbox');
              }
            }}
          >
            <Search className="mr-2" />
            Search emails...
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setView('create-rule');
            }}
          >
            <Wand2 className="mr-2" />
            Create rule...
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setMemoryText(settings?.memory ?? '');
              setView('edit-memory');
            }}
          >
            <Brain className="mr-2" />
            View/edit memory
          </CommandItem>
          <CommandItem
            onSelect={() => {
              toggleAutopilotMutation.mutate({ enabled: !isAutopilot });
            }}
          >
            {isAutopilot ? (
              <ToggleRight className="mr-2 text-green-500" />
            ) : (
              <ToggleLeft className="mr-2" />
            )}
            {isAutopilot ? 'Disable autopilot' : 'Enable autopilot'}
          </CommandItem>
        </CommandGroup>

        {isInThread && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Thread">
              <CommandItem
                onSelect={() => {
                  setRulePrompt('Emails from this sender should ');
                  setView('create-rule');
                }}
              >
                <FileText className="mr-2" />
                Create rule for this sender...
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              setIsOpen(false);
              router.push('/app/inbox');
            }}
          >
            <Archive className="mr-2" />
            Go to inbox
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setIsOpen(false);
              router.push('/app/settings');
            }}
          >
            <Settings className="mr-2" />
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
