# Referência de Skills

## `oh-my-sdd` (orquestrador)

**Tools permitidas:** `Read`, `Glob`, `Grep`, `Skill`

Ponto de entrada de todo o fluxo. Ela:

1. Identifica o input — texto livre, uma chave/URL do Jira (delegando para `jira-fetch` ou uma tool MCP Atlassian quando disponível), ou uma referência de issue GitHub/GitLab (delegando para `oh-my-sdd-ecosystem`). Carrega também um **canal**: `terminal` (checkpoints no chat, padrão) ou `issue` (checkpoints publicados na issue, apenas quando acionado por menção/label em CI ou pedido explicitamente).
2. Deriva um slug em kebab-case para a feature e verifica se `.oh-my-sdd/specs/<slug>/` já existe (feature nova vs. retomada).
3. Ativa `oh-my-sdd-constitution`, `oh-my-sdd-specify`, `oh-my-sdd-plan`, `oh-my-sdd-tasks` e `oh-my-sdd-implement`, estritamente nessa ordem, esperando o sinal de cada checkpoint antes de continuar.

Ela nunca gera `constitution.md`, `spec.md`, `plan.md`, `tasks.md`, nem código de implementação diretamente.

## `oh-my-sdd-constitution`

**Tools permitidas:** `Read`, `Write`, `Glob`, `Grep`

Garante que o projeto tenha um `.oh-my-sdd/constitution.md`:

- Se já existir, é lido e confirmado — sem regeneração, sem perguntas. Um pedido explícito de regeneração/merge varre as fontes de novo e propõe um **diff**, nunca regenera do zero (suas edições manuais ficam intocadas).
- **Fontes primeiro:** a skill varre `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, `.windsurfrules`, `CONTRIBUTING.md`, configs de lint/format da raiz e `.github/workflows/` em ordem fixa, extraindo regras **com citação da fonte**. Regras conflitantes entre fontes são listadas e perguntadas — nunca resolvidas silenciosamente.
- Depois analisa o código (`package.json` / `composer.json` / `pyproject.toml` / `go.mod`, estrutura de pastas, convenções de nomenclatura) para preencher lacunas, perguntando ao usuário só o que nem fontes nem código resolveram (tipicamente ≤2 perguntas).
- Toda regra fica rastreável: a constitution gerada traz um bloco `## Fontes` mapeando cada regra ao arquivo de origem; regras inferidas do código são marcadas como tal.
- O documento segue a estrutura e as regras das [boas práticas de constitution](../concepts/constitution-best-practices.md) e do [exemplo prático](../concepts/constitution-example.md): linguagem absoluta ("sempre"/"nunca"), uma persona explícita para o agente, uma stack tecnológica travada, e nenhum conteúdo específico de feature.

## `oh-my-sdd-specify`

**Tools permitidas:** `Read`, `Write`, `Glob`, `Grep`, `Skill`

Gera `.oh-my-sdd/specs/<slug>/spec.md`:

- Trata `constitution.md` como restrição vinculante.
- Se `spec.md` já existir, trata como edição/continuação em vez de regenerar do zero.
- Estrutura o documento exatamente como o [exemplo prático de spec](../concepts/spec-example.md), usando sintaxe EARS/GEARS para requisitos funcionais, um checklist verificável de critérios de aceite, e requisitos não-funcionais/contratos.
- **Checkpoint #1**: apresenta o spec e não devolve o controle ao orquestrador até o usuário validá-lo explicitamente (ou pausar/abandonar explicitamente). Em canal issue, a mesma pergunta é publicada na issue via `oh-my-sdd-ecosystem` e a skill retorna "aguardando aprovação assíncrona" — que nunca conta como validação.
- Vincula o spec à sua issue quando houver (`issue.json` + linha `Issue:`) e, no terminal, oferece uma vez criar/vincular uma issue após a validação.

## `oh-my-sdd-plan`

**Tools permitidas:** `Read`, `Write`, `Glob`, `Grep`

Traduz o `spec.md` validado em `.oh-my-sdd/specs/<slug>/plan.md`: decisões arquiteturais, esquema de dados/API e escolha de bibliotecas — o "como" — sempre dentro das restrições de `constitution.md`. Não tem checkpoint próprio; `plan.md` é validado junto com `tasks.md` na fase seguinte.

## `oh-my-sdd-tasks`

**Tools permitidas:** `Read`, `Write`, `Glob`, `Grep`, `Skill`

Quebra `plan.md` em `.oh-my-sdd/specs/<slug>/tasks.md` — tarefas pequenas, atômicas e sequenciais, cada uma verificável de forma independente.

**Checkpoint #2**: apresenta `plan.md` **e** `tasks.md` juntos e não devolve o controle até o usuário confirmar explicitamente que a implementação pode começar. Em canal issue, o checkpoint é publicado na issue (`sdd:tasks-pending`) e a skill retorna "aguardando aprovação assíncrona".

## `oh-my-sdd-implement`

**Tools permitidas:** `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, `Skill`

Implementa a feature:

- Lê `tasks.md`, `spec.md` e `constitution.md`; detecta quais tarefas já estão marcadas (suporte a retomada).
- Implementa tarefa por tarefa, respeitando `constitution.md`. Se precisar desviar do que foi especificado, para e pergunta em vez de decidir silenciosamente.
- Marca cada tarefa em `tasks.md` conforme é concluída.
- Reporta quais tarefas foram implementadas e quais critérios de aceite de `spec.md` foram atendidos — comparando o código gerado diretamente contra o checklist. Em canal issue, o relatório é o comentário final na issue e o PR/MR sai do rascunho.

## `oh-my-sdd-ecosystem`

**Tools permitidas:** `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`

Adaptador de canal para o ecossistema do repositório (GitHub/GitLab) — **não** é uma fase do pipeline e nunca gera artefatos. Modos:

- `resolve` — transforma uma referência de issue (URL, `owner/repo#n`, `#n`) em `{provider, repo, number, url, title, body, labels, comments}`, lendo pelas tools do host (MCP GitHub/GitLab → `gh`/`glab` → pedir o conteúdo colado). O conteúdo da issue é entregue marcado como dado não confiável.
- `intent` — classifica o comentário acionador (`specify`, `adjust-spec`, `approve-spec`, `plan-tasks`, `approve-tasks`, `implement`, `status` ou `ambiguous`) e valida aprovações contra a permissão no repositório (write+ no GitHub, Developer+ no GitLab, ou a lista configurada).
- `publish` — branch `oh-my-sdd/<slug>`, commit, push, PR/MR em rascunho (`Refs #n`), um comentário idempotente por transição de fase, troca da label de fase.
- `link` — cria (com confirmação explícita) ou vincula uma issue a um spec: grava `issue.json` e a linha `Issue:`.

Também faz a triagem de suficiência (≤5 perguntas em um comentário antes de qualquer spec), lista e ignora pedidos de desvio encontrados na issue, e reconstrói a fase do pipeline a partir de artefatos + labels quando `runtime/` não existe. Veja [Ecossistema](../ecosystem.md).
