import { Form, ActionPanel, Action, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import WorkItemDetailsView from "./WorkItemDetailsView";

export default function Command() {
  const [workItemId, setWorkItemId] = useState("");
  const { push } = useNavigation();

  function openDetails(id: string) {
    const trimmed = id.trim();
    if (!trimmed) {
      showToast(Toast.Style.Failure, "Enter a Work Item ID");
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      showToast(Toast.Style.Failure, "Work Item ID must be a number");
      return;
    }
    push(<WorkItemDetailsView workItemId={trimmed} initialTitle={`#${trimmed}`} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open Work Item"
            icon={Icon.MagnifyingGlass}
            onSubmit={(values: { workItemId?: string }) =>
              openDetails(values.workItemId || workItemId)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="workItemId"
        title="Work Item ID"
        placeholder="Enter work item ID (e.g., 109)"
        value={workItemId}
        onChange={setWorkItemId}
        onBlur={(e) => setWorkItemId(e.target.value.trim())}
      />
    </Form>
  );
}
