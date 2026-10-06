---
name: oh-my-sdd-tasks
description: Quebra um plan.md validado em tasks.md com tarefas atômicas e sequenciais, e obtém confirmação humana explícita (junto com o plan.md) antes de liberar a implementação — no chat ou como comentário na issue vinculada (canal issue, via oh-my-sdd-ecosystem). Geralmente invocada pela skill oh-my-sdd depois de oh-my-sdd-plan.
allowed-tools: Read, Write, Glob, Grep, Skill
---

# When to use this skill

Use depois que `plan.md` já foi gerado, para quebrá-lo em tarefas executáveis e obter o segundo checkpoint humano do fluxo SDD antes de qualquer implementação:

```
/oh-my-sdd-tasks <slug-da-feature>
```

# How to use this skill

O argumento é o **slug da feature** — deve corresponder a uma pasta `.oh-my-sdd/specs/<slug>/`. Em fluxo **MEDIUM/LARGE**, `plan.md` já existe. Em fluxo **SMALL** (`scale=SMALL`), não há `plan.md`: o plan é embutido em `tasks.md` como seção "Decisões". O orquestrador também passa `channel=terminal|issue` (padrão `terminal`).

> [!IMPORTANT]
> - **Nunca retorne o controle para quem a chamou antes do checkpoint da Fase 3 ser confirmado pelo usuário.** Nenhuma implementação deve começar sem essa confirmação. Única exceção: em `channel=issue` o retorno é o sinal "aguardando aprovação assíncrona", que **não** libera a implementação.
> - Tarefas devem ser pequenas o bastante para serem validadas individualmente — não crie tarefas grandes e vagas.

# Tool usage flow

## Phase 1 — Ler Plan e Spec

Execute em paralelo:

1. `Read` em `.oh-my-sdd/specs/<slug>/spec.md`.
2. `Read` em `.oh-my-sdd/specs/<slug>/plan.md` — **apenas em fluxo MEDIUM/LARGE**. Em `scale=SMALL`, o plan não existe: derive as decisões técnicas diretamente do `spec.md` + `constitution.md`.

## Phase 2 — Gerar `tasks.md`

Em fluxo `scale=SMALL`, inclua antes da lista uma seção `## Decisões` com as decisões técnicas (stack, arquivos afetados, abordagem) — é o plan embutido; valide-a junto no checkpoint.

Quebre o plan (arquivo `plan.md` ou seção Decisões derivada em SMALL) em uma lista de tarefas atômicas e sequenciais, cada uma pequena o bastante para ser implementada e validada isoladamente, seguindo `knowledge/3-best-practices-spec.md`, seção D ("Break Work into Small Deliveries" — *"AI performs much better on smaller tasks... facilitate breaking down the scope so that individual steps can be validated easily"*).

Formate como checklist markdown, uma tarefa por linha, na ordem de execução:

```markdown
## Tasks

- [ ] 1. <tarefa atômica>
- [ ] 2. <tarefa atômica>
...
```

Cada tarefa deve deixar claro o que muda e onde (arquivo/módulo), sem virar pseudocódigo — o "como" detalhado de cada tarefa é resolvido durante a implementação, respeitando `plan.md`.

Escreva `.oh-my-sdd/specs/<slug>/tasks.md`.

## Phase 3 — Checkpoint Bloqueante

Apresente **`plan.md` e `tasks.md` juntos** ao usuário e pergunte explicitamente: "Confirma que pode iniciar a implementação com este plano e esta lista de tarefas?"

- Se pedir ajustes: edite `plan.md` e/ou `tasks.md` e apresente novamente. Repita até confirmação explícita.
- Se confirmar: reporte ao chamador "plano e tasks validados, pode implementar" e finalize — quem a chamou (a skill `oh-my-sdd`) prossegue para `oh-my-sdd-implement`.
- Se o usuário quiser pausar/abandonar: reporte isso ao chamador em vez de "validado".

**Canal issue (`channel=issue`):** mesmo checkpoint, publicado na issue.

1. Ative `oh-my-sdd-ecosystem` em modo `publish` com fase `tasks-pending`, passando o slug e o texto do checkpoint (a mesma pergunta acima, resumo do `plan.md` ou da seção Decisões, e a lista de tarefas). Ela faz commit no branch da feature, atualiza o PR/MR, publica um comentário único e troca a label.
2. Reporte ao chamador **"aguardando aprovação assíncrona"** — não é confirmação; o orquestrador encerra o turno.
3. Na reentrada com pedido de ajuste, edite `plan.md`/`tasks.md` existentes e publique de novo (mesma fase).
4. Só reporte "plano e tasks validados, pode implementar" quando o orquestrador reentrar com `approve-tasks` e `approved=true` vindo de `oh-my-sdd-ecosystem`.
