# oh-my-sdd

**Spec-Driven Development, enforced by a global orchestrator + 6 Claude Code skills.**

`oh-my-sdd` installs a set of [Claude Code](https://claude.com/claude-code) skills that make **Spec-Driven Development (SDD)** the default way work gets done. Before any line of implementation code is written, Claude analyzes your project, generates a `constitution.md`, then a `spec.md`, a `plan.md`, and a `tasks.md` — stopping twice for your explicit approval before it ever touches your codebase.

## Install in one command

```bash
npx oh-my-sdd install
```

This installs 7 skills globally into `~/.claude/skills/`, available in every project you open in Claude Code — no per-project setup required.

## Why oh-my-sdd

<div class="grid cards" markdown>

-   :material-sitemap: **Orchestrated phases**

    ---

    One orchestrator skill (`oh-my-sdd`) activates 5 specialized skills in sequence — constitution, specify, plan, tasks, implement — each owning exactly one artifact.

-   :material-magnify-scan: **Constitution from real code**

    ---

    `oh-my-sdd-constitution` reads your `package.json`, lint configs, and existing code patterns to infer your stack and conventions — it only asks what it can't infer.

-   :material-hand-back-right: **Two human checkpoints**

    ---

    No implementation starts until you explicitly validate the `spec.md`, and again until you approve the `plan.md` + `tasks.md`.

-   :material-book-open-variant: **Self-contained knowledge base**

    ---

    Every installed skill ships with its own copy of the SDD knowledge base — maturity levels, EARS/GEARS syntax, artifact hierarchy, practical examples.

</div>

## What it looks like

```
/oh-my-sdd "add a logout endpoint that invalidates the refresh token"
/oh-my-sdd PROJ-123
/oh-my-sdd https://company.atlassian.net/browse/PROJ-123
```

Claude then walks through [constitution → specify → plan → tasks → implement](architecture/overview.md), pausing for your sign-off along the way.

## Before you install

`oh-my-sdd` only ever writes to `~/.claude/skills/` (the skills themselves) and `.oh-my-sdd/` inside the project you're working on (specs and constitution). It never touches your global `~/.claude/CLAUDE.md`, and everything it installs can be removed with a single command. See [Safety & Data](safety.md) for the full picture.

[Get started :material-arrow-right:](getting-started/installation.md){ .md-button .md-button--primary }
[View on GitHub :material-github:](https://github.com/slpascoal/oh-my-sdd){ .md-button }
