# oh-my-sdd

![sdd-header](image.png)

A set of global Claude Code skills that rigorously enforce **Spec-Driven Development (SDD)**: before implementing any task, Claude analyzes the project, generates `constitution.md` → `spec.md` → `plan.md` → `tasks.md`, with mandatory human validation before implementation is allowed to start — in the terminal, or driven from a GitHub/GitLab issue by a web agentic session (see [Ecosystem](#ecosystem-issues-githubgitlab)).

📖 **Documentation:** [English](https://slpascoal.github.io/oh-my-sdd/) · [Português](https://slpascoal.github.io/oh-my-sdd/pt/)

## Installation

```bash
npx oh-my-sdd install
```

This installs the 7 skills globally in `~/.claude/skills/`, available in any project opened in Claude Code — installation does not depend on the directory the command is run from.

## Architecture

An orchestrator skill (`oh-my-sdd`) activates, in sequence, 5 specialized skills — one per SDD phase — plus one channel adapter for the repository ecosystem:

| Skill | Responsibility |
|---|---|
| `oh-my-sdd` | Orchestrates the flow, identifies the input (free text, Jira, or a GitHub/GitLab issue) and activates the others in order |
| `oh-my-sdd-constitution` | Founds the constitution on what the project already documents and practices: scans `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, `CONTRIBUTING.md`, lint configs and CI workflows first (every rule traced to its source, conflicts asked — never silently resolved), then falls back to code analysis, asking the user only what remains |
| `oh-my-sdd-specify` | Generates `spec.md` in EARS/GEARS — **human checkpoint #1** |
| `oh-my-sdd-plan` | Translates the validated spec into technical decisions (`plan.md`) |
| `oh-my-sdd-tasks` | Breaks the plan into atomic tasks (`tasks.md`) — **human checkpoint #2** |
| `oh-my-sdd-implement` | Implements task by task, only after both checkpoints are confirmed |
| `oh-my-sdd-ecosystem` | Channel adapter, not a pipeline phase: resolves issue references, classifies an agent mention, enforces approval by repository permission, and publishes checkpoints as branch + draft PR/MR + comment + phase label |

Each installed skill is self-contained: it gets its own copy of [`knowledge/`](./knowledge), the SDD knowledge base (maturity levels, EARS/GEARS syntax, artifact hierarchy, practical examples) that underpins how each phase generates its document.

## Usage

Once installed, the flow is automatically discovered by Claude Code whenever a task should be specified before being implemented. It can also be invoked directly:

```
/oh-my-sdd "add a logout endpoint that invalidates the refresh token"
/oh-my-sdd PROJ-123
/oh-my-sdd https://company.atlassian.net/browse/PROJ-123
/oh-my-sdd https://github.com/org/repo/issues/42      # spec bound to the issue (issue.json)
/oh-my-sdd org/repo#42
```

## Other commands

```bash
npx oh-my-sdd status      # shows which of the 7 skills are installed and whether any file was manually modified
npx oh-my-sdd uninstall   # removes the 7 skills from ~/.claude/skills/
```

## Adaptive scale

Not every task deserves the full pipeline. Before running any sub-skill, the orchestrator classifies the task and routes it:

- **QUICK** — inline mini-spec + single confirmation, straight to implementation (typos, isolated bug fixes)
- **SMALL** — condensed spec + tasks with embedded decisions, both human checkpoints kept
- **MEDIUM / LARGE** — full pipeline, unchanged

Classification + reason print in one line and are recorded in `.oh-my-sdd/runtime/scale.json` (gitignored). The model may only reclassify **upward**; only you can force the scale down. See [Quick Start](https://slpascoal.github.io/oh-my-sdd/getting-started/quick-start/) for the full criteria table.

## Multi-tool export

oh-my-sdd is Claude Code-first, but the SDD flow itself is tool-agnostic. Export the distilled rules so other AI tools follow the same pipeline in the same repo:

```bash
npx oh-my-sdd export cursor|codex|gemini|windsurf|zed
```

| Tool | Surface | Strategy |
|---|---|---|
| Cursor | `.cursor/rules/oh-my-sdd.mdc` | own file |
| Codex | `AGENTS.md` | marked section |
| Gemini CLI | `GEMINI.md` | marked section |
| Windsurf | `.windsurf/rules/oh-my-sdd.md` | own file |
| Zed | `.zed/rules/oh-my-sdd.md` | own file |

Marked-section tools get idempotent merge between `<!-- oh-my-sdd:start|end -->` markers — third-party content is never touched; re-runs update only our section. Unsupported tool: list + exit 1.

## Feature report

Portfolio view of every SDD feature in the current project — slug, current phase, task progress, linked issue and pending acceptance criteria:

```bash
npx oh-my-sdd report          # human table
npx oh-my-sdd report --json   # stable machine schema ([{slug, phase, tasks_done, tasks_total, pending_criteria, issue}])
```

Phase derivation: active session > task checkboxes > artifact presence (`specify` → `plan` → `tasks` → `implement` → `done`). Read-only; the oh-my-sdd repo itself is the first user (dogfooding).

## Session hooks (optional)

Never lose the thread of an SDD run between sessions. Install lifecycle hooks in the current project:

```bash
npx oh-my-sdd hook install          # or: npx oh-my-sdd install --with-hooks
npx oh-my-sdd hook uninstall        # removes only oh-my-sdd entries
```

When a session starts with an implementation in progress, you get a one-line resume hint (`feature X, N/M tasks — resume with /oh-my-sdd-implement <slug>`); when a response ends with an active workflow, a short next-step reminder. Fully informative: hooks are fail-silent (exit 0, never block), read only `.oh-my-sdd/runtime/`, and merge into `.claude/settings.json` without touching third-party hooks.

## Ecosystem: issues (GitHub/GitLab)

The same pipeline can run from a web agentic session around an **issue**: the issue is the source of intent and the conversation channel, the repository stays the single source of truth for artifacts, and both human checkpoints become comments on the issue — still blocking.

```bash
npx oh-my-sdd ecosystem init github   # .github/workflows/oh-my-sdd.yml (claude-code-action) + .oh-my-sdd/config/ecosystem.json
npx oh-my-sdd ecosystem init gitlab   # .gitlab/oh-my-sdd.gitlab-ci.yml + webhook → pipeline-trigger instructions
```

Four entry points:

- **Direct reference** — `/oh-my-sdd <issue url | owner/repo#n | #n>` in the terminal: checkpoints stay in the chat; the spec is bound to the issue (`specs/<slug>/issue.json` + an `Issue:` line). Mentioning the same issue again resumes the same slug.
- **Mention in the repo** — `@claude` (configurable handle) in an issue/PR comment, or the `sdd:specify` label: CI runs the orchestrator in **issue channel**. The spec lands on branch `oh-my-sdd/<slug>` with a draft PR/MR, one comment asks for validation, and a phase label (`sdd:spec-pending` → `sdd:spec-approved` → `sdd:tasks-pending` → `sdd:implementing` → `sdd:done`) shows the state.
- **Conversational generation** — an issue without enough intent gets at most 5 questions in one comment before any spec is written; an empty issue never produces a spec.
- **Reverse link** — a spec validated in the terminal can, on explicit opt-in, create or link an issue.

Approval (`/oh-my-sdd approve spec|tasks`, or the approval label) only counts from users with **write permission** on the repository; everyone else's comments are input. Issue bodies and comments are treated as data, never instructions — requests to skip checkpoints, write outside `.oh-my-sdd/`, add dependencies or lower the scale are ignored and listed in the next checkpoint comment.

The npm package makes **no network calls**: every GitHub/GitLab interaction is done by the host agent through tools it already has (GitHub/GitLab MCP, `gh`, `glab`). Templates reference secrets by name only; `ecosystem init` asks before writing outside `.oh-my-sdd/` (`--yes` skips) and never overwrites a manually edited template without `--force`. Details: [Ecosystem docs](https://slpascoal.github.io/oh-my-sdd/ecosystem/).

## Project layout

Everything oh-my-sdd writes lives under `.oh-my-sdd/` in the target project:

| Path | Versioned | Content |
|---|---|---|
| `specs/<slug>/` | yes | `spec.md`, `plan.md`, `tasks.md` — the SDD artifacts; `issue.json` when bound to an issue |
| `config/` | yes | `sensors.json`, `ecosystem.json`, behavior flags |
| `runtime/` (gitignored) | no | execution state: `sessions/`, sensor evidence, `scale.json` |

Execution state is never committed. The orchestrator ensures `.oh-my-sdd/runtime/` is in `.gitignore` on first use; during implementation, a `sessions/<slug>.json` tracks fine-grained progress (current task, timestamps) so an interrupted run resumes where it stopped — `tasks.md` checkboxes remain the formal source of truth, and the session is archived when the feature closes.

## Sensors & evidence

Implementation only counts as done when real commands prove it. Sensors are per-stack auto-detected checks (tests, typecheck, lint — Node, Python, Go, Rust, Java) stored in `.oh-my-sdd/config/sensors.json`:

```bash
npx oh-my-sdd sensor init --yes        # detect the stack, write the config (asks first; --yes to skip)
npx oh-my-sdd sensor run <slug>        # run sensors, write evidence, block on required failure
npx oh-my-sdd sensor status <slug>     # evidence table with fingerprint validity
```

Before its final report, `oh-my-sdd-implement` runs the sensors and blocks on any required failure. Acceptance criteria are reported as met only with evidence (passing sensor or manual check note); otherwise they stay explicitly **pending verification**. Evidence lives in `.oh-my-sdd/runtime/` (gitignored) and expires when tracked code changes. See the [CLI reference](https://slpascoal.github.io/oh-my-sdd/cli/) for details.

## Knowledge base

The [`knowledge/`](./knowledge) folder documents the SDD fundamentals used by every skill: maturity levels (spec-first, spec-anchored, spec-as-source), best practices for writing specs and constitutions, EARS/GEARS syntax, and complete practical examples.

## License

MIT
