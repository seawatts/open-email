'use client';

import { MetricButton } from '@seawatts/analytics/components';
import {
  useActiveOrganization,
  useListOrganizations,
} from '@seawatts/auth/client';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@seawatts/ui/command';
import { Icons } from '@seawatts/ui/custom/icons';
import { cn } from '@seawatts/ui/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@seawatts/ui/popover';
import { ChevronsUpDown } from 'lucide-react';
import posthog from 'posthog-js';
import React from 'react';

interface OrgSelectorProps {
  onSelect?: (orgId: string) => void;
}

export function OrgSelector({ onSelect }: OrgSelectorProps) {
  const { data: activeOrg } = useActiveOrganization();
  const { data: organizations } = useListOrganizations();

  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState<string>(activeOrg?.id || '');
  const [input, setInput] = React.useState('');

  // Update value when activeOrg changes
  React.useEffect(() => {
    if (activeOrg?.id) {
      setValue(activeOrg.id);
      onSelect?.(activeOrg.id);
    }
  }, [activeOrg?.id, onSelect]);

  // Auto-select the first org if there is only one and none is selected
  React.useEffect(() => {
    if (organizations && organizations.length === 1 && !value) {
      const firstOrg = organizations[0];
      if (firstOrg) {
        setValue(firstOrg.id);
        // Set active org via Better Auth
        fetch('/api/auth/organization/set-active', {
          body: JSON.stringify({ organizationId: firstOrg.id }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        onSelect?.(firstOrg.id);
      }
    }
  }, [organizations, value, onSelect]);

  const filteredOrgs = input
    ? organizations?.filter((org) =>
        org.name.toLowerCase().includes(input.toLowerCase()),
      )
    : organizations;

  // Popover width logic
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = React.useState<string | undefined>(
    undefined,
  );
  React.useEffect(() => {
    if (open && triggerRef.current) {
      setPopoverWidth(`${triggerRef.current.offsetWidth}px`);
    }
  }, [open]);

  const handleOrgSelect = async (orgId: string, orgName: string) => {
    setValue(orgId);
    setInput('');
    setOpen(false);

    // Set active org via Better Auth
    await fetch('/api/auth/organization/set-active', {
      body: JSON.stringify({ organizationId: orgId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    onSelect?.(orgId);

    posthog.capture('cli_org_selected', {
      orgId: orgId,
      orgName: orgName,
    });
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <MetricButton
          aria-expanded={open}
          className="w-full justify-between"
          metric="auth_code_org_selector_clicked"
          ref={triggerRef}
          variant="outline"
        >
          {value
            ? organizations?.find((org) => org.id === value)?.name
            : 'Select an organization...'}
          <ChevronsUpDown className="opacity-50 ml-2" size="sm" />
        </MetricButton>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={popoverWidth ? { width: popoverWidth } : {}}
      >
        <Command>
          <CommandInput
            onValueChange={setInput}
            placeholder="Search organizations..."
            value={input}
          />
          <CommandList>
            <CommandGroup>
              {filteredOrgs?.map((org) => (
                <CommandItem
                  key={org.id}
                  keywords={[org.name]}
                  onSelect={() => handleOrgSelect(org.id, org.name)}
                  value={org.id}
                >
                  {org.name}
                  <Icons.Check
                    className={cn(
                      'ml-auto',
                      value === org.id ? 'opacity-100' : 'opacity-0',
                    )}
                    size="sm"
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function OrgSelectorProvider({ onSelect }: OrgSelectorProps) {
  return (
    <React.Suspense fallback={<div>Loading organizations...</div>}>
      <OrgSelector onSelect={onSelect} />
    </React.Suspense>
  );
}
