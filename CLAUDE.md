# CLAUDE.md - Azure DevOps Raycast Extension

## Project Overview
This is a Raycast extension for Azure DevOps integration that helps with work item management, branch and PR creation, and monitoring builds. It includes commands to check and list work items, browse backlog, view builds and pull requests, and create new work items.

## Prerequisites and Setup

### Required Tools
- **Azure CLI**: The extension uses the Azure CLI for all Azure DevOps operations
  - Install via Homebrew: `brew install azure-cli`
  - Detection order: `AZ_CLI` env var -> `az` on PATH -> common install paths
  - Must be authenticated: `az login`
  - Install Azure DevOps extension: `az extension add --name azure-devops`

### Configuration
Configure the extension preferences in Raycast settings:
- **Branch Prefix**: Prefix for branch names (e.g., `tor/`, `feature/`)
- **Azure DevOps Organization URL**: Your organization URL (e.g., `https://dev.azure.com/myorg`)
- **Azure DevOps Project**: (Optional) Default project name
- **Azure DevOps Repository**: (Optional) Repository name for branch operations
- **Source Branch**: Branch to create new branches from (default: `main`)

## Commands

### 1. Activate and Branch Work Item (`activate-and-branch`)
- Sets work item to active state
- Assigns work item to current user
- Creates a new branch in Azure DevOps
- Entry point: `src/activate-and-branch.tsx`

### 2. Check Work Item (`check-workitem`)
- Views work item details without making changes
- Generates URLs and suggested branch names
- Entry point: `src/check-workitem.tsx`

### 3. List My Work Items (`list-my-workitems`)
- Lists ALL work item types assigned to the current user (Tasks, User Stories, Bugs, Features, Epics, Product Backlog Items, etc.)
- Shows work item details, state, and last update with type-specific icons
- Filters out completed items (Closed, Removed, Done states)
- Provides actions to open, copy ID, title, or branch name
- Entry point: `src/list-my-workitems.tsx`

### 4. List Backlog (`list-backlog`)
- Browse backlog items with pagination (8 items per page)
- Shows backlog items ordered by StackRank (backlog priority) then creation date
- Includes Product Backlog Items, User Stories, Features, Epics, Bugs, and Tasks
- Client-side pagination with Previous/Next controls (⌘⇧←/⌘⇧→)
- Shows position in overall backlog and current page information
- Entry point: `src/list-backlog.tsx`

### 5. List Builds (`list-builds`)
- View active and recent completed builds
- Auto-refresh every 30 seconds (fixed to respect current page)
- Quick open and PR creation on successful builds
- Entry point: `src/list-builds.tsx`

### 6. List Pull Requests (`list-pull-requests`)
- View active PRs where you’re author or reviewer
- Quick open and copy actions
- Entry point: `src/list-pull-requests.tsx`

### 7. Create Items
- Create User Story (`src/create-user-story.tsx`) and generic Work Item (`src/create-work-item.tsx`)

## Technical Architecture

### Dependencies
- **@raycast/api**: Core Raycast API for UI components and system integration
- **@raycast/utils**: Utility functions for Raycast extensions
- Built with TypeScript and React
 - Azure CLI executed via `execFile` with argument arrays for safety (see `src/az-cli.ts`)

### Code Structure
```
src/
├── az-cli.ts                 # Azure CLI resolver and runner (execFile + args)
├── azure-devops-utils.ts     # Shared helpers (user, branches, PRs, work items)
├── ActivateAndBranchForm.tsx # UI for activate + branch workflow
├── activate-and-branch.tsx   # Command entry
├── check-workitem.tsx        # Work item details viewer
├── list-my-workitems.tsx     # List assigned work items
├── list-backlog.tsx          # Backlog browser with pagination
├── list-builds.tsx           # Builds (active + recent) with auto-refresh
├── BuildLogsView.tsx         # Build details and PR creation from builds
├── list-pull-requests.tsx    # Active PRs (author/reviewer)
├── PullRequestDetailsView.tsx# PR details
├── create-user-story.tsx     # Create user story
└── create-work-item.tsx      # Create generic work item
```

### Azure DevOps Integration
- Uses Azure CLI commands via Node.js `child_process.execFile` through `runAz`
- Safer argument handling (no shell string interpolation)
- Supports organization and project-specific operations
- Automatically detects project from work items when not configured

### Key Functions
- `resolveAz()/runAz()`: Resolve and invoke Azure CLI safely
- `getCurrentUser()`: Get current Azure user via `az account show`
- `fetchWorkItemDetails()`: Retrieve work item details
- `convertToBranchName()`: Convert work item info to branch slug
- `createBranch()/createPullRequestFromWorkItem()`: Branch/PR workflows

## Development Commands
- `npm run dev`: Start development mode
- `npm run build`: Build the extension
- `npm run lint`: Run linting
- `npm run fix-lint`: Fix linting issues

## Error Handling
- Toast notifications for success/error states
- Console error logging for debugging
- Graceful handling of missing Azure CLI or authentication
- Fallback behaviors when optional configurations are missing

## Security Considerations
- Uses system-installed Azure CLI for authentication
- No API keys or secrets stored in extension
- Relies on Azure CLI's built-in authentication mechanisms
- Commands are executed with user's current Azure context

## Azure CLI Command Quirks & Limitations

### Pull Request Commands
Different Azure CLI pull request commands have inconsistent parameter support:

- **`az repos pr list`**: Supports `--organization`, `--project`, and `--repository` parameters
  ```bash
  az repos pr list --status active --organization "https://dev.azure.com/myorg" --project "MyProject" --repository "MyRepo"
  ```

- **`az repos pr show`**: Only supports `--id`, `--organization`, `--detect`, and `--open`
  ```bash
  az repos pr show --id 123 --organization "https://dev.azure.com/myorg"
  ```
  ⚠️ **Important**: `az repos pr show` does NOT support `--project` or `--repository` parameters, despite other `repos` commands supporting them.

### Build Commands
- **`az pipelines build show`**: Supports both `--organization` and `--project` parameters
- **`az pipelines build list`**: Supports both `--organization` and `--project` parameters

### Work Item Commands
- **`az boards work-item show`**: Supports both `--organization` and `--project` parameters
- **`az boards query`**: Supports both `--organization` and `--project` parameters

### General Pattern
Most Azure DevOps CLI commands follow the pattern `--organization` + `--project`, but some commands (particularly `az repos pr show`) have reduced parameter support. Always check command help (`az [command] --help`) when encountering parameter errors.

## UI/UX Guidelines

### Empty State Views
All list components MUST include `List.EmptyView` components to provide friendly user feedback when no items are available:

```tsx
{!isLoading && items.length === 0 ? (
  <List.EmptyView
    icon="🎉"  // Choose appropriate emoji
    title="Friendly Empty State Title"
    description="Helpful description explaining why the list is empty and what users can do"
    actions={
      <ActionPanel>
        <Action
          title="Refresh"
          onAction={refreshFunction}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel>
    }
  />
) : (
  // Regular list content
)}
```

**Required for all list views:**
- `list-my-workitems.tsx` ✅ - "Congratulations! You have no assigned tasks!"
- `list-backlog.tsx` ✅ - Context-aware for "Empty Backlog" vs "No Recent Work Items"
- `list-builds.tsx` ✅ - "No Builds Found"
- `list-pull-requests.tsx` ✅ - "No Pull Requests Found"

**Best Practices:**
- Use appropriate emojis that match the content type
- Provide encouraging/positive messaging when possible
- Include refresh action for easy retry
- Explain possible reasons for empty state
- Only show when `!isLoading` to avoid flashing during data fetching
