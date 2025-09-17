import { getPreferenceValues } from "@raycast/api";
import { WorkItemDetails, WorkItemRelationsData, Preferences } from "../types/work-item";
import { WorkItemLite, WorkItemComment } from "../azure-devops";
import { getWorkItemTypeIcon } from "./WorkItemMetadata";

interface WorkItemRelationsProps {
  workItem: WorkItemDetails;
  relations: WorkItemRelationsData;
  isLoadingRelations: boolean;
  comments: WorkItemComment[];
  isLoadingComments: boolean;
}

export function generateRelationsMarkdown({
  workItem,
  relations,
  isLoadingRelations,
  comments,
  isLoadingComments,
}: WorkItemRelationsProps): string {
  let markdown = `---\n\n`;
  
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
    if (relations.parentItem) {
      const pIcon = getWorkItemTypeIcon(relations.parentItem.type || "");
      lines.push(`Parent:`);
      lines.push(`- ${pIcon} ${makeLink(relations.parentItem.id, relations.parentItem.title, (relations.parentItem as any).teamProject)}${(relations.parentItem as any).state ? ` • ${(relations.parentItem as any).state}` : ""}`);
      lines.push(""); // blank line
    }
    
    // Siblings
    if (relations.siblingItems.length) {
      lines.push("Siblings:");
      relations.siblingItems.forEach((s) => {
        const sIcon = getWorkItemTypeIcon((s as any).type || "");
        lines.push(`- ${sIcon} ${makeLink(s.id, s.title, (s as any).teamProject)}${(s as any).state ? ` • ${(s as any).state}` : ""}`);
      });
      lines.push("");
    }
    
    // Children
    if (relations.childItems.length) {
      lines.push("Children:");
      relations.childItems.forEach((c) => {
        const cIcon = getWorkItemTypeIcon((c as any).type || "");
        lines.push(`- ${cIcon} ${makeLink(c.id, c.title, (c as any).teamProject)}${(c as any).state ? ` • ${(c as any).state}` : ""}`);
      });
      lines.push("");
    }
    
    // Related
    if (relations.relatedItems.length) {
      lines.push("Related:");
      relations.relatedItems.forEach((r) => {
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

  // Comments section
  markdown += `---\n\n`;
  
  if (isLoadingComments) {
    markdown += `Loading comments...\n`;
  } else if (comments.length > 0) {
    markdown += `## Comments (${comments.length})\n\n`;
    
    // Sort comments by date (newest first)
    const sortedComments = [...comments].sort((a, b) => 
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
    
    // Show only the 3 most recent comments to keep the view concise
    const recentComments = sortedComments.slice(0, 3);
    
    recentComments.forEach((comment, index) => {
      const date = new Date(comment.createdDate).toLocaleDateString();
      const time = new Date(comment.createdDate).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      markdown += `**${comment.createdBy.displayName}** - ${date} at ${time}\n`;
      
      // Clean and format comment text
      const cleanText = comment.text
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
        .replace(/&amp;/g, "&") // Decode ampersands
        .replace(/&lt;/g, "<") // Decode less-than
        .replace(/&gt;/g, ">") // Decode greater-than
        .replace(/&quot;/g, '"') // Decode quotes
        .trim();
      
      markdown += `> ${cleanText}\n\n`;
    });
    
    if (comments.length > 3) {
      markdown += `*... and ${comments.length - 3} more comments*\n\n`;
    }
  } else {
    markdown += `## Comments\n\nNo comments yet.\n\n`;
  }

  return markdown;
}