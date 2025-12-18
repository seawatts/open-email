import * as vscode from 'vscode';
import { env } from '../env';

export function registerSettingsCommands(context: vscode.ExtensionContext) {
  // Command to open settings
  const openSettingsCommand = vscode.commands.registerCommand(
    'seawatts.openSettings',
    () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        `@ext:${env.NEXT_PUBLIC_VSCODE_EXTENSION_ID}`,
      );
    },
  );
  context.subscriptions.push(openSettingsCommand);

  // Command to toggle auto-show output
  const toggleAutoShowOutputCommand = vscode.commands.registerCommand(
    'seawatts.toggleAutoShowOutput',
    async () => {
      const config = vscode.workspace.getConfiguration('seawatts');
      const currentValue = config.get('output.autoShow');
      await config.update('output.autoShow', !currentValue, true);

      vscode.window.showInformationMessage(
        `Auto-show output ${!currentValue ? 'enabled' : 'disabled'}`,
      );
    },
  );
  context.subscriptions.push(toggleAutoShowOutputCommand);

  // Command to toggle auto-clear webhook events
  const toggleAutoClearEventsCommand = vscode.commands.registerCommand(
    'seawatts.toggleAutoClearEvents',
    async () => {
      const config = vscode.workspace.getConfiguration('seawatts');
      const currentValue = config.get('webhookEvents.autoClear');
      await config.update('webhookEvents.autoClear', !currentValue, true);

      vscode.window.showInformationMessage(
        `Auto-clear webhook events ${!currentValue ? 'enabled' : 'disabled'}`,
      );
    },
  );
  context.subscriptions.push(toggleAutoClearEventsCommand);

  // Command to toggle request details view mode
  const toggleRequestDetailsViewCommand = vscode.commands.registerCommand(
    'seawatts.toggleRequestDetailsView',
    async () => {
      const config = vscode.workspace.getConfiguration('seawatts');
      const currentValue = config.get('requestDetails.defaultView');
      const newValue = currentValue === 'raw' ? 'formatted' : 'raw';
      await config.update('requestDetails.defaultView', newValue, true);

      vscode.window.showInformationMessage(
        `Request details view set to ${newValue}`,
      );
    },
  );
  context.subscriptions.push(toggleRequestDetailsViewCommand);
}
