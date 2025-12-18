import * as vscode from 'vscode';
import type { AuthStore } from '../stores/auth-store';
import { SeawattsAuthProvider } from './provider';

export function registerAuthCommands(
  context: vscode.ExtensionContext,
  authStore: AuthStore,
) {
  // Register auth provider
  const provider = new SeawattsAuthProvider(context, authStore);
  const authProvider = SeawattsAuthProvider.register(context, authStore);

  // Register sign in command
  const signInCommand = vscode.commands.registerCommand(
    'seawatts.signIn',
    async () => {
      try {
        const session = await vscode.authentication.getSession(
          'seawatts',
          ['openid', 'email', 'profile'],
          {
            createIfNone: true,
          },
        );
        if (session) {
          vscode.window.showInformationMessage(
            'Successfully signed in to Seawatts',
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to sign in to Seawatts: ${(error as Error).message}`,
        );
      }
    },
  );

  // Register sign out command
  const signOutCommand = vscode.commands.registerCommand(
    'seawatts.signOut',
    async () => {
      try {
        const session = await vscode.authentication.getSession(
          'seawatts',
          ['openid', 'email', 'profile'],
          {
            createIfNone: false,
          },
        );
        if (session) {
          await provider.removeSession(session.id);
          vscode.window.showInformationMessage(
            'Successfully signed out of Seawatts',
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to sign out of Seawatts: ${(error as Error).message}`,
        );
      }
    },
  );

  // Add commands to extension context
  context.subscriptions.push(signInCommand, signOutCommand);

  return {
    authProvider,
    signInCommand,
    signOutCommand,
  };
}
