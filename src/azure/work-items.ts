import { getPreferenceValues } from "@raycast/api";
import { runAz } from "../az-cli";

interface Preferences {
  azureOrganization?: string;
  azureProject?: string;
}

export interface WorkItemLite {
  id: number;
  title: string;
  description?: string;
  type?: string;
  teamProject?: string;
  state?: string;
}

interface RelationItem {
  rel: string;
  url: string;
}

export async function getWorkItemLite(id: number): Promise<WorkItemLite | null> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const { stdout } = await runAz([
      "boards",
      "work-item",
      "show",
      "--id",
      String(id),
      "--output",
      "json",
      ...(preferences.azureOrganization
        ? ["--organization", preferences.azureOrganization]
        : []),
    ]);
    const json = JSON.parse(stdout);
    return {
      id,
      title: json.fields?.["System.Title"] || "Untitled",
      description: json.fields?.["System.Description"],
      type: json.fields?.["System.WorkItemType"],
      teamProject: json.fields?.["System.TeamProject"],
      state: json.fields?.["System.State"],
    };
  } catch (e) {
    console.error("Failed to fetch WorkItemLite", id, e);
    return null;
  }
}

export async function getRelatedWorkItems(
  workItemId: number,
): Promise<{
  parent: WorkItemLite | null;
  siblings: WorkItemLite[];
  related: WorkItemLite[];
}> {
  const preferences = getPreferenceValues<Preferences>();

  const extractId = (url: string): number | null => {
    const m = url.match(/workItems\/(\d+)/i);
    return m ? Number(m[1]) : null;
  };

  let parent: WorkItemLite | null = null;
  let siblings: WorkItemLite[] = [];
  let relatedItems: WorkItemLite[] = [];

  const { stdout: relStdout } = await runAz([
    "boards",
    "work-item",
    "show",
    "--id",
    String(workItemId),
    "--output",
    "json",
    "--expand",
    "relations",
    ...(preferences.azureOrganization
      ? ["--organization", preferences.azureOrganization]
      : []),
  ]);
  const withRels = JSON.parse(relStdout);
  const relations: RelationItem[] = withRels.relations || [];

  const parentRel = relations.find((r) =>
    r.rel?.toLowerCase().includes("hierarchy-reverse"),
  );
  if (parentRel) {
    const parentId = extractId(parentRel.url);
    if (parentId) {
      parent = await getWorkItemLite(parentId);
      const { stdout: parentRelsStdout } = await runAz([
        "boards",
        "work-item",
        "show",
        "--id",
        String(parentId),
        "--output",
        "json",
        "--expand",
        "relations",
        ...(preferences.azureOrganization
          ? ["--organization", preferences.azureOrganization]
          : []),
      ]);
      const parentWithRels = JSON.parse(parentRelsStdout);
      const parentRels: RelationItem[] = parentWithRels.relations || [];
      const childIds = parentRels
        .filter((r) => r.rel?.toLowerCase().includes("hierarchy-forward"))
        .map((r) => extractId(r.url))
        .filter((id): id is number => !!id && id !== workItemId)
        .slice(0, 25);
      if (childIds.length) {
        const fetched = await Promise.all(childIds.map((id) => getWorkItemLite(id)));
        siblings = fetched.filter((w): w is WorkItemLite => !!w);
      }
    }
  }

  const relatedIds = relations
    .filter((r) => r.rel?.toLowerCase().includes("system.linktypes.related"))
    .map((r) => extractId(r.url))
    .filter((id): id is number => !!id)
    .slice(0, 25);
  if (relatedIds.length) {
    const fetched = await Promise.all(relatedIds.map((id) => getWorkItemLite(id)));
    relatedItems = fetched.filter((w): w is WorkItemLite => !!w);
  }

  return { parent, siblings, related: relatedItems };
}
