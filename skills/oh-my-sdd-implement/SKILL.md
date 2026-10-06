---
name: oh-my-sdd-implement
description: Implementa uma feature seguindo estritamente tasks.md e as restrições de constitution.md, marcando o progresso em tasks.md e reportando os critérios de aceite de spec.md atendidos. Só deve ser ativada depois que os checkpoints humanos de oh-my-sdd-specify e oh-my-sdd-tasks tiverem sido confirmados. Geralmente invocada pela skill oh-my-sdd.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill
---

# When to use this skill

Use depois que `spec.md`, `plan.md` e `tasks.md` de uma feature já foram validados pelo usuário, para efetivamente implementar o código:

```
/oh-my-sdd-implement <slug-da-feature>
```

# How to use this skill

O argumento é o **slug da feature** — deve corresponder a uma pasta `.oh-my-sdd/specs/<slug>/` com `spec.md`, `plan.md` e `tasks.md` já validados. O orquestrador também pode ativar esta skill em **modo QUICK**, passando um mini-spec inline (sem pasta `specs/<slug>/`), e passa `channel=terminal|issue` (padrão `terminal`).

> [!IMPORTANT]
> - Não introduza requisitos, bibliotecas ou decisões arquiteturais que não constem em `spec.md`/`plan.md`. Se notar necessidade de desviar do especificado, **pare e avise o usuário** em vez de decidir silenciosamente.
> - Respeite estritamente as restrições de `constitution.md` (stack travada, padrões de código, guardrails de segurança) durante toda a implementação.
> - Marque cada tarefa como concluída em `tasks.md` (`- [x]`) imediatamente após implementá-la, não em lote no final.

# Tool usage flow

> [!IMPORTANT]
> - **Modo QUICK (mini-spec inline):** não há `specs/<slug>/` nem `tasks.md` — o escopo é o mini-spec recebido. Implemente respeitando `constitution.md`; derive um pseudo-slug do título para sensors. O gate de evidência (Fase 3) roda **somente se** `.oh-my-sdd/config/sensors.json` existir.
> - **Escape de escala:** se durante a implementação a tarefa exceder o escopo previsto (mais arquivos, mais decisões de design, escopo do mini-spec/tasks insuficiente), **pare imediatamente**, explique ao usuário que a tarefa excedeu a escala prevista e aguarde reclassificação pelo orquestrador — **nunca** cresça silenciosamente dentro de QUICK.
> - **Canal issue (`channel=issue`):** o fluxo é o mesmo, no branch da feature (`<branchPrefix>/<slug>`). No início, ative `oh-my-sdd-ecosystem` em modo `publish` com fase `implementing` (um único comentário, N/M). Pausas por conflito ou escape de escala também são publicadas na issue (mesma fase, com o motivo) e encerram o turno. `runtime/sessions/` pode não existir entre turnos: reconstrua sempre a partir dos checkboxes de `tasks.md`.

## Phase 1 — Ler Contexto e Detectar Retomada

Execute em paralelo:

Em modo QUICK, pule os itens 1-2 (não existem) e leia apenas a constitution (item 3), implementando contra o mini-spec.

1. `Read` em `.oh-my-sdd/specs/<slug>/tasks.md`.
2. `Read` em `.oh-my-sdd/specs/<slug>/spec.md`.
3. `Read` em `.oh-my-sdd/constitution.md` do projeto.
4. `Read` em `.oh-my-sdd/runtime/sessions/<slug>.json` — **se existir**, reporte o estado antes de agir: "feature <slug>, N/M tarefas concluídas, retomando da tarefa N+1". Se o slug do session não tiver pasta em `specs/`, o session está órfão: descarte com aviso ao usuário.

Verifique quais tarefas de `tasks.md` já têm checkbox marcado (`- [x]`) — essas são consideradas concluídas de uma execução anterior; não as reimplemente, apenas confirme rapidamente que ainda estão coerentes com o código atual antes de seguir.

**Session de execução (fonte de progresso fino):** no início da execução, grave via `Write` em `.oh-my-sdd/runtime/sessions/<slug>.json`:

