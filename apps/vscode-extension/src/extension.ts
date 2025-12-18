import { debug, defaultLogger } from '@seawatts/logger';
import { VSCodeOutputDestination } from '@seawatts/logger/destinations/vscode-output';
import * as vscode from 'vscode';
import { registerAuthCommands } from './auth/commands';
import { registerOutputCommands } from './commands/output.commands';
import { registerQuickPickCommand } from './commands/quick-pick.commands';
import { registerSettingsCommands } from './commands/settings.commands';
import { env } from './env';
import { SettingsProvider } from './providers/settings.provider';
import { SettingsService } from './services/settings.service';
import { AuthStore } from './stores/auth-store';

defaultLogger.enableNamespace('*');
defaultLogger.enableNamespace('seawatts:vscode');
defaultLogger.enableNamespace('seawatts:vscode:*');
const log = debug('seawatts:vscode');

export async function activate(context: vscode.ExtensionContext) {
  log('Seawatts extension is activating...');

  // Initialize auth store
  const authStore = new AuthStore(context);
  await authStore.initialize();

  // Register auth commands and provider
  const { authProvider, signInCommand, signOutCommand } = registerAuthCommands(
    context,
    authStore,
  );

  // Initialize settings service
  const settingsService = SettingsService.getInstance();
  context.subscriptions.push(settingsService);

  // Add VS Code output destination to default logger
  const outputDestination = new VSCodeOutputDestination({
    autoShow: settingsService.getSettings().output.autoShow,
    name: 'Seawatts',
    vscode,
  });
  defaultLogger.addDestination(outputDestination);

  // Listen for settings changes
  settingsService.onSettingsChange((settings) => {
    outputDestination.autoShow = settings.output.autoShow;
  });

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );

  // Update status bar based on auth state
  function updateStatusBar() {
    if (authStore.isValidatingSession) {
      statusBarItem.text = '$(sync~spin) Validating Seawatts Session...';
      statusBarItem.tooltip = 'Validating your Seawatts session...';
      statusBarItem.command = undefined;
    } else if (authStore.isSignedIn) {
      statusBarItem.text = `$(check) ${authStore.user?.email ?? 'Signed in'}`;
      statusBarItem.tooltip = 'Click to sign out of Seawatts';
      statusBarItem.command = 'seawatts.signOut';
    } else {
      statusBarItem.text = '$(sign-in) Sign in to Seawatts';
      statusBarItem.tooltip = 'Click to sign in to Seawatts';
      statusBarItem.command = 'seawatts.signIn';
    }
    statusBarItem.show();
  }

  // Listen for auth state changes
  authStore.onDidChangeAuth(() => updateStatusBar());
  updateStatusBar();

  // Add status bar item to subscriptions
  context.subscriptions.push(
    authStore,
    authProvider,
    signInCommand,
    signOutCommand,
    statusBarItem,
  );

  const settingsProvider = new SettingsProvider();
  vscode.window.registerTreeDataProvider('seawatts.settings', settingsProvider);

  // Register the custom URI scheme handler
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri) {
        log('Handling URI:', uri.toString());
        // Handle any of our supported editor schemes
        if (
          uri.authority === env.NEXT_PUBLIC_VSCODE_EXTENSION_ID &&
          uri.path === '/auth/callback'
        ) {
          const code = uri.query.split('=')[1];
          if (code) {
            // The auth provider will handle the code exchange
            vscode.authentication.getSession(
              'seawatts',
              ['openid', 'email', 'profile'],
              {
                createIfNone: true,
              },
            );
          }
        }
      },
    }),
  );

  // Register commands
  registerOutputCommands(context, outputDestination);
  registerQuickPickCommand(context);

  registerSettingsCommands(context);

  log('Seawatts extension activation complete');
}

export function deactivate() {}
