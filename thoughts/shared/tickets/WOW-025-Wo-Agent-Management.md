# Ticket: [WOW-025] Wo Agent Management and "My AI Team" Restoration

## Objective
Migrate the existing "My AI Team" functionality from legacy "Pi" agents to the new "Wo" agent system, ensuring proper agent discovery, team management, and UI integration.

## Problem Statement
The current system retains references to "Pi" agents and their `.pi/agents` configuration, leading to an inconsistent experience where the "My AI Team" section either displays no agents or operates on outdated agent definitions. This hinders the ability to manage "Wo" agents effectively.

## Desired Outcome
- "My AI Team" section correctly discovers, displays, and manages "Wo" agents.
- Users can create, edit, and define teams for "Wo" agents through the UI.
- All legacy "Pi" agent references are replaced with "Wo" agent terminology.

## Requirements
### Functional Requirements
- [ ] **Agent Discovery:** Update agent discovery mechanisms to scan `.wo/agents/` (and potentially other "Wo" designated agent paths) instead of `.pi/agents/`.
- [ ] **Agent Roster Management:** Rework `teams.yaml` parsing and creation to specifically manage `Wo` agents.
- [ ] **UI Renaming:** Update all UI elements related to "Pi" agents and "My AI Team" to reflect "Wo" agent branding.
- [ ] **Agent Editing:** Ensure the "Edit prompt on an agent" functionality correctly targets and modifies `Wo` agent Markdown bodies and frontmatter.
- [ ] **Team Creation:** Restore/implement the ability to create new agent teams, linking them to discovered `Wo` agents.

### Technical Requirements
- [ ] **Backend API Audit:** Review `server/agents.ts` and related API endpoints (`/api/agents`) to ensure they correctly interact with the `.wo/agents` directory.
- [ ] **Frontend Component Update:** Modify `SimpleTeamView.tsx` and any other relevant frontend components to use the new "Wo" agent APIs and display logic.
- [ ] **Configuration File Update:** Ensure agent configuration files (e.g., `teams.yaml`) are correctly located and managed within the `.wo/` directory structure.

## Acceptance Criteria
- "My AI Team" tab in Simple mode correctly lists available "Wo" agents.
- Creating a new agent or team functions as expected for "Wo" agents.
- No visible "Pi" agent terminology in the agent management UI.

## Meta
**Created**: 2026-05-23
**Priority**: High
**Estimated Effort**: M