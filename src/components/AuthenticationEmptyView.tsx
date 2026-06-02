import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { getLoginCommand } from "../az-env";

export function AuthenticationEmptyView() {
  const loginCommand = getLoginCommand();

  return (
    <List.EmptyView
      icon="🔐"
      title="Authentication Required"
      description={`Open Terminal and run this command:

${loginCommand}

(Press Enter to copy)`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Login Command"
            content={loginCommand}
            icon={Icon.Clipboard}
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
