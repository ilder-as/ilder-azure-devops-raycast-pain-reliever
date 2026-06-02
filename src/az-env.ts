/**
 * Isolated Azure CLI environment for this extension.
 *
 * The extension must NOT share the global ~/.azure config with the user's
 * terminal: switching subscriptions there (especially across Entra tenants)
 * flips the globally-active account out from under the extension and forces a
 * re-login. By pinning AZURE_CONFIG_DIR to a private directory, the extension
 * keeps its own login/account state, decoupled from terminal activity.
 */

import { getPreferenceValues } from "@raycast/api";
import * as os from "os";
import * as path from "path";
import type { Preferences } from "./azure-devops/types";

/**
 * The dedicated config directory for this extension's Azure CLI state.
 * Uses the `azureConfigDir` preference when set, otherwise ~/.azure-raycast.
 */
export function getAzureConfigDir(): string {
  const { azureConfigDir } = getPreferenceValues<Preferences>();
  const configured = azureConfigDir?.trim();
  if (configured) {
    return configured.startsWith("~")
      ? path.join(os.homedir(), configured.slice(1))
      : configured;
  }
  return path.join(os.homedir(), ".azure-raycast");
}

/**
 * Environment to pass to every `az` invocation so it reads/writes the isolated
 * config dir. Extension binaries are reused from the standard location so the
 * isolated dir does not need its own `az extension add`.
 */
export function azEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    AZURE_CONFIG_DIR: getAzureConfigDir(),
    AZURE_EXTENSION_DIR:
      process.env.AZURE_EXTENSION_DIR ??
      path.join(os.homedir(), ".azure", "cliextensions"),
  };
}

/**
 * Single source of truth for the one-time login command shown to the user.
 * Targets the isolated config dir so the login actually fixes the re-login
 * problem (a plain `az login` would log into the shared dir instead).
 */
export function getLoginCommand(): string {
  const { azureTenant } = getPreferenceValues<Preferences>();
  const configDir = getAzureConfigDir();
  const tenantSuffix = azureTenant?.trim()
    ? ` --tenant ${azureTenant.trim()}`
    : "";
  return `AZURE_CONFIG_DIR="${configDir}" az login${tenantSuffix}`;
}
