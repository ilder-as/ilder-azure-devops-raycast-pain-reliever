/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Branch Prefix - The prefix to use for branch names (e.g., 'tor/', 'feature/') */
  "branchPrefix": string,
  /** Azure DevOps Organization URL - Your Azure DevOps organization URL (e.g., https://dev.azure.com/myorg) */
  "azureOrganization"?: string,
  /** Azure DevOps Project (Optional) - Default project name - will auto-detect from work item if not specified */
  "azureProject"?: string,
  /** Azure DevOps Repository (Optional) - Repository name for branch operations - defaults to project name if not specified */
  "azureRepository"?: string,
  /** Source Branch - The branch to create new branches from */
  "sourceBranch": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `branchname` command */
  export type Branchname = ExtensionPreferences & {}
  /** Preferences accessible in the `activate-and-branch` command */
  export type ActivateAndBranch = ExtensionPreferences & {}
  /** Preferences accessible in the `check-workitem` command */
  export type CheckWorkitem = ExtensionPreferences & {}
  /** Preferences accessible in the `list-my-workitems` command */
  export type ListMyWorkitems = ExtensionPreferences & {}
  /** Preferences accessible in the `list-backlog` command */
  export type ListBacklog = ExtensionPreferences & {}
  /** Preferences accessible in the `list-builds` command */
  export type ListBuilds = ExtensionPreferences & {}
  /** Preferences accessible in the `list-pull-requests` command */
  export type ListPullRequests = ExtensionPreferences & {}
  /** Preferences accessible in the `create-user-story` command */
  export type CreateUserStory = ExtensionPreferences & {}
  /** Preferences accessible in the `create-work-item` command */
  export type CreateWorkItem = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `branchname` command */
  export type Branchname = {}
  /** Arguments passed to the `activate-and-branch` command */
  export type ActivateAndBranch = {}
  /** Arguments passed to the `check-workitem` command */
  export type CheckWorkitem = {}
  /** Arguments passed to the `list-my-workitems` command */
  export type ListMyWorkitems = {}
  /** Arguments passed to the `list-backlog` command */
  export type ListBacklog = {}
  /** Arguments passed to the `list-builds` command */
  export type ListBuilds = {}
  /** Arguments passed to the `list-pull-requests` command */
  export type ListPullRequests = {}
  /** Arguments passed to the `create-user-story` command */
  export type CreateUserStory = {}
  /** Arguments passed to the `create-work-item` command */
  export type CreateWorkItem = {}
}

