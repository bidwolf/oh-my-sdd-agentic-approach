# CLI Reference

`oh-my-sdd` ships a small CLI, invoked via `npx`, that manages the global installation of the 7 skills.

## `install`

```bash
npx oh-my-sdd install
```

Installs (or reinstalls) all 7 skills into `~/.claude/skills/`, along with a copy of the knowledge base inside each one, and writes an integrity manifest at `~/.claude/skills/.oh-my-sdd-manifest.json`. If the skills are already installed, asks for confirmation before reinstalling.

## `status`

```bash
npx oh-my-sdd status
```

Reports:

- Whether `oh-my-sdd` is installed, and the installed package version.
- Which of the 7 skills are present (`✓`) or missing (`✗`).
- Whether any installed file was modified manually since installation (compared against the SHA-256 manifest) — informational only, nothing is overwritten.

## `uninstall`

```bash
npx oh-my-sdd uninstall
```

Asks for confirmation, then removes all 7 skill folders from `~/.claude/skills/` and the manifest file. See [Safety & Data](safety.md) for exactly what this does and doesn't touch.

## `sensor`

```bash
npx oh-my-sdd sensor init --yes
npx oh-my-sdd sensor run <feature-slug>
npx oh-my-sdd sensor status <feature-slug>
```

Executable verification for SDD features. Sensors are real commands (per-stack auto-detected or edited by you) that **prove** — instead of presume — code integrity after implementation.

### `sensor init`

Scans the project (any stack: Node, Python, Go, Rust, Java) and writes `.oh-my-sdd/config/sensors.json` with the resolved commands for your stack:

| Sensor | Detects | Resolved command example |
|---|---|---|
| `tests-passing` | `package.json` `scripts.test`, pytest, go.mod, Cargo.toml, pom.xml, gradle | `npm test`, `pytest`, `go test ./...`, `cargo test` |
| `typecheck-clean` | tsconfig/jsconfig, pyrightconfig, mypy, Cargo.toml | `npx tsc --noEmit`, `pyright`, `mypy .`, `cargo check` |
| `lint` | eslint/biome, ruff, golangci, flake8, clippy | `npx eslint .`, `ruff check .`, `golangci-lint run` |

Detected sensors are `required: true`; undetected ones stay optional and are skipped with a reason at runtime. Edit the file to change commands, timeouts or requirements — it is the single source of truth.

It also writes `.oh-my-sdd/config/runtime.json` (behavior flags; `autonomous_mode: false` by default) and ensures `.oh-my-sdd/runtime/` is in `.gitignore` (never committed).

Without `--yes` and on a TTY, it shows the proposal and asks before writing anything. Re-running with an existing config is a **merge**: newly detected sensors are added, existing entries are never removed or altered, and a declared sensor whose backing artifact disappeared is flagged as stale. In a project with no detectable stack, it writes a minimal proposal (builtins as optional + `runtime.json`) with a warning.

### `sensor run <slug>`

Runs every declared sensor for the feature slug and writes evidence JSON files to `.oh-my-sdd/runtime/sensors/<slug>/` (command, exit code, duration, truncated output, timestamp, fingerprint). Exits 1 and prints the failing output if any `required` sensor fails — this is the blocking gate the `oh-my-sdd-implement` skill runs before its final report.

### `sensor status <slug>`

Read-only table of evidence per sensor, including whether each evidence is still valid against the current code fingerprint. Editing a tracked file after a sensor passed **expires that evidence** — re-run to refresh.

### Acceptance-criteria evidence

The `oh-my-sdd-implement` skill may only report an acceptance criterion as met with evidence: a passing sensor (mapped in `sensors.json` `criteria`) or a manual check note in `.oh-my-sdd/runtime/sensors/<slug>/manual-checks.md`. Criteria without either are reported as **pending verification** — never as met.

## `report`

```bash
npx oh-my-sdd report [--json]
```

Portfolio table of all SDD features in the current project: slug, current phase, task progress (`N/M`), linked issue (`#n` from `specs/<slug>/issue.json`, `—` otherwise) and pending acceptance criteria. Phase derivation priority: active runtime session > `tasks.md` checkboxes > artifact presence. With `--json`, emits a stable array of `{slug, phase, tasks_done, tasks_total, pending_criteria, issue}` (`issue` is the URL or `null`; documented schema; breaking changes bump the major version). Read-only — in a project without `.oh-my-sdd/`, prints a friendly message and exits 0.

## `export`

```bash
npx oh-my-sdd export <tool>
```

Writes the distilled SDD rules (pipeline, blocking checkpoints, `.oh-my-sdd/` layout, evidence rule) to another AI tool's rule surface: `cursor` (`.cursor/rules/oh-my-sdd.mdc`), `windsurf` (`.windsurf/rules/oh-my-sdd.md`), `zed` (`.zed/rules/oh-my-sdd.md`), `codex` (marked section in `AGENTS.md`), `gemini` (marked section in `GEMINI.md`). File-kind surfaces are owned files (safe overwrite); section-kind surfaces merge idempotently between `<!-- oh-my-sdd:start|end -->` markers, preserving third-party content. Unsupported tool prints the supported list and exits 1. Exported content is tool-agnostic — no client preconditions.

## `ecosystem`

```bash
npx oh-my-sdd ecosystem init <github | gitlab> [--yes] [--force]
```

Sets up the [issue-driven channel](ecosystem.md): writes the CI template that activates the SDD flow when the agent is mentioned (or the `sdd:specify` label applied) on an issue — `.github/workflows/oh-my-sdd.yml` for GitHub (claude-code-action), `.gitlab/oh-my-sdd.gitlab-ci.yml` for GitLab (include + webhook → pipeline trigger, instructions printed) — and `.oh-my-sdd/config/ecosystem.json` (`handle`, `labelPrefix`, `branchPrefix`, `approval`, `openDraftPR`, template hashes).

Asks before writing outside `.oh-my-sdd/` (`--yes` skips; non-TTY without `--yes` writes nothing). Re-running with an unchanged template prints "já registrado"; a manually edited template is preserved unless you confirm or pass `--force`. Templates reference secrets by name only. The command itself never touches the network. Unsupported provider: prints the supported list and exits 1.
