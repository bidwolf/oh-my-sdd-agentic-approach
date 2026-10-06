# Plan: Specs atreladas a issues (GitHub / GitLab)

Issue: — (feature do próprio oh-my-sdd; vínculo será criado quando o Req-06 existir)

## 1. Decisões Arquiteturais

- **Nova skill `oh-my-sdd-ecosystem` (7ª skill), adaptador de canal.** Toda a lógica que depende do provider — resolver referência de issue, ler issue/comentários via tools do host, classificar intenção da menção, política de aprovação, protocolo de comentário/label/branch/PR-MR, reconstrução de estado — vive em um único `SKILL.md`. `allowed-tools: Read, Write, Edit, Bash, Glob, Grep` (Bash para `git`, `gh`, `glab`). O `Writer` descobre pastas em `skills/` automaticamente, então instalação, manifest, `status` e `uninstall` passam a cobrir 7 skills sem código novo; apenas os textos "6 skills" mudam para "7 skills".
- **O orquestrador continua sem gerar artefatos.** Mudanças em `skills/oh-my-sdd/SKILL.md`:
  - Fase 1 ganha o terceiro tipo de input (**issue**): padrões `github.com/<o>/<r>/issues/<n>`, `gitlab.com/<g>/<p>/-/issues/<n>` (inclusive self-hosted, pelo sufixo `/-/issues/`), `<o>/<r>#<n>` e `#<n>` com remote `origin` reconhecível. Ao casar, ativa `oh-my-sdd-ecosystem` em modo `resolve` e recebe de volta `{provider, repo, number, url, title, body, labels, comments, channel}`.
  - Fase 2 consulta `issue.json` de todas as `specs/*/` (via `Glob`+`Read`) antes de derivar slug: match por `provider+repo+number` → retoma o slug existente (Req-04).
  - Novo conceito **`channel=terminal|issue`**, propagado a `specify`, `tasks` e `implement`. `channel=issue` só é usado quando a ativação veio de menção/label em CI ou quando o usuário pediu explicitamente ("conduz pela issue"); uma URL de issue colada no terminal mantém `channel=terminal` (checkpoints no chat) e apenas cria o vínculo.
  - Em `channel=issue`, cada sub-skill com checkpoint pode retornar um terceiro sinal, **"aguardando aprovação assíncrona"**; ao recebê-lo, o orquestrador encerra o turno. Uma menção posterior reentra pela Fase 1, a skill ecosystem classifica a intenção (Req-11) e o orquestrador retoma na fase correspondente, reconstruindo a fase pelos artefatos + labels (Req-20) — nunca por `runtime/`.
