# Brief: Ecosystem v2 — adoção em qualquer runner, aprovação nativa, specs vivas e contrato por provedor

Estado: **a especificar**. Este brief é o input da próxima sessão; o `spec.md` nasce dele pelo ciclo SDD normal, com checkpoint #1 antes de qualquer código.

Como começar a próxima sessão:

```
/oh-my-sdd "ecosystem-v2: ler .oh-my-sdd/specs/ecosystem-v2/brief.md e especificar"
```

(Quando Issues estiverem habilitadas no repositório, converter este brief em issue e usar `/oh-my-sdd <url-da-issue>`.)

Pré-requisitos:
- PR #1 mergeado.
- **Habilitar Issues** em Settings → General → Features (hoje estão desabilitadas; o canal por issue depende disso).
- Secret `ANTHROPIC_API_KEY` no repositório.

## Intenção

Fazer o oh-my-sdd ser adotado em cinco minutos por quem já usa Claude em um repositório, qualquer que seja o runner (terminal, Claude Code na web, claude-code-action, atribuição de issue via GitHub Agent HQ), e tornar a camada de ecossistema portável e verificável.

Posicionamento (ver pesquisa de 2026-10-09): ferramentas de SDD (Spec Kit, OpenSpec, Kiro) não operam dentro da thread da issue; agentes acionados por issue (Agent HQ / Copilot coding agent, claude-code-action) vão de issue a PR sem checkpoint de spec. O oh-my-sdd ocupa o espaço entre os dois: **governança de spec em cima dos agentes que o GitHub já oferece**. Por isso, o pacote **não compete como runner** — ele define o que o Claude faz depois de acionado, e precisa estar visível em qualquer runner.

## Escopo, em ordem de prioridade

### 1. Adoção em qualquer runner (vem antes de tudo)
- **Instalação por projeto:** `npx oh-my-sdd install --project` grava as skills em `.claude/skills/` (versionado) além do modo global atual; `status`/`uninstall` entendem os dois escopos; manifest por escopo. Um Claude acionado pelo Agent HQ ou pela web descobre o fluxo sem rodar nada.
- **Export para `CLAUDE.md`:** `npx oh-my-sdd export claude` grava a seção marcada (mesmo merge idempotente de `codex`/`gemini`) para que um Claude sem skills instaladas ainda siga o pipeline.
- **Plugin do marketplace oficial do Claude Code:** `plugin.json` com skills, comandos e hooks, publicável; `install` continua funcionando como hoje.
- Os templates de CI deixam de depender de `npx -y oh-my-sdd install` no runner quando as skills já estão no repositório.

### 2. Aprovação como primitiva nativa do GitHub
- O checkpoint #1 é aprovado por **review "Approve" no PR rascunho do spec**, e o #2 por review no mesmo PR após `plan.md` + `tasks.md`. Comentário `/oh-my-sdd approve ...` e label continuam aceitos como alternativa (GitLab, Jira).
- **CODEOWNERS** em `.oh-my-sdd/specs/**` define quem pode aprovar; a skill verifica que o reviewer é owner (ou tem permissão de escrita, quando não há CODEOWNERS).
- **Status checks** `sdd/spec-approved`, `sdd/tasks-approved` e `sdd/evidence` publicados no head do PR (via `gh api` pelo agente), para que a proteção de branch possa exigi-los. É o mecanismo que torna o checkpoint impossível de pular.
- Evidência dos sensors publicada como check run com critérios atendidos e pendentes, não só como comentário.

### 3. Specs vivas com delta (lição do OpenSpec)
- Uma feature em código existente nasce como **delta** (ADDED / MODIFIED / REMOVED) sobre a spec vigente do domínio; ao concluir, o delta é **arquivado** e fundido na spec principal.
- `report` sinaliza drift: spec de feature `done` cujo delta não foi fundido, ou spec principal sem feature correspondente.
- Compatível com o layout atual: `specs/<slug>/` continua existindo; a spec principal por domínio é adição, não substituição. Decisão de formato fica para o plan.

