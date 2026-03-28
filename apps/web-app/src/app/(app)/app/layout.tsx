import { SidebarInset } from '@seawatts/ui/sidebar';
import { cookies } from 'next/headers';
import { AppSidebar } from './_components/app-sidebar/app-sidebar';
import { CommandPalette } from './_components/command-palette';
import { SidebarStateProvider } from './_components/sidebar-state-provider';
import { SiteHeader } from './_components/site-header';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <SidebarStateProvider defaultOpen={defaultOpen ?? true}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6">
            {children}
          </div>
        </div>
      </SidebarInset>
      <CommandPalette />
    </SidebarStateProvider>
  );
}