```json
{"slug": "<slug>", "phase": "implement", "taskIndex": 0, "taskCount": <M>, "startedAt": "<ISO-8601>", "updatedAt": "<ISO-8601>", "status": "in-progress"}
```

Se o session não existir ou estiver corrompido (JSON inválido, campos ausentes), **reconstrua** a partir dos checkboxes de `tasks.md` e siga — runtime é cache; `tasks.md` é a fonte de verdade formal. Se divergirem (ex: session diz tarefa 5, checkboxes dizem 3), confie nos checkboxes e sincronize o session.

## Phase 2 — Implementar Tarefa por Tarefa

1. Percorra as tarefas pendentes de `tasks.md`, na ordem em que aparecem.
2. Para cada tarefa: implemente exatamente o que ela descreve, usando `Read`/`Edit`/`Write`/`Bash` conforme necessário (ex: rodar testes, instalar dependências já previstas em `plan.md`), respeitando `constitution.md`.
3. Ao concluir a tarefa, marque seu checkbox em `tasks.md` (`Edit`) e **imediatamente** atualize o session (`Write`): `taskIndex`, `updatedAt` — nunca em lote no final.
4. Se, durante a implementação, perceber que a tarefa exige algo fora do que `spec.md`/`plan.md` previram: **pare imediatamente**, explique o conflito ao usuário e aguarde orientação antes de continuar.

## Phase 3 — Gate de evidência e relatório final

Ao concluir todas as tarefas (ou ao pausar por um conflito), **antes de qualquer relatório final** — e após o gate passar:

**Arquivamento da session:** com todas as tarefas `[x]` e sensors obrigatórios passando (ou sem `sensors.json`), mova o session para `.oh-my-sdd/runtime/sessions/archived/<slug>.json` com `"status": "done"` — assim sessões novas não retomam features fechadas. Se pausou por conflito, mantenha o session com `"status": "paused"` e o motivo.

1. Execute `npx oh-my-sdd sensor run <slug>` (via `Bash`). Este comando roda os sensors declarados em `.oh-my-sdd/config/sensors.json` e grava evidências em `.oh-my-sdd/runtime/sensors/<slug>/`.
2. **Gate bloqueante:** se qualquer sensor `required: true` falhar, **não emita o relatório final** — apresente a saída do sensor ao usuário, sugira a correção e só re-emita o relatório após nova execução com passagem. Sensor obrigatório que não pode executar (comando inexistente/timeout) também bloqueia, com motivo claro.
3. Para cada critério da seção "Critérios de Aceite" do `spec.md`, classifique com evidência:
   - **Atendido** — somente se um sensor (mapeado em `criteria` do `sensors.json` ou logicamente ligado) passou, ou se existir nota de verificação manual em `.oh-my-sdd/runtime/sensors/<slug>/manual-checks.md`.
   - **Pendente de verificação** — sem sensor que o prove nem nota manual. **Nunca** reporte como atendido.
4. Então reporte ao usuário/chamador:
   1. Quais tarefas de `tasks.md` foram implementadas nesta execução.
   2. Critérios de aceite **atendidos com evidência** (sensor + resultado) — comparando o código gerado contra cada item do checklist, no espírito do loop de validação descrito em `knowledge/2-goal-of-sdd.md` (*"AI agents can compare the code they generate directly against the acceptance criteria listed in the specification"*).
   3. Critérios **pendentes de verificação** (sem evidência) — explícitos, nunca silenciados.
5. Se um critério for verificável manualmente, registre a nota em `.oh-my-sdd/runtime/sensors/<slug>/manual-checks.md` (formato: `- [ ] <critério> — verificado manualmente, <data>`); só critérios com nota registrada podem ser reportados como atendidos sem sensor.
6. **Canal issue:** publique esse mesmo relatório via `oh-my-sdd-ecosystem` em modo `publish` com fase `done` — ela faz o commit final no branch, tira o PR/MR do rascunho e troca a label. Critérios pendentes de verificação aparecem explicitamente no comentário, nunca silenciados. Se o gate bloqueou, publique a saída do sensor com fase `implementing` em vez de `done`.