### 4. Contrato por provedor (tracker / forge / board)
- Separar **tracker** (conversa e checkpoints), **forge** (branch e PR/MR) e **board** (projeção de estado; só escrita, nunca fonte de verdade).
- `ecosystem.json` com `tracker`, `forge` e `board` (opcional); formato atual (`provider` único) continua válido.
- Contrato do tracker em seis operações: ler item, listar comentários, publicar comentário, trocar estado/label, checar permissão do autor, criar/vincular item. Forge em quatro: criar branch, commitar, abrir revisão em rascunho, tirar do rascunho. Mais: publicar status check (forge), quando o provedor suportar.
- Um adaptador por provedor em `skills/oh-my-sdd-ecosystem/providers/<nome>.md`: tabela operação → ferramenta, na ordem MCP → CLI → colar conteúdo (piso universal). Pacote continua sem rede.
- `issue.json` generalizado: chave do item como string (`PROJ-123`); `tracker` e `forge` quando diferentes.

### 5. Garantia executável
- `npx oh-my-sdd ecosystem doctor`: matriz de capacidades do ambiente (escopo de instalação, CLIs autenticadas, provider do remote, o que degrada para fallback). Só leitura, sem rede.
- Modo **dry-run** no `publish`: lista as operações sem executar; base para conformidade por provedor com fixtures em CI.
- Teste de fumaça de ponta a ponta por provedor em projeto sandbox: acionamento → spec publicado → aprovação sem permissão ignorada → aprovação válida avança → status check verde.

### 6. Provedores
- **GitHub issue**: manter; adicionar acionamento por **atribuição de issue ao Claude (Agent HQ)** como caminho de entrada equivalente à menção.
- **GitHub Discussions** como canal de entrada: eventos `discussion` e `discussion_comment`; leitura/escrita via `gh api graphql`; labels de fase; aprovação por permissão (nunca por "marcar como resposta"); contexto passado ao agente pelo prompt. Ciclo: discussion gera intenção → issue vinculada carrega os checkpoints → PR carrega o código.
- **GitLab**: executar de verdade o template (webhook → pipeline trigger, `$TRIGGER_PAYLOAD`, `glab`) e corrigir o que falhar; aprovação por review do MR quando disponível.
- **Jira** como tracker com forge separado (GitHub ou Bitbucket): Automation → webhook → `repository_dispatch` (ou equivalente); leitura/escrita via MCP Atlassian ou CLI; permissão por papel no projeto.
- **GitHub Projects v2** como board: campo single-select "SDD phase" espelhado a cada transição; exige token de App/PAT com permissão Projects; sem token, degrada com aviso.
- Caminho aberto (adaptador em markdown, sem código) para Bitbucket, Azure DevOps e Linear.

### 7. Docs
- README + `docs/ecosystem.md` (EN/PT) por runner (terminal, web, action, Agent HQ), por papel (tracker / forge / board) e por provedor, com a matriz "verificado por fixture / de ponta a ponta / não verificado".

## O que se preserva como diferencial
- Escala adaptativa (QUICK/SMALL baratos): resposta direta à crítica de peso do Spec Kit.
- Constitution inferida das fontes existentes (brownfield).
- Evidência executável em vez de autoavaliação do agente.
- Specs em markdown neutras: Copilot e Codex seguem via export; experiência completa no Claude.

## Critérios de aceite (rascunho)
- [ ] `install --project` + `export claude`: um Claude acionado sem instalação global segue o pipeline (verificado em sandbox).
- [ ] Review "Approve" no PR do spec por owner avança a fase; review de quem não é owner não avança; status checks publicados e exigíveis por branch protection.
- [ ] Evidência dos sensors aparece como check run no PR.
- [ ] Feature em código existente gera delta; arquivar funde na spec principal; `report` sinaliza drift.
- [ ] `ecosystem.json` com tracker/forge/board; config antiga continua válida.
- [ ] `ecosystem doctor` e `publish --dry-run` com saída estável.
- [ ] GitLab e Jira + GitHub rodam o ciclo completo em sandbox; Discussion gera perguntas ou issue vinculada; Project reflete a fase quando configurado.
- [ ] Nenhuma chamada de rede em `lib/`; nenhuma dependência nova.
- [ ] Docs EN/PT atualizadas.

## Ordem sugerida
1. Instalação por projeto + export para `CLAUDE.md` + plugin.
2. Aprovação por review de PR + CODEOWNERS + status checks + evidência como check run.
3. Specs vivas com delta e arquivamento.
4. Separação tracker/forge/board + `doctor` + dry-run.
5. GitLab de ponta a ponta.
6. Discussions e atribuição via Agent HQ.
7. Jira com forge separado.
8. Projects.

Escala esperada: LARGE. Provavelmente vale quebrar em 2 ou 3 features no spec (adoção + aprovação nativa; specs vivas; provedores), decisão a tomar no checkpoint #1.
