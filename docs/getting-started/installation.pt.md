# Instalação

## Requisitos

- Node.js `>=18.18.0`
- [Claude Code](https://claude.com/claude-code) instalado e configurado

## Instalar

```bash
npx oh-my-sdd install
```

Esta é uma **instalação global de fato** — sempre escreve em `~/.claude/skills/`, independente do diretório em que você rodar o comando. Você só precisa rodar isso uma vez por máquina.

Rodar o comando instala 7 skills:

| Skill | Pasta |
|---|---|
| `oh-my-sdd` | `~/.claude/skills/oh-my-sdd/` |
| `oh-my-sdd-constitution` | `~/.claude/skills/oh-my-sdd-constitution/` |
| `oh-my-sdd-specify` | `~/.claude/skills/oh-my-sdd-specify/` |
| `oh-my-sdd-plan` | `~/.claude/skills/oh-my-sdd-plan/` |
| `oh-my-sdd-tasks` | `~/.claude/skills/oh-my-sdd-tasks/` |
| `oh-my-sdd-implement` | `~/.claude/skills/oh-my-sdd-implement/` |
| `oh-my-sdd-ecosystem` | `~/.claude/skills/oh-my-sdd-ecosystem/` |

Cada pasta também recebe sua própria cópia da [base de conhecimento sobre SDD](../concepts/what-is-sdd.md), então cada skill é autocontida.

Se as skills já estiverem instaladas, a CLI pergunta se você quer reinstalar/atualizar antes de tocar em qualquer coisa.

## Verificar a instalação

```bash
npx oh-my-sdd status
```

Isso reporta quais das 7 skills estão presentes, e se algum arquivo instalado foi modificado manualmente desde a instalação (usando um manifest SHA-256 salvo em `~/.claude/skills/.oh-my-sdd-manifest.json`).

## Desinstalar

```bash
npx oh-my-sdd uninstall
```

Remove as 7 pastas de skill e o arquivo de manifest. Nada mais na sua máquina é afetado — veja [Segurança e Dados](../safety.md).

## Opcional: hooks de sessão

Em qualquer projeto onde quiser hints automáticos de retomada, rode:

```bash
npx oh-my-sdd hook install
```

Isso registra dois hooks informativos de lifecycle (SessionStart e Stop) no `.claude/settings.json` do projeto: um hint de retomada quando a sessão abre com implementação em andamento, e um lembrete do próximo passo enquanto houver workflow ativo. São fail-silent (sempre exit 0, nunca bloqueiam), leem apenas `.oh-my-sdd/runtime/` e fazem merge sem tocar em hooks de terceiros (`oh-my-sdd hook uninstall` remove só as entradas do oh-my-sdd).

## Próximo passo

Continue para o [Guia Rápido](quick-start.md) para percorrer um ciclo completo de SDD numa tarefa real.
