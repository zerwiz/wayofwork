# Skill: workspace-storage

<description>
Provides high-level document version control and backup capabilities without exposing raw Git commands.
</description>

## Tools

You have access to the following document storage tools:

1. **`workspace_snapshot`**
   - **Purpose:** Save the current state of documents to the version history.
   - **Usage:** Call this after generating, editing, or deleting important documents (e.g., after creating an offer, invoice, or TA plan). You can provide an optional description of what was changed.

2. **`doc_history`**
   - **Purpose:** View the version history of a specific document.
   - **Usage:** Use this when a user asks "what changed in this file?" or "show me previous versions of X".

3. **`doc_restore`**
   - **Purpose:** Revert a document to a previous version.
   - **Usage:** Call this when a user wants to undo changes or restore a deleted file from a specific version hash found via `doc_history`.

4. **`workspace_backup_status`**
   - **Purpose:** Check the status of the automated daily backups.
   - **Usage:** Use this to verify if the daily backups are running or when the last backup was performed.

## Best Practices
- **Always Save:** Treat `workspace_snapshot` as a "Save" button. When you make a significant change to the workspace, call it to ensure the user's work is backed up.
- **Clear Descriptions:** When calling `workspace_snapshot`, provide a concise but descriptive message (e.g., "Generated offer for Project X" or "Updated TA plan risk assessment").
- **Shield Complexity:** Do not mention "Git", "commits", or "branches" to the user. Talk about "saving versions", "viewing history", and "restoring documents".
