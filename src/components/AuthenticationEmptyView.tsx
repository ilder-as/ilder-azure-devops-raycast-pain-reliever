import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";

interface Preferences {
  azureOrganization?: string;
  azureProject?: string;
}

export function AuthenticationEmptyView() {
  const preferences = getPreferenceValues<Preferences>();

  // Generate dynamic setup command based on preferences
  let setupCommand = "az login && az extension add --name azure-devops";

  if (preferences.azureOrganization || preferences.azureProject) {
    setupCommand += " && az devops configure --defaults";
    if (preferences.azureOrganization) {
      setupCommand += ` organization=${preferences.azureOrganization}`;
    }
    if (preferences.azureProject) {
      setupCommand += ` project=${preferences.azureProject}`;
    }
  }

  return (
    <List.EmptyView
      icon="🔐"
      title="Authentication Required"
      description={`Open Terminal and run this command:

az login

(Press Enter to copy)`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy: Az Login"
            content="az login"
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            title="Copy Full Setup Commands"
            content={setupCommand}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            icon={Icon.Code}
          />
          <Action.OpenInBrowser
            title="Azure Devops Cli Documentation"
            url="https://aka.ms/azure-devops-cli-auth"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}
