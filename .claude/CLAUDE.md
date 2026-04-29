# Interact Portal — Project Instructions

## Monday.com Task Management

**You have MCP tools for this project's Monday board. USE THEM.**

Board: https://interactenglish-squad.monday.com/boards/18410746908

### BEFORE starting ANY work:
```
Call: monday_start_session
  - task_description: "Brief description of what you're doing"
  - group: (use monday_list_groups to see available groups)
  - existing_task_id: (optional, if resuming)
```

### AFTER completing work:
```
Call: monday_add_comment  — with full implementation details
Call: monday_complete_session  — sets Done + adds summary
```

### Available Monday tools:
- `monday_start_session` — CALL FIRST
- `monday_complete_session` — CALL LAST
- `monday_list_tasks` — list tasks, filter by group
- `monday_list_groups` — see all groups on this board
- `monday_create_task` — create standalone task
- `monday_update_status` — update status
- `monday_add_comment` — add comment to task

### Mandatory comment format:
```markdown
## Implementation Complete ✅

**Branch:** `feature/interact-portal/<description>`
**Merged To:** `stg` or `main`
**Date:** YYYY-MM-DD

### Changes Made:
- Bullet points

### Files Changed:
- List of files

### Commits:
- `hash` - message
```

---

## Supabase

This project uses Supabase. The `supabase` MCP server is configured for this project.
Authenticate via `/mcp` when prompted.

---

## Git Rules

1. **NO direct pushes to `stg` or `main`**
2. **Branch naming**: `feature/interact-portal/<description>` or `fix/interact-portal/<description>`
3. **ASK before pushing**
