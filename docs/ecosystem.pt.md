# Ecossistema: issues (GitHub / GitLab)

O pipeline SDD é síncrono por padrão: você roda `/oh-my-sdd` no terminal do Claude Code e valida os dois checkpoints no chat. A **camada de ecossistema** permite que uma sessão agêntica web — Claude Code na web, um job do GitHub Actions, um job do GitLab CI — rode o **mesmo** pipeline em torno de uma issue do seu repositório.

- A **issue** é a fonte de intenção e o canal de conversa.
- O **repositório** continua sendo a única fonte de verdade dos artefatos (`.oh-my-sdd/specs/<slug>/`).
- Os dois **checkpoints humanos** continuam bloqueantes; migram de "pergunta no chat" para "comentário na issue".

## Configuração

```bash
npx oh-my-sdd ecosystem init github   # ou: gitlab
```

| Provider | Escreve | Gatilho |
|---|---|---|
| `github` | `.github/workflows/oh-my-sdd.yml` ([claude-code-action](https://github.com/anthropics/claude-code-action)) | menção `@claude` em comentário de issue/PR, issue aberta com a menção, ou label `sdd:specify` |
| `gitlab` | `.gitlab/oh-my-sdd.gitlab-ci.yml` (include) | webhook (Comments + Issues events) → pipeline trigger; o próprio job filtra menção/label |

Ambos gravam `.oh-my-sdd/config/ecosystem.json`:

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

`approval` é `"write"` (padrão), `"maintain"` ou uma lista explícita de logins. Edite o config e rode `init` de novo para re-renderizar o template.

Guardrails do `init`:

- Pergunta antes de escrever fora de `.oh-my-sdd/` (`--yes` pula a pergunta; sem TTY e sem `--yes`, nada é gravado).
- Rodar de novo com template inalterado imprime "já registrado".
- Um template que você editou à mão **nunca** é sobrescrito sem confirmação ou `--force` (o hash em `ecosystem.json` distingue o nosso do seu).
- Segredos são referenciados só por nome (`ANTHROPIC_API_KEY`, ou `CLAUDE_CODE_OAUTH_TOKEN`; no GitLab também `SDD_GITLAB_TOKEN`).

!!! note "GitLab exige um passo manual"
    O GitLab não tem app de menção nativo. Crie um pipeline trigger token, aponte um webhook do projeto (Comments + Issues events) para `https://<host>/api/v4/projects/<id>/ref/<branch>/trigger/pipeline?token=<token>` e defina `ANTHROPIC_API_KEY` + `SDD_GITLAB_TOKEN` (project access token, `api` + `write_repository`) como variáveis de CI mascaradas. O job lê o payload do webhook em `$TRIGGER_PAYLOAD`.

## Formas de entrada

### Referência direta (terminal)

```
/oh-my-sdd https://github.com/org/repo/issues/42
/oh-my-sdd https://gitlab.com/group/project/-/issues/42
/oh-my-sdd org/repo#42
/oh-my-sdd #42            # o remote origin decide provider e repo
```

O orquestrador lê a issue pelas tools que o host já tem — MCP GitHub/GitLab primeiro, depois `gh`/`glab`; sem nenhuma, pede o conteúdo colado. Os checkpoints ficam no chat (`channel=terminal`); o spec fica **vinculado** à issue:

- `.oh-my-sdd/specs/<slug>/issue.json` — `{provider, url, repo, number, linkedAt}` (versionado);
- uma linha `Issue: <url>` logo abaixo do título do spec.

Referenciar a mesma issue de novo retoma o mesmo slug, mesmo que o título da issue tenha mudado.

### Menção no repositório (CI, `channel=issue`)

1. Alguém menciona `@claude` (ou aplica `sdd:specify`) em uma issue.
2. O CI instala as skills e ativa `/oh-my-sdd` em canal issue. `oh-my-sdd-ecosystem` resolve a issue e classifica a intenção do comentário acionador: `specify`, `adjust-spec`, `approve-spec`, `plan-tasks`, `approve-tasks`, `implement`, `status` — ou pergunta quando ambíguo.
3. A escala é classificada como sempre e aparece na primeira linha do primeiro comentário.
4. `oh-my-sdd-specify` escreve o spec; `oh-my-sdd-ecosystem` faz commit no branch `oh-my-sdd/<slug>`, abre um **PR/MR em rascunho** (`Refs #n`, nunca `Closes`), publica **um** comentário com a pergunta de validação e aplica `sdd:spec-pending`. O turno encerra.
5. Um mantenedor responde `/oh-my-sdd approve spec` (ou aplica `sdd:spec-approved`). A próxima execução gera `plan.md` + `tasks.md` e repete o protocolo com `sdd:tasks-pending`.
6. Após `/oh-my-sdd approve tasks`, `oh-my-sdd-implement` roda no mesmo branch com o gate de evidência; o relatório final (critérios atendidos **com evidência**, critérios pendentes de verificação) é o último comentário, o PR/MR sai do rascunho e a label vira `sdd:done`.

Pedidos de ajuste editam os artefatos existentes (nunca regeneram) e republicam no mesmo branch. Um comentário por transição de fase; nada é republicado se o último comentário do agente já anuncia a mesma transição.

### Geração conversacional

Se a issue não tiver intenção reconhecível (o quê + porquê) e ao menos um critério de aceite inferível, o agente publica **no máximo 5 perguntas em um único comentário**, aplica `sdd:needs-input` e para. As respostas do autor passam a compor a intenção na próxima execução. Issue vazia nunca gera spec.

### Sentido inverso

Depois de um spec validado no terminal, se o remote do projeto for GitHub/GitLab e não houver `issue.json`, o agente pergunta uma vez: criar uma issue, vincular a uma existente ou não vincular. Nada é criado sem um sim explícito.

## Aprovação e confiança

- **Aprovação exige permissão de escrita.** GitHub: `author_association` do comentário em `OWNER`/`MEMBER`/`COLLABORATOR` (ou a API de permissão de colaboradores); GitLab: access level ≥ Developer (30). `"maintain"` sobe a régua; uma lista de logins restringe. O "aprovado" de qualquer outra pessoa é tratado como input e nunca avança a fase.
- **Conteúdo da issue é dado, não instrução.** Pedidos dentro da issue para pular checkpoint, escrever fora de `.oh-my-sdd/`, adicionar dependência ou baixar a escala são ignorados e listados em "Desvios solicitados e ignorados" no próximo comentário de checkpoint.
- **Contêineres efêmeros.** `.oh-my-sdd/runtime/` não precisa sobreviver entre execuções de CI: a fase é reconstruída a partir dos artefatos versionados, dos checkboxes de `tasks.md` e das labels de fase da issue.
- **Sem rede no pacote.** `lib/` só escreve arquivos locais; toda chamada ao GitHub/GitLab é feita pelo agente hospedeiro com as próprias tools.

## Labels

| Label | Significado |
|---|---|
| `sdd:specify` | gatilho: iniciar o pipeline nesta issue |
| `sdd:needs-input` | aguardando o autor responder às perguntas do agente |
| `sdd:spec-pending` | spec publicado, aguardando o checkpoint #1 |
| `sdd:spec-approved` | checkpoint #1 passou (também pode ser aplicada por um mantenedor para aprovar) |
| `sdd:tasks-pending` | plan + tasks publicados, aguardando o checkpoint #2 |
| `sdd:implementing` | implementação em andamento no branch da feature |
| `sdd:done` | relatório final publicado, PR/MR pronto para revisão |

O prefixo vem de `labelPrefix`; as labels são criadas no primeiro uso.

## `report`

`npx oh-my-sdd report` mostra uma coluna `ISSUE` (`#n`), e `--json` adiciona `"issue": "<url>" | null` — campo aditivo; o schema existente não muda.