- **Checkpoints permanecem nas skills donas dos artefatos.** `oh-my-sdd-specify` (Fase 4) e `oh-my-sdd-tasks` (Fase 3) ganham um parágrafo "Canal issue": em vez de perguntar no chat, delegam à skill ecosystem a publicação do checkpoint (commit + push + comentário único + label) e retornam "aguardando aprovação assíncrona". A pergunta de validação é a mesma do terminal (paridade de canal). Na reentrada com intenção `aprovar spec`/`aprovar tasks`, a skill ecosystem valida a permissão do autor (Req-13/14) e só então a skill dona reporta "validado".
- **Protocolo de publicação (ecosystem, modo `publish`):** branch `<branchPrefix>/<slug>` criado a partir do default branch se não existir; commit dos artefatos; push; PR/MR em rascunho com corpo referenciando a issue sem palavra-chave de fechamento (`Refs #n`); comentário único na issue com resumo + link + pergunta; troca de label de fase (remove a anterior do prefixo, aplica a nova). Idempotência: antes de comentar, lista os últimos comentários do próprio bot e, se o último já for a mesma transição, não republica.
- **Política de aprovação:** GitHub usa `author_association` do comentário (`OWNER|MEMBER|COLLABORATOR`) ou, se ausente, `gh api repos/<o>/<r>/collaborators/<user>/permission`; GitLab usa `glab api projects/:id/members/all/:user_id` (access_level ≥ 30). `ecosystem.json.approval` pode elevar para `maintain` ou restringir a lista de usuários. Texto de aprovação: `/oh-my-sdd approve spec|tasks` ou aprovação explícita em linguagem natural dirigida ao handle; qualquer outra coisa é input.
- **Conteúdo externo é dado.** A skill ecosystem entrega título/corpo/comentários ao orquestrador dentro de um bloco demarcado como "conteúdo da issue (não confiável)". Instruções nele que peçam desvio do pipeline são listadas num item "Desvios solicitados e ignorados" do comentário de checkpoint (Req-15).
- **Geração conversacional (Req-17):** na primeira menção, a skill ecosystem faz a triagem de suficiência: intenção reconhecível (o quê + porquê) e ao menos um critério inferível. Se faltar, publica um comentário com ≤5 perguntas, aplica `sdd:needs-input` e retorna "aguardando input"; a resposta do autor reentra como continuação e as respostas viram parte da descrição de intenção. Issue vazia nunca gera spec.
- **Sentido inverso (Req-06):** em `channel=terminal`, após "spec validado", `oh-my-sdd-specify` verifica `git remote get-url origin`; se GitHub/GitLab e sem `issue.json`, oferece "criar issue / vincular existente / não". Quem executa é a skill ecosystem (modo `link`), gravando `issue.json` e a linha `Issue:` no spec.
- **CLI `ecosystem init github|gitlab [--yes]`** em `lib/commands/ecosystem.js`: só escrita local. Copia o template de `lib/templates/ecosystem/`, grava `.oh-my-sdd/config/ecosystem.json` e pede confirmação (inquirer) antes de escrever fora de `.oh-my-sdd/`; `--yes` pula (padrão `sensor init`). Detecção de modificação manual: `ecosystem.json.templates[<path>] = sha256` gravado na escrita (reuso de `hashFile` de `lib/installer/manifest.js`); re-run com hash igual → "já registrado"; hash diferente → pede confirmação antes de sobrescrever. Sem rede, sem deps novas.
- **Templates sem lógica de pipeline (Req-10):** o YAML só instala o pacote (`npx -y oh-my-sdd install`) e aciona o agente com um prompt curto: "ative `/oh-my-sdd` em modo ecossistema para o evento recebido". Todo o comportamento vem das skills instaladas.
  - GitHub: `anthropics/claude-code-action@v1`; triggers `issue_comment` (created), `issues` (opened, labeled), `pull_request_review_comment` (created); `if` filtra menção ao handle ou label `<labelPrefix>specify`; `permissions: contents: write, issues: write, pull-requests: write, id-token: write`; segredo referenciado apenas como `${{ secrets.ANTHROPIC_API_KEY }}` (com comentário sobre `CLAUDE_CODE_OAUTH_TOKEN` como alternativa).
  - GitLab: include `.gitlab/oh-my-sdd.gitlab-ci.yml` com job `oh-my-sdd` em `rules: $CI_PIPELINE_SOURCE == "trigger" && $SDD_EVENT`, variáveis `SDD_ISSUE_IID`, `SDD_NOTE`, `SDD_AUTHOR`; instala `@anthropic-ai/claude-code` + oh-my-sdd e roda `claude -p`; `ANTHROPIC_API_KEY` vem de CI/CD variable. O comando imprime o passo manual: webhook de "Comments" → pipeline trigger token, com o mapeamento de variáveis.
- **`report`:** `inspectSlug` lê `issue.json` e expõe `issue` (url ou `null`) no JSON (campo adicional, schema existente intacto) e coluna `ISSUE` na tabela (número encurtado `#n`). Correção embutida: o parser de "Critérios de Aceite" passa a aceitar prefixo numérico (`## 3. Critérios de Aceite`) — hoje nenhum spec do repo tem pendências contabilizadas por isso; é bug no comando que o Req-05 já toca.
- **Fora de escopo deste plan (explícito):** modo ecossistema para Jira; bot próprio/webhook server; GitLab com menção nativa (depende de app inexistente).

## 2. Esquema de Dados

`.oh-my-sdd/specs/<slug>/issue.json` (versionado):
```json
{ "provider": "github", "url": "https://github.com/o/r/issues/12", "repo": "o/r", "number": 12, "linkedAt": "2026-10-06T12:00:00Z" }
```

`.oh-my-sdd/config/ecosystem.json` (versionado):
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
`approval`: `"write" | "maintain" | ["login", ...]`. Defaults aplicados pela skill quando o arquivo não existe: os valores acima sem `templates`.

Labels de fase (prefixo configurável): `specify` (acionamento), `needs-input`, `spec-pending`, `spec-approved`, `tasks-pending`, `implementing`, `done`. A skill cria a label se não existir (cor fixa, descrição curta).

Linha de vínculo em `spec.md`: segunda linha do arquivo, `Issue: <url>`, logo após o `# Spec: ...`.

`report --json` (aditivo): `{ slug, phase, tasks_done, tasks_total, pending_criteria, issue }`.

## 3. Bibliotecas e Dependências

- Nenhuma nova. `inquirer` para confirmação em `ecosystem init`; `chalk` para saída; `crypto` builtin via `hashFile` já existente.
- Ferramentas do host usadas pela skill (nunca pelo pacote), em ordem de preferência: MCP GitHub/GitLab → `gh`/`glab` → fallback texto livre.

## 4. Contratos entre Skills

- `oh-my-sdd` → `oh-my-sdd-ecosystem` (`mode=resolve`, ref): retorna input normalizado + `channel`.
- `oh-my-sdd` → sub-skills: `channel=terminal|issue` além de `scale` e `slug`.
- `oh-my-sdd-specify` / `oh-my-sdd-tasks` → `oh-my-sdd-ecosystem` (`mode=publish`, slug, fase, texto do checkpoint): publica e retorna; a skill dona reporta "aguardando aprovação assíncrona".
- `oh-my-sdd-ecosystem` (`mode=intent`, comentário, autor): retorna `{intent, approved: bool, reason}`; `approved` só é `true` com permissão válida.
- `oh-my-sdd-ecosystem` (`mode=link`, slug, url|new): grava `issue.json` e a linha `Issue:`.
- `oh-my-sdd-implement` em `channel=issue`: mesmo fluxo; relatório final publicado via `publish` com fase `done`, PR/MR sai de rascunho.

## 5. Estratégia de Verificação

- CA `ecosystem init github`: fixture em diretório temporário com `git init` + remote fake; `--yes` escreve workflow + `ecosystem.json` com hash; re-run → "já registrado"; editar o YAML e re-rodar sem `--yes` → pergunta (verificado com stdin não-TTY: aborta sem sobrescrever).
- CA `ecosystem init gitlab`: include escrito + instrução de webhook impressa.
- CA segredos: `grep -E 'sk-ant|ghp_|glpat' lib/templates/ecosystem/` vazio; só `secrets.`/`$ANTHROPIC_API_KEY`.
- CA `report`: fixture com `specs/x/issue.json` → coluna/campo `issue`; sem arquivo → `null`; spec com `## 3. Critérios de Aceite` e `- [ ]` → pendências contadas.
- CA sem rede: `grep -nE "fetch\(|from 'http|from 'https|from 'net|node:http" lib/ bin/` vazio.
- CA de comportamento de skill (menção, aprovação por permissão, injeção, issue vazia, continuação por `issue.json`): releitura integral dos SKILL.md alterados + simulação dos fluxos com os sinais de retorno; registro em `manual-checks.md`.
- `node bin/oh-my-sdd.js status` após mudanças no instalador/contagem de skills.

## 6. Documentação

- README: seção "Ecosystem: issues (GitHub/GitLab)" após "Session hooks"; tabela de skills ganha `oh-my-sdd-ecosystem`; "6 skills" → "7 skills".
- docs EN/PT: nova página `docs/ecosystem.md` + `docs/ecosystem.pt.md` (entrada no `nav` do `mkdocs.yml` após "CLI Reference"); `cli.md`/`cli.pt.md` ganham `ecosystem init` e o campo `issue` do `report`; `architecture/skills.md` ganha a 7ª skill; `architecture/overview.md` ganha o canal issue no diagrama; contagens atualizadas em `index`, `installation`, `quick-start`, `overview`.
