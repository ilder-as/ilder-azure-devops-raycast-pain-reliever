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
  /** Azure DevOps Project (Optional) - Default project name for Azure DevOps queries */
  "azureProject"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `branchname` command */
  export type Branchname = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `branchname` command */
  export type Branchname = {}
}

