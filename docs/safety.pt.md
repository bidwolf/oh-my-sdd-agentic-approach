# Segurança e Dados

O `oh-my-sdd` é intencionalmente restrito quanto ao que toca. Antes de instalar, aqui está exatamente o que ele faz — e o que não faz.

## O que o instalador toca

- **`~/.claude/skills/oh-my-sdd*/`** — as 7 pastas de skill que ele instala, mais `~/.claude/skills/.oh-my-sdd-manifest.json` (um manifest de integridade). Nada mais em `~/.claude/skills/` é modificado.
- E é só isso. O instalador nunca toca no seu `~/.claude/CLAUDE.md` global, no `CLAUDE.md` do seu projeto, ou em qualquer outra configuração do Claude Code.

## O que as skills tocam, quando você roda uma tarefa

Enquanto percorre o fluxo de SDD dentro de um projeto, as skills só leem/escrevem:

- **`.oh-my-sdd/constitution.md`** — um por projeto, gerado analisando seu código e configuração existentes.
- **`.oh-my-sdd/specs/<slug>/{spec.md,plan.md,tasks.md}`** — uma pasta por feature.
- Seus arquivos de código reais — mas **apenas** durante a fase `oh-my-sdd-implement`, e **apenas** depois que você confirmar explicitamente o plano e a lista de tarefas no checkpoint #2.

Nenhuma skill regenera ou sobrescreve uma `constitution.md` já vigente, ou um spec/plan/tasks já validados, sem avisar você primeiro e pedir confirmação.

## Os dois checkpoints humanos

1. **Depois que `spec.md` é gerado** — a `oh-my-sdd-specify` não avança para o planejamento até você validar explicitamente a especificação.
2. **Depois que `plan.md` e `tasks.md` são gerados** — a `oh-my-sdd-tasks` não avança para a implementação até você aprovar explicitamente os dois, juntos.

Nenhum código de implementação é escrito antes da confirmação do checkpoint #2.

## Tudo é reversível

```bash
npx oh-my-sdd uninstall
```

remove todos os arquivos que o instalador criou. Nada fica para trás fora das 7 pastas de skill e do manifest.

Como as specs e a constitution vivem dentro do seu projeto em `.oh-my-sdd/`, elas são arquivos comuns sob seu próprio controle de versão — delete a pasta, ou faça `git revert`, e você volta ao ponto de partida.
