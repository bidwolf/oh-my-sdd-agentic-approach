# Installation

## Requirements

- Node.js `>=18.18.0`
- [Claude Code](https://claude.com/claude-code) installed and configured

## Install

```bash
npx oh-my-sdd install
```

This is a **true global install** — it always writes to `~/.claude/skills/`, regardless of which directory you run the command from. You only need to run it once per machine.

Running it installs 7 skills:

| Skill | Folder |
|---|---|
| `oh-my-sdd` | `~/.claude/skills/oh-my-sdd/` |
| `oh-my-sdd-constitution` | `~/.claude/skills/oh-my-sdd-constitution/` |
| `oh-my-sdd-specify` | `~/.claude/skills/oh-my-sdd-specify/` |
| `oh-my-sdd-plan` | `~/.claude/skills/oh-my-sdd-plan/` |
| `oh-my-sdd-tasks` | `~/.claude/skills/oh-my-sdd-tasks/` |
| `oh-my-sdd-implement` | `~/.claude/skills/oh-my-sdd-implement/` |
| `oh-my-sdd-ecosystem` | `~/.claude/skills/oh-my-sdd-ecosystem/` |

Each folder also gets its own copy of the [SDD knowledge base](../concepts/what-is-sdd.md), so every skill is self-contained.

If the skills are already installed, the CLI asks whether you want to reinstall/update before touching anything.

## Verify the install

```bash
npx oh-my-sdd status
```

This reports which of the 7 skills are present, and whether any installed file was modified manually since installation (using a SHA-256 manifest stored at `~/.claude/skills/.oh-my-sdd-manifest.json`).

## Uninstall

```bash
npx oh-my-sdd uninstall
```

Removes all 7 skill folders and the manifest file. Nothing else on your machine is touched — see [Safety & Data](../safety.md).

## Optional: session hooks

In any project where you want automatic resume hints, run:

```bash
npx oh-my-sdd hook install
```

This registers two informative lifecycle hooks (SessionStart and Stop) in the project's `.claude/settings.json`: a resume hint when a session opens with an implementation in progress, and a next-step reminder while a workflow is active. They are fail-silent (always exit 0, never block), read only `.oh-my-sdd/runtime/`, and merge without touching third-party hooks (`oh-my-sdd hook uninstall` removes only the oh-my-sdd entries).

## Next step

Continue to the [Quick Start](quick-start.md) to run through a full SDD cycle on a real task.
