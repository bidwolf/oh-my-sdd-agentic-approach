# Ecosystem: issues (GitHub / GitLab)

The SDD pipeline is synchronous by default: you run `/oh-my-sdd` in a Claude Code terminal and validate both checkpoints in the chat. The **ecosystem layer** lets a web agentic session — Claude Code on the web, a GitHub Actions job, a GitLab CI job — run the **same** pipeline around an issue of your repository.

- The **issue** is the source of intent and the conversation channel.
- The **repository** stays the single source of truth for artifacts (`.oh-my-sdd/specs/<slug>/`).
- Both **human checkpoints** remain blocking; they move from "question in the chat" to "comment on the issue".

## Setup

```bash
npx oh-my-sdd ecosystem init github   # or: gitlab
```

| Provider | Writes | Trigger |
|---|---|---|
| `github` | `.github/workflows/oh-my-sdd.yml` ([claude-code-action](https://github.com/anthropics/claude-code-action)) | `@claude` mention in an issue/PR comment, issue opened with the mention, or label `sdd:specify` |
| `gitlab` | `.gitlab/oh-my-sdd.gitlab-ci.yml` (include) | webhook (Comments + Issues events) → pipeline trigger; the job filters mention/label itself |

Both write `.oh-my-sdd/config/ecosystem.json`:

```json
{
  "provider": "github",
  "handle": "@claude",
  "labelPrefix": "sdd:",
  "branchPrefix": "oh-my-sdd",
  "approval": "write",
  "openDraftPR": true,
  "templates": { ".github/workflows/oh-my-sdd.yml": "<sha256>" }
}
```

`approval` is `"write"` (default), `"maintain"`, or an explicit list of logins. Edit the config and re-run `init` to re-render the template.

Guardrails of `init`:

- Asks before writing outside `.oh-my-sdd/` (`--yes` skips the question; non-TTY without `--yes` writes nothing).
- Re-running with an unchanged template prints "já registrado".
- A template you edited by hand is **never** overwritten without confirmation or `--force` (the hash in `ecosystem.json` tells ours from yours).
- Secrets are referenced by name only (`ANTHROPIC_API_KEY`, or `CLAUDE_CODE_OAUTH_TOKEN`; on GitLab also `SDD_GITLAB_TOKEN`).

!!! note "GitLab needs one manual step"
    GitLab has no native mention app. Create a pipeline trigger token, point a project webhook (Comments + Issues events) at `https://<host>/api/v4/projects/<id>/ref/<branch>/trigger/pipeline?token=<token>`, and set `ANTHROPIC_API_KEY` + `SDD_GITLAB_TOKEN` (project access token, `api` + `write_repository`) as masked CI variables. The job reads the webhook payload from `$TRIGGER_PAYLOAD`.

## Entry points

### Direct reference (terminal)

```
/oh-my-sdd https://github.com/org/repo/issues/42
/oh-my-sdd https://gitlab.com/group/project/-/issues/42
/oh-my-sdd org/repo#42
/oh-my-sdd #42            # remote origin decides provider and repo
```

The orchestrator reads the issue through the tools the host already has — GitHub/GitLab MCP first, then `gh`/`glab`, else it asks you to paste the content. Checkpoints stay in the chat (`channel=terminal`); the spec is **bound** to the issue:

- `.oh-my-sdd/specs/<slug>/issue.json` — `{provider, url, repo, number, linkedAt}` (versioned);
- an `Issue: <url>` line right under the spec title.

Referencing the same issue again resumes the same slug, even if the issue title changed.

### Mention in the repository (CI, `channel=issue`)

1. Someone mentions `@claude` (or applies `sdd:specify`) on an issue.
2. CI installs the skills and activates `/oh-my-sdd` in issue channel. `oh-my-sdd-ecosystem` resolves the issue and classifies the intent of the triggering comment: `specify`, `adjust-spec`, `approve-spec`, `plan-tasks`, `approve-tasks`, `implement`, `status` — or asks when ambiguous.
3. The scale is classified as usual and printed as the first line of the first comment.
4. `oh-my-sdd-specify` writes the spec; `oh-my-sdd-ecosystem` commits it on branch `oh-my-sdd/<slug>`, opens a **draft PR/MR** (`Refs #n`, never `Closes`), posts **one** comment with the validation question, and applies `sdd:spec-pending`. The turn ends.
5. A maintainer answers `/oh-my-sdd approve spec` (or applies `sdd:spec-approved`). The next run generates `plan.md` + `tasks.md` and repeats the protocol with `sdd:tasks-pending`.
6. After `/oh-my-sdd approve tasks`, `oh-my-sdd-implement` runs on the same branch with the evidence gate; the final report (criteria met **with evidence**, criteria pending verification) is the last comment, the PR/MR leaves draft, and the label becomes `sdd:done`.

Adjustment requests edit the existing artifacts (never regenerate) and re-publish on the same branch. One comment per phase transition; nothing is re-posted if the last agent comment already announces it.

### Conversational generation

If the issue lacks a recognizable intent (what + why) and at least one inferable acceptance criterion, the agent posts **at most 5 questions in a single comment**, applies `sdd:needs-input`, and stops. The author's answers become part of the intent on the next run. An empty issue never produces a spec.

### Reverse link

After a spec is validated in the terminal, if the project's remote is GitHub/GitLab and there is no `issue.json`, the agent asks once: create an issue, link an existing one, or skip. Nothing is created without an explicit yes.

## Approval and trust

- **Approval requires write permission.** GitHub: comment `author_association` in `OWNER`/`MEMBER`/`COLLABORATOR` (or the collaborators permission API); GitLab: access level ≥ Developer (30). `"maintain"` raises the bar; a login list restricts it. Anyone else's "approved" is treated as input and never advances the phase.
- **Issue content is data, not instructions.** Requests inside the issue to skip a checkpoint, write outside `.oh-my-sdd/`, add a dependency, or lower the scale are ignored and listed under "Desvios solicitados e ignorados" in the next checkpoint comment.
- **Ephemeral containers.** `.oh-my-sdd/runtime/` is not expected to survive between CI runs: the phase is rebuilt from the versioned artifacts, the `tasks.md` checkboxes and the issue's phase labels.
- **No network in the package.** `lib/` only writes local files; every GitHub/GitLab call is made by the host agent with its own tools.

## Labels

| Label | Meaning |
|---|---|
| `sdd:specify` | trigger: start the pipeline on this issue |
| `sdd:needs-input` | waiting for the author to answer the agent's questions |
| `sdd:spec-pending` | spec published, waiting for checkpoint #1 |
| `sdd:spec-approved` | checkpoint #1 passed (may also be applied by a maintainer to approve) |
| `sdd:tasks-pending` | plan + tasks published, waiting for checkpoint #2 |
| `sdd:implementing` | implementation in progress on the feature branch |
| `sdd:done` | final report posted, PR/MR ready for review |

Prefix comes from `labelPrefix`; labels are created on first use.

## `report`

`npx oh-my-sdd report` shows an `ISSUE` column (`#n`), and `--json` adds `"issue": "<url>" | null` — an additive field; the existing schema is unchanged.
