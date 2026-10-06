# Visão Geral da Arquitetura

O `oh-my-sdd` não é uma skill monolítica — é um **orquestrador** que ativa **5 skills especializadas**, uma por fase do Spec-Driven Development, mais um **adaptador de canal** (`oh-my-sdd-ecosystem`) que permite rodar o mesmo pipeline a partir de uma issue do GitHub/GitLab. Cada skill é responsável por exatamente um artefato e, quando relevante, por seu próprio checkpoint humano.

## O fluxo

```mermaid
flowchart TD
    A["/oh-my-sdd &lt;tarefa, chave do Jira ou issue&gt;"] --> B[oh-my-sdd<br/>orquestrador]
    I["menção @claude / label sdd:specify<br/>em uma issue (CI)"] --> X[oh-my-sdd-ecosystem<br/>resolve + intent]
    X --> B
    B --> C[oh-my-sdd-constitution]
    C --> D[oh-my-sdd-specify]
    D -->|checkpoint: spec.md validado?| D
    D --> E[oh-my-sdd-plan]
    E --> F[oh-my-sdd-tasks]
    F -->|checkpoint: plan.md + tasks.md aprovados?| F
    F --> G[oh-my-sdd-implement]
    G --> H[Código implementado,<br/>tasks.md marcado]
    D -.->|canal issue: publica checkpoint<br/>branch + PR/MR rascunho + comentário + label| X
    F -.->|canal issue| X
    G -.->|canal issue: relatório final| X
```

## Responsabilidades em resumo

| Skill | Lê | Escreve | Checkpoint |
|---|---|---|---|
| `oh-my-sdd` | input do usuário / Jira / issue | — | — |
| `oh-my-sdd-constitution` | código e config do projeto | `.oh-my-sdd/constitution.md` | nenhum (analisa primeiro, pergunta só se necessário) |
| `oh-my-sdd-specify` | `constitution.md` | `.oh-my-sdd/specs/<slug>/spec.md` | **#1** — spec precisa ser validado |
| `oh-my-sdd-plan` | `spec.md`, `constitution.md` | `.oh-my-sdd/specs/<slug>/plan.md` | nenhum |
| `oh-my-sdd-tasks` | `plan.md`, `spec.md` | `.oh-my-sdd/specs/<slug>/tasks.md` | **#2** — plan + tasks precisam ser aprovados |
| `oh-my-sdd-implement` | `tasks.md`, `spec.md`, `constitution.md` | código-fonte do projeto | nenhum (implementação só começa depois do checkpoint #2) |
| `oh-my-sdd-ecosystem` | issue, comentários, labels, `ecosystem.json` | `specs/<slug>/issue.json`, branch da feature, PR/MR, comentários e labels da issue | nenhum — publica os checkpoints das outras skills; aprovação só conta de usuários com permissão de escrita |

## Princípios de design

- **O orquestrador nunca gera artefatos diretamente.** Ele só sequencia as 5 skills e espera o sinal de cada uma antes de avançar.
- **Os checkpoints pertencem à skill responsável pelo artefato.** A `oh-my-sdd-specify` não devolve o controle até você validar o `spec.md`; a `oh-my-sdd-tasks` não devolve o controle até você aprovar `plan.md` + `tasks.md`.
- **Toda skill é autocontida.** Cada uma traz sua própria cópia da [base de conhecimento sobre SDD](../concepts/what-is-sdd.md), então nenhuma skill depende de um caminho relativo para dentro da pasta de uma skill-irmã.
- **A constitution é inferida, não entrevistada.** A `oh-my-sdd-constitution` lê seu código e config reais primeiro; só pergunta o que genuinamente não pode ser inferido.
- **O canal muda onde o checkpoint é perguntado, nunca se.** Em canal issue as mesmas perguntas viram comentários na issue, aprovações exigem permissão de escrita no repositório, e o conteúdo da issue é dado — nunca instrução. Veja [Ecossistema](../ecosystem.md).

Para o comportamento exato de cada skill, veja a [Referência de Skills](skills.md).
