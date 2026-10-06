# Skills Reference

## `oh-my-sdd` (orchestrator)

**Allowed tools:** `Read`, `Glob`, `Grep`, `Skill`

Entry point for the whole flow. It:

1. Identifies the input — free text, a Jira key/URL (delegating to `jira-fetch` or an Atlassian MCP tool when available), or a GitHub/GitLab issue reference (delegating to `oh-my-sdd-ecosystem`). It also carries a **channel**: `terminal` (checkpoints in the chat, default) or `issue` (checkpoints published on the issue, only when triggered by a mention/label in CI or explicitly requested).
2. Derives a kebab-case slug for the feature and checks whether `.oh-my-sdd/specs/<slug>/` already exists (new feature vs. resume).
3. Activates `oh-my-sdd-constitution`, `oh-my-sdd-specify`, `oh-my-sdd-plan`, `oh-my-sdd-tasks`, and `oh-my-sdd-implement`, strictly in that order, waiting for each checkpoint signal before continuing.

It never generates `constitution.md`, `spec.md`, `plan.md`, `tasks.md`, or implementation code directly.

## `oh-my-sdd-constitution`

**Allowed tools:** `Read`, `Write`, `Glob`, `Grep`

Ensures the project has a `.oh-my-sdd/constitution.md`:

- If it already exists, it's read and confirmed — no regeneration, no questions. A regeneration/merge request scans sources again and proposes a **diff**, never regenerating from scratch (your manual edits stay untouched).
- **Sources first:** it scans `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, `.windsurfrules`, `CONTRIBUTING.md`, root lint/format configs and `.github/workflows/` in a fixed order, extracting rules **with source citations**. Conflicting rules between sources are listed and asked — never silently resolved.
- Then it analyzes the code (`package.json` / `composer.json` / `pyproject.toml` / `go.mod`, folder structure, naming conventions) to fill gaps, asking the user only what neither sources nor code resolved (typically ≤2 questions).
- Every rule ends up traceable: the generated constitution carries a `## Fontes` (Sources) block mapping each rule to its origin file, with code-inferred rules marked as such.
- The document follows the structure and rules from the [constitution best practices](../concepts/constitution-best-practices.md) and [example](../concepts/constitution-example.md): absolute language ("always"/"never"), an explicit agent persona, a locked technology stack, and no feature-specific content.

## `oh-my-sdd-specify`

**Allowed tools:** `Read`, `Write`, `Glob`, `Grep`, `Skill`

Generates `.oh-my-sdd/specs/<slug>/spec.md`:

- Treats `constitution.md` as a binding constraint.
- If `spec.md` already exists, treats it as an edit/continuation instead of regenerating from scratch.
- Structures the document exactly like the [practical spec example](../concepts/spec-example.md), using EARS/GEARS syntax for functional requirements, a verifiable acceptance-criteria checklist, and non-functional requirements/contracts.
- **Checkpoint #1**: presents the spec and does not hand control back to the orchestrator until the user explicitly validates it (or explicitly pauses/abandons). In issue channel the same question is published on the issue through `oh-my-sdd-ecosystem` and the skill returns "waiting for asynchronous approval" — which never counts as validation.
- Binds the spec to its issue when there is one (`issue.json` + `Issue:` line) and, in the terminal, offers once to create/link an issue after validation.

## `oh-my-sdd-plan`

**Allowed tools:** `Read`, `Write`, `Glob`, `Grep`

Translates the validated `spec.md` into `.oh-my-sdd/specs/<slug>/plan.md`: architectural decisions, data/API schema, and library choices — the "how" — always within the constraints of `constitution.md`. Has no checkpoint of its own; `plan.md` is validated together with `tasks.md` in the next phase.

## `oh-my-sdd-tasks`

**Allowed tools:** `Read`, `Write`, `Glob`, `Grep`, `Skill`

Breaks `plan.md` into `.oh-my-sdd/specs/<slug>/tasks.md` — small, atomic, sequential tasks, each independently verifiable.

**Checkpoint #2**: presents `plan.md` **and** `tasks.md` together and does not hand control back until the user explicitly confirms implementation can start. In issue channel the checkpoint is published on the issue (`sdd:tasks-pending`) and the skill returns "waiting for asynchronous approval".

## `oh-my-sdd-implement`

**Allowed tools:** `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, `Skill`

Implements the feature:

- Reads `tasks.md`, `spec.md`, and `constitution.md`; detects which tasks are already checked off (resume support).
- Implements task by task, respecting `constitution.md`. If it needs to deviate from what was specified, it stops and asks instead of deciding silently.
- Checks off each task in `tasks.md` as it's completed.
- Reports which tasks were implemented and which acceptance criteria from `spec.md` were met — comparing the generated code directly against the checklist. In issue channel the report is the final comment on the issue and the PR/MR leaves draft.

## `oh-my-sdd-ecosystem`

**Allowed tools:** `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`

Channel adapter for the repository ecosystem (GitHub/GitLab) — **not** a pipeline phase and never generates artifacts. Modes:

- `resolve` — turns an issue reference (URL, `owner/repo#n`, `#n`) into `{provider, repo, number, url, title, body, labels, comments}`, reading through the host's tools (GitHub/GitLab MCP → `gh`/`glab` → ask for pasted content). Issue content is delivered marked as untrusted data.
- `intent` — classifies the triggering comment (`specify`, `adjust-spec`, `approve-spec`, `plan-tasks`, `approve-tasks`, `implement`, `status`, or `ambiguous`) and validates approvals against repository permission (write+ on GitHub, Developer+ on GitLab, or the configured list).
- `publish` — branch `oh-my-sdd/<slug>`, commit, push, draft PR/MR (`Refs #n`), one idempotent comment per phase transition, phase label swap.
- `link` — creates (with explicit confirmation) or links an issue to a spec: writes `issue.json` and the `Issue:` line.

It also runs the sufficiency triage (≤5 questions in one comment before any spec), lists and ignores deviation requests found in the issue, and rebuilds the pipeline phase from artifacts + labels when `runtime/` does not exist. See [Ecosystem](../ecosystem.md).
