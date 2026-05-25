# [WOW-023] Document and Validate `.wo` Directory Symlink

## Problem Statement
The project structure includes a symbolic link `.wo` within the `workspace/` directory that points to the main `.wo` directory at the project root (`/home/zerwiz/CodeP/wayofwork/.wo`). This has caused confusion regarding which directory is the authoritative source.

## Desired Outcome
Clearly document the purpose of the symlink in project documentation (e.g., `README.md` or a new `ARCH.md`) to prevent future confusion.

## Context & Background
- The main directory is `/home/zerwiz/CodeP/wayofwork/.wo`.
- `/home/zerwiz/CodeP/wayofwork/workspace/.wo` is a symbolic link to the main directory.
- This setup is likely for convenience when tools/agents run inside the `workspace/` subdirectory.

## Requirements
- [x] Confirm this symlink is intended behavior.
- [x] Document this structure in `README.md` (already documented).

## Acceptance Criteria
- [x] Team members understand that `.wo` is the single source of truth.

## Meta
**Created**: 2026-05-23
**Priority**: Low
**Estimated Effort**: S
