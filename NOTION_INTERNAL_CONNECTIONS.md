
# How to connect to Notion API:

Guide based on the following guide:
https://developers.notion.com/guides/get-started/internal-connections

> ⚠️ You **must** be the Owner or an Admin of the Workspace to create an integration.

## Steps

### 1️⃣ Create a Notion Integration

Notion Integrations are the way that we'll use to allow the application to connect to Notion and manage the scopes of access.

> Visit: https://www.notion.so/my-integrations

1. Click the "New integration" button.
2. Fill in the required information:
    - Name: "Notion DB Engine for project ..."
    - Authentication method: `Access Token`
    - Installable in: `<your-workspace>`


### 2️⃣ Configure the permissions

We will configure what pages will the API KEY will have access to, and the read/write/comment permissions.

The API key will only have access to the pages that are explicitly shared with it (and sub-pages recursively).

1. Click on the tab `Content access` inside the integration settings.
2. Select `Edit access` and choose a page (only top-level pages can be selected here)

> `Top-Level Page` is a page that is not a sub-page of any other page (it doesn't have a parent). This are the pages that appear in the sidebar of Notion,  such as `Workspaces`, `Shared`, `Private`.

3. Go back to the tab `Configuration`, and in the `Capabilities` section, configure the Read/Update/Insert content, comments and user information permissions.
4. Click on `Save connection` button.