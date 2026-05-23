# Ticket: Systematic Rebrand and Cleanup: wayofpi → wayofwork, Technical → Simple/Claw

## Objective
1. Systematically purge all "wayofpi" references (rebrand to "wayofwork").
2. Investigate components mislabeled as "Technical" to identify if they are actually used by "Simple" or "Claw" modes.
3. [BLOCKED] Remove/deprecate truly dead "Technical Mode" components.

## Background
The application has undergone a rebrand. "Technical" mode terminology has been incorrectly applied to functional components in Simple/Claw modes. **Strict "No Deletion" and "No Modification" policy in effect for all 'Technical' labeled code.**

## Investigation & Tracking
- [ ] **Audit:** Map all imports of `src/components/technical/` in `Simple` and `Claw` modes.
- [ ] **Verification:** Determine if these components are essential for `Simple`/`Claw` UI/UX.
- [ ] **Rename Plan:** Identify components that should be moved/renamed out of `technical/` into `simple/`, `claw/`, or `ui/`.

## Rebranding Plan (Cosmetic Only)
- [ ] Rename internal UI labels, documentation strings, and comments.

## Current Findings
- *Constraint:* **DO NOT touch, rename, comment out, or delete any code labeled "Technical".** This code is strictly for investigation and mapping purposes only.
- *Status:* Currently in investigation phase.

## Risks
- **High:** Modifying or deleting code labeled "Technical" will break core Simple/Claw functionality.
- **Mitigation:** Only tracking and documentation allowed. No code modifications permitted in Technical-labeled files.
