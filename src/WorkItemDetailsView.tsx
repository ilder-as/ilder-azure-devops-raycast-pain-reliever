import { Detail, ActionPanel, Action, showToast, Toast, getPreferenceValues, Icon, useNavigation, Clipboard, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { runAz } from "./az-cli";
import ActivateAndBranchForm from "./ActivateAndBranchForm";
import PullRequestDetailsView from "./PullRequestDetailsView";
import { activateAndCreatePR, convertToBranchName, findExistingBranchesForWorkItem } from "./azure-devops-utils";
import { getRelatedWorkItems, WorkItemLite } from "./azure/work-items";
import LinkUserStoryToFeature from "./LinkUserStoryToFeature";


interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

interface WorkItemDetails {
  id: number;
  fields: {
    "System.Title": string;
    "System.Description"?: string;
    "System.WorkItemType": string;
    "System.State": string;
    "System.Reason"?: string;
    "System.AssignedTo"?: {
      displayName: string;
      uniqueName: string;
    };
    "System.CreatedBy"?: {
      displayName: string;
      uniqueName: string;
    };
    "System.TeamProject": string;
    "System.AreaPath"?: string;
    "System.IterationPath"?: string;
    "System.CreatedDate": string;
    "System.ChangedDate": string;
    "System.Tags"?: string;
    "Microsoft.VSTS.Common.Priority"?: number;
    "Microsoft.VSTS.Common.Severity"?: string;
    "Microsoft.VSTS.Common.StackRank"?: number;
    "Microsoft.VSTS.Scheduling.Effort"?: number;
    "Microsoft.VSTS.Scheduling.OriginalEstimate"?: number;
    "Microsoft.VSTS.Scheduling.RemainingWork"?: number;
    "Microsoft.VSTS.Scheduling.CompletedWork"?: number;
    "System.BoardColumn"?: string;
    "System.BoardColumnDone"?: boolean;
  };
}

interface Props {
  workItemId: string;
  initialTitle?: string;
}

export default function WorkItemDetailsView({
  workItemId,
  initialTitle,
}: Props) {
  console.log("[WIDetails] render start", { workItemId });
  const [isLoading, setIsLoading] = useState(true);
  const [workItem, setWorkItem] = useState<WorkItemDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActivatingAndCreatingPR, setIsActivatingAndCreatingPR] =
    useState(false);
  const [existingPR, setExistingPR] = useState<{
    pullRequestId: number;
    title: string;
    project: string;
  } | null>(null);
  const [isCheckingPR, setIsCheckingPR] = useState(false);
  const [relatedBranches, setRelatedBranches] = useState<string[]>([]);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [parentItem, setParentItem] = useState<WorkItemLite | null>(null);
  const [siblingItems, setSiblingItems] = useState<WorkItemLite[]>([]);
  const [relatedItems, setRelatedItems] = useState<WorkItemLite[]>([]);
  const [childItems, setChildItems] = useState<WorkItemLite[]>([]);

  const { push } = useNavigation();

  // WorkItemLite imported from utils

  async function fetchWorkItemDetails() {
    console.log("[WIDetails] fetchWorkItemDetails start", { workItemId });
    setIsLoading(true);
    setError(null);

    try {
      const preferences = getPreferenceValues<Preferences>();

      // Fetch detailed work item information
      const { stdout: workItemJson } = await runAz([
        "boards",
        "work-item",
        "show",
        "--id",
        workItemId,
        "--output",
        "json",
        ...(preferences.azureOrganization
          ? ["--organization", preferences.azureOrganization]
          : []),
      ]);
      const workItemData: WorkItemDetails = JSON.parse(workItemJson);
      console.log("[WIDetails] fetched", {
        id: workItemData?.id,
        title: workItemData?.fields?.["System.Title"],
      });
      setWorkItem(workItemData);
    } catch (error) {
      const errorMessage = "Failed to fetch work item details";
      setError(errorMessage);
      await showToast(Toast.Style.Failure, "Error", errorMessage);
      console.error(error);
    } finally {
      console.log("[WIDetails] fetchWorkItemDetails end");
      setIsLoading(false);
    }
  }

  async function checkForRelatedBranches() {
    try {
      if (!workItem) return;
      const branches = await findExistingBranchesForWorkItem(
        workItem.id.toString(),
        workItem.fields["System.Title"],
      );
      setRelatedBranches(branches);
      console.log("[WIDetails] related branches", branches);
    } catch (e) {
      console.log("Could not check branches:", e);
      setRelatedBranches([]);
    }
  }

  async function fetchRelatedItems() {
    if (!workItem) return;
    console.log("[WIDetails] fetchRelatedItems start");
    setIsLoadingRelations(true);
    try {
      const { parent, siblings, related, children } = await getRelatedWorkItems(
        workItem.id,
      );
      setParentItem(parent);
      setSiblingItems(siblings);
      setRelatedItems(related);
      setChildItems(children);
      console.log("[WIDetails] relations", {
        parent: parent?.id,
        siblings: siblings.length,
        related: related.length,
        children: children.length,
      });
    } catch (e) {
      console.log("Failed to fetch related items:")
      setParentItem(null);
      setSiblingItems([]);
      setRelatedItems([]);
    } finally {
      console.log("[WIDetails] fetchRelatedItems end");
      setIsLoadingRelations(false);
    }
  }

  // fetchWorkItemLite moved to utils

  function cleanDescription(desc?: string): string {
    if (!desc) return "";
    return desc
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+$/g, "")
      .trim();
  }

  async function handleCopyContextForAI() {
    if (!workItem) return;

    try {
      const { parent, siblings, related, children } = await getRelatedWorkItems(
        workItem.id,
      );

      const selfTitle = workItem.fields["System.Title"];
      const selfDesc = cleanDescription(workItem.fields["System.Description"]);

      let context = `#${workItem.id}: ${selfTitle}`;
      if (selfDesc) {
        context += `\n\nDescription:\n${selfDesc}`;
      }

      const lines: string[] = [];
      if (parent) {
        const pDesc = cleanDescription(parent.description);
        lines.push(`Parent #${parent.id}: ${parent.title}${pDesc ? `\n${pDesc}` : ""}`);
      }
      if (siblings.length) {
        lines.push("Siblings:");
        siblings.forEach((s) => {
          const sDesc = cleanDescription(s.description);
          lines.push(`- #${s.id}: ${s.title}${sDesc ? `\n  ${sDesc}` : ""}`);
        });
      }
      if (related.length) {
        lines.push("Related:");
        related.forEach((r) => {
          const rDesc = cleanDescription(r.description);
          lines.push(`- #${r.id}: ${r.title}${rDesc ? `\n  ${rDesc}` : ""}`);
        });
      }

      if (children.length) {
        lines.push("Children:");
        children.forEach((c) => {
          const cDesc = cleanDescription(c.description);
          lines.push(`- #${c.id}: ${c.title}${cDesc ? `\n  ${cDesc}` : ""}`);
        });
      }

      if (lines.length) {
        context += `\n\nThis is related information:\n${lines.join("\n\n")}`;
      }

      await Clipboard.copy(context);
      await showToast(Toast.Style.Success, "Copied AI context");
    } catch (e) {
      console.error("Failed to build AI context", e);
      await showToast(Toast.Style.Failure, "Error", "Could not copy AI context");
    }
  }

  async function checkForExistingPR() {
    console.log("[WIDetails] checkForExistingPR start");
    if (!workItem) return;

    setIsCheckingPR(true);

    try {
      const preferences = getPreferenceValues<Preferences>();

      if (!preferences.azureOrganization || !preferences.azureProject) {
        return;
      }

      // Expected branch based on current user's prefix
      const expectedBranch = convertToBranchName(
        workItem.id.toString(),
        workItem.fields["System.Title"],
        preferences.branchPrefix,
      );

      // Also look for any other branches for this WI
      const found = await findExistingBranchesForWorkItem(
        workItem.id.toString(),
        workItem.fields["System.Title"],
      );
      setRelatedBranches(found);

      const branchesToCheck = Array.from(new Set([expectedBranch, ...found]));

      const repositoryName =
        preferences.azureRepository || preferences.azureProject;

      // Search for active PRs from any of the candidate branches
      for (const sourceBranch of branchesToCheck) {
        try {
          const { stdout: prResult } = await runAz([
            "repos",
            "pr",
            "list",
            "--source-branch",
            sourceBranch,
            "--status",
            "active",
            "--output",
            "json",
            "--organization",
            preferences.azureOrganization!,
            "--project",
            preferences.azureProject!,
            "--repository",
            repositoryName,
          ]);
          const prs = JSON.parse(prResult);
          if (prs && prs.length > 0) {
            const pr = prs[0];
            setExistingPR({
              pullRequestId: pr.pullRequestId,
              title: pr.title,
              project:
                pr.repository?.project?.name ||
                preferences.azureProject ||
                "Unknown",
            });
            console.log("[WIDetails] found PR", pr.pullRequestId);
            return; // Found a PR; we can stop checking further
          }
        } catch (e) {
          // Ignore per-branch failures and continue
          console.log("PR check failed for branch", sourceBranch, e);
        }
      }

      // No PRs found across any branches
      setExistingPR(null);
    } catch (error) {
      // Silently fail - PR checking is optional
      console.log("Could not check for existing PRs:", error);
      setExistingPR(null);
    } finally {
      console.log("[WIDetails] checkForExistingPR end");
      setIsCheckingPR(false);
    }
  }

  function getWorkItemUrl(): string {
    if (!workItem) return "";

    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization) return "";

    const projectFromWorkItem = workItem.fields["System.TeamProject"];
    const projectToUse =
      projectFromWorkItem || preferences.azureProject || "Unknown";

    return `${preferences.azureOrganization}/${encodeURIComponent(projectToUse)}/_workitems/edit/${workItem.id}`;
  }

  function getWorkItemTypeIcon(type: string): string {
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case "bug":
        return "🐛";
      case "task":
        return "✅";
      case "user story":
      case "story":
        return "👤";
      case "product backlog item":
      case "pbi":
        return "📋";
      case "feature":
        return "⭐";
      case "epic":
        return "👑";
      case "issue":
        return "❗";
      case "test case":
        return "🧪";
      case "test suite":
        return "📁";
      case "test plan":
        return "📄";
      case "requirement":
        return "📝";
      case "code review request":
        return "👁";
      default:
        return "⚪";
    }
  }

  function getStateColor(state: string): string {
    const lowerState = state.toLowerCase();
    switch (lowerState) {
      case "new":
      case "to do":
      case "proposed":
        return "🔵";
      case "active":
      case "in progress":
      case "committed":
      case "approved":
        return "🟠";
      case "resolved":
      case "done":
      case "completed":
        return "🟢";
      case "closed":
      case "removed":
        return "⚪";
      case "blocked":
      case "on hold":
        return "🔴";
      default:
        return "⚫";
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }


  function generateMarkdown(): string {
    try {
      console.log("[WIDetails] generateMarkdown start", {
        hasWorkItem: !!workItem,
        isLoading,
        isCheckingPR,
        isLoadingRelations,
      });
    } catch {}
    if (!workItem) return "Loading work item details...";

    const preferences = getPreferenceValues<Preferences>();
    const branchName = convertToBranchName(
      workItem.id.toString(),
      workItem.fields["System.Title"],
      preferences.branchPrefix,
    );

    const typeIcon = getWorkItemTypeIcon(
      workItem.fields["System.WorkItemType"],
    );
    const stateColor = getStateColor(workItem.fields["System.State"]);

    let markdown = `# ${typeIcon} ${workItem.fields["System.Title"]}\n\n`;

    // Compact metadata in a horizontal layout
    markdown += `${stateColor} **${workItem.fields["System.State"]}** • `;
    markdown += `#${workItem.id} • `;
    markdown += `${workItem.fields["System.WorkItemType"]} • `;

    if (workItem.fields["System.AssignedTo"]) {
      markdown += `👤 ${workItem.fields["System.AssignedTo"].displayName} • `;
    } else {
      markdown += `👤 Unassigned • `;
    }

    markdown += `📁 ${workItem.fields["System.TeamProject"]}`;

    // Add priority and effort if available
    const importantMetadata = [];
    if (workItem.fields["Microsoft.VSTS.Common.Priority"]) {
      importantMetadata.push(
        `⚡ P${workItem.fields["Microsoft.VSTS.Common.Priority"]}`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Scheduling.Effort"]) {
      importantMetadata.push(
        `🎯 ${workItem.fields["Microsoft.VSTS.Scheduling.Effort"]}pts`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Scheduling.RemainingWork"]) {
      importantMetadata.push(
        `⏱️ ${workItem.fields["Microsoft.VSTS.Scheduling.RemainingWork"]}h`,
      );
    }

    if (importantMetadata.length > 0) {
      markdown += ` • ${importantMetadata.join(" • ")}`;
    }

    markdown += `\n\n`;

    // Tags prominently displayed
    if (workItem.fields["System.Tags"]) {
      const tags = workItem.fields["System.Tags"]
        .split(";")
        .map((tag) => tag.trim())
        .filter((tag) => tag);
      markdown += `🏷️ ${tags.map((tag) => `\`${tag}\``).join(" ")} \n\n`;
    }

    // Description (main content)
    if (workItem.fields["System.Description"]) {
      const description = workItem.fields["System.Description"]
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
        .replace(/&amp;/g, "&") // Decode ampersands
        .replace(/&lt;/g, "<") // Decode less-than
        .replace(/&gt;/g, ">") // Decode greater-than
        .replace(/&quot;/g, '"') // Decode quotes
        .trim();

      if (description) {
        markdown += `${description}\n\n`;
      }
    }

    // Compact details section at the bottom
    markdown += `---\n\n`;

    // Create a compact 3-column layout for detailed metadata
    const leftColumn = [];
    const middleColumn = [];
    const rightColumn = [];

    // Left column - Core info
    if (workItem.fields["System.AreaPath"]) {
      leftColumn.push(`**Area:** ${workItem.fields["System.AreaPath"]}`);
    }
    if (workItem.fields["System.IterationPath"]) {
      leftColumn.push(
        `**Iteration:** ${workItem.fields["System.IterationPath"]}`,
      );
    }
    if (workItem.fields["System.BoardColumn"]) {
      leftColumn.push(`**Column:** ${workItem.fields["System.BoardColumn"]}`);
    }
    if (workItem.fields["System.Reason"]) {
      leftColumn.push(`**Reason:** ${workItem.fields["System.Reason"]}`);
    }

    // Middle column - Planning
    if (workItem.fields["Microsoft.VSTS.Common.Severity"]) {
      middleColumn.push(
        `**Severity:** ${workItem.fields["Microsoft.VSTS.Common.Severity"]}`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Common.StackRank"]) {
      middleColumn.push(
        `**Rank:** ${workItem.fields["Microsoft.VSTS.Common.StackRank"]}`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"]) {
      middleColumn.push(
        `**Original:** ${workItem.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"]}h`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Scheduling.CompletedWork"]) {
      middleColumn.push(
        `**Completed:** ${workItem.fields["Microsoft.VSTS.Scheduling.CompletedWork"]}h`,
      );
    }

    // Right column - Dates and people
    if (workItem.fields["System.CreatedBy"]) {
      rightColumn.push(
        `**Created by:** ${workItem.fields["System.CreatedBy"].displayName}`,
      );
    }
    rightColumn.push(
      `**Created:** ${formatDate(workItem.fields["System.CreatedDate"])}`,
    );
    rightColumn.push(
      `**Modified:** ${formatDate(workItem.fields["System.ChangedDate"])}`,
    );

    // Only show detailed metadata if we have any
    if (
      leftColumn.length > 0 ||
      middleColumn.length > 0 ||
      rightColumn.length > 0
    ) {
      // Simple vertical list instead of complex table layout
      const allDetails = [...leftColumn, ...middleColumn, ...rightColumn];
      if (allDetails.length > 0) {
        markdown += `**Details:**  \n`;
        markdown += allDetails.join(" • ");
        markdown += `\n\n`;
      }
    }

    // Branch info — prefer showing any existing remote branches regardless of owner
    if (relatedBranches.length > 0) {
      const shown = relatedBranches.slice(0, 2).map((b) => `\`${b}\``).join(", ");
      const extra = relatedBranches.length > 2 ? ` (+${relatedBranches.length - 2} more)` : "";
      markdown += `**Active Branch${relatedBranches.length > 1 ? "es" : ""}:** ${shown}${extra}\n\n`;
    } else {
      // Suggested Branch Name (fallback)
      markdown += `**Branch:** \`${branchName}\`\n\n`;
    }

    // Related items section (loaded asynchronously) with clickable links
    markdown += `---\n\n`;
    const org = getPreferenceValues<Preferences>().azureOrganization;
    const currentProject = workItem.fields["System.TeamProject"];
    const makeLink = (id: number, title: string, teamProject?: string) => {
      if (!org) return `#${id} ${title}`;
      const project = teamProject || currentProject;
      const url = `${org}/${encodeURIComponent(project)}/_workitems/edit/${id}`;
      const safeTitle = title || "Untitled";
      return `[#${id} ${safeTitle}](${url})`;
    };

    if (isLoadingRelations) {
      markdown += `Loading related work items...\n`;
    } else {
      const lines: string[] = [];
      // Parent section on its own line
      if (parentItem) {
        const pIcon = getWorkItemTypeIcon(parentItem.type || "");
        lines.push(`Parent:`);
        lines.push(`- ${pIcon} ${makeLink(parentItem.id, parentItem.title, (parentItem as any).teamProject)}${(parentItem as any).state ? ` • ${(parentItem as any).state}` : ""}`);
        lines.push(""); // blank line
      }
      // Siblings
      if (siblingItems.length) {
        lines.push("Siblings:");
        siblingItems.forEach((s) => {
          const sIcon = getWorkItemTypeIcon((s as any).type || "");
          lines.push(`- ${sIcon} ${makeLink(s.id, s.title, (s as any).teamProject)}${(s as any).state ? ` • ${(s as any).state}` : ""}`);
        });
        lines.push("");
      }
      // Children
      if (childItems.length) {
        lines.push("Children:");
        childItems.forEach((c) => {
          const cIcon = getWorkItemTypeIcon((c as any).type || "");
          lines.push(`- ${cIcon} ${makeLink(c.id, c.title, (c as any).teamProject)}${(c as any).state ? ` • ${(c as any).state}` : ""}`);
        });
        lines.push("");
      }
      // Related
      if (relatedItems.length) {
        lines.push("Related:");
        relatedItems.forEach((r) => {
          const rIcon = getWorkItemTypeIcon((r as any).type || "");
          lines.push(`- ${rIcon} ${makeLink(r.id, r.title, (r as any).teamProject)}${(r as any).state ? ` • ${(r as any).state}` : ""}`);
        });
        lines.push("");
      }
      if (lines.length) {
        markdown += lines.join("\n") + "\n";
      } else {
        markdown += "No related items found.\n";
      }
    }

    console.log("[WIDetails] generateMarkdown end", { length: markdown.length });
    return markdown;
  }

  async function handleActivateAndCreatePR() {
    if (!workItem) return;

    setIsActivatingAndCreatingPR(true);

    try {
      const result = await activateAndCreatePR(workItem.id.toString());

      if (result.success && result.prResult) {
        // Navigate to PR details view
        push(
          <PullRequestDetailsView
            pullRequestId={result.prResult.pullRequestId.toString()}
            initialTitle={result.prResult.title}
            project={result.prResult.project}
          />,
        );
      }
    } catch (error) {
      console.error("Failed to activate and create PR:", error);
    } finally {
      setIsActivatingAndCreatingPR(false);
    }
  }

  function handleOpenExistingPR() {
    if (!existingPR) return;

    push(
      <PullRequestDetailsView
        pullRequestId={existingPR.pullRequestId.toString()}
        initialTitle={existingPR.title}
        project={existingPR.project}
      />,
    );
  }

  useEffect(() => {
    fetchWorkItemDetails();
  }, [workItemId]);

  useEffect(() => {
    if (workItem) {
      checkForExistingPR();
    }
  }, [workItem]);

  useEffect(() => {
    if (workItem) {
      fetchRelatedItems();
    }
  }, [workItem]);

  const workItemUrl = getWorkItemUrl();
  const preferences = getPreferenceValues<Preferences>();
  const branchName = workItem
    ? convertToBranchName(
        workItem.id.toString(),
        workItem.fields["System.Title"],
        preferences.branchPrefix,
      )
    : "";

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}\n\nWork Item ID: ${workItemId}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={fetchWorkItemDetails}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading || isActivatingAndCreatingPR || isCheckingPR}
      markdown={generateMarkdown()}
      navigationTitle={initialTitle || `Work Item #${workItemId}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Work Item Actions">
            {workItem && (
              <>
                {existingPR ? (
                  <Action
                    title="View Pull Request"
                    onAction={handleOpenExistingPR}
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                ) : (
                  <Action
                    title="Activate & Create Pull Request"
                    onAction={handleActivateAndCreatePR}
                    icon={Icon.PlusCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                )}
                <Action
                  title="Activate & Create Branch"
                  icon={Icon.Rocket}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  onAction={() =>
                    push(
                      <ActivateAndBranchForm
                        initialWorkItemId={workItem.id.toString()}
                      />,
                    )
                  }
                />
                <Action
                  title="Copy Context for AI"
                  onAction={handleCopyContextForAI}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                {(() => {
                  const type = workItem.fields["System.WorkItemType"].toLowerCase();
                  const isStory = type === "user story" || type === "product backlog item" || type === "pbi";
                  return isStory ? (
                    <Action
                      title="Link to Feature…"
                      icon={Icon.Link}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                      onAction={() =>
                        push(
                          <LinkUserStoryToFeature
                            workItemId={workItem.id}
                            onLinked={() => {
                              fetchRelatedItems();
                              fetchWorkItemDetails();
                            }}
                          />,
                        )
                      }
                    />
                  ) : null;
                })()}
                {(!!parentItem || siblingItems.length > 0 || relatedItems.length > 0 || childItems.length > 0) && (
                  <Action
                    title="Browse Related Items"
                    icon={Icon.List}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={() =>
                      push(
                        <RelatedItemsList
                          parentItem={parentItem}
                          siblingItems={siblingItems}
                          relatedItems={relatedItems}
                          childItems={childItems}
                        />,
                      )
                    }
                  />
                )}
              </>
            )}
            {Boolean(workItemUrl) && (
              <Action.OpenInBrowser
                title="Open in Azure DevOps"
                url={workItemUrl}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            {workItem && (
              <>
                <Action.CopyToClipboard
                  title="Copy Work Item ID"
                  content={workItem.id.toString()}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Work Item Title"
                  content={workItem.fields["System.Title"]}
                  icon={Icon.Text}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
                <Action.CopyToClipboard
                  title="Copy Branch Name"
                  content={branchName}
                  icon={Icon.Code}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="View Actions">
            <Action
              title="Refresh"
              onAction={fetchWorkItemDetails}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function RelatedItemsList({
  parentItem,
  siblingItems,
  relatedItems,
  childItems,
}: {
  parentItem: { id: number; title: string } | null;
  siblingItems: { id: number; title: string }[];
  relatedItems: { id: number; title: string }[];
  childItems: { id: number; title: string }[];
}) {
  const { push } = useNavigation();

  const open = (id: number, title?: string) =>
    push(<WorkItemDetailsView workItemId={String(id)} initialTitle={title} />);

  const items: Array<{ id: number; title: string; section: string }> = [];
  if (parentItem) items.push({ id: parentItem.id, title: parentItem.title, section: "Parent" });
  siblingItems.forEach((s) => items.push({ id: s.id, title: s.title, section: "Siblings" }));
  relatedItems.forEach((r) => items.push({ id: r.id, title: r.title, section: "Related" }));
  childItems.forEach((c) => items.push({ id: c.id, title: c.title, section: "Children" }));

  return (
    <List searchBarPlaceholder="Filter related work items...">
      {parentItem && (
        <List.Section title="Parent">
          <List.Item
            key={`p-${parentItem.id}`}
            title={`#${parentItem.id}: ${parentItem.title || "Untitled"}`}
            icon={Icon.ArrowUp}
            actions={
              <ActionPanel>
                <Action
                  title="Open Work Item"
                  icon={Icon.Eye}
                  onAction={() => open(parentItem.id, parentItem.title)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {siblingItems.length > 0 && (
        <List.Section title="Siblings">
          {siblingItems.map((s) => (
            <List.Item
              key={`s-${s.id}`}
              title={`#${s.id}: ${s.title || "Untitled"}`}
              icon={Icon.ArrowRight}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Work Item"
                    icon={Icon.Eye}
                    onAction={() => open(s.id, s.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {relatedItems.length > 0 && (
        <List.Section title="Related">
          {relatedItems.map((r) => (
            <List.Item
              key={`r-${r.id}`}
              title={`#${r.id}: ${r.title || "Untitled"}`}
              icon={Icon.Link}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Work Item"
                    icon={Icon.Eye}
                    onAction={() => open(r.id, r.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {childItems.length > 0 && (
        <List.Section title="Children">
          {childItems.map((c) => (
            <List.Item
              key={`c-${c.id}`}
              title={`#${c.id}: ${c.title || "Untitled"}`}
              icon={Icon.ArrowDown}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Work Item"
                    icon={Icon.Eye}
                    onAction={() => open(c.id, c.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
