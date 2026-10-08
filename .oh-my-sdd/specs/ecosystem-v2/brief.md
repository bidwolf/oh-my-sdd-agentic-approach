# Brief: Ecosystem v2 — contrato por provedor (tracker / forge / board), Jira, GitLab, Discussions e Projects

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

Tornar a camada de ecossistema portável para qualquer ambiente, com evidência executável por provedor. Hoje a skill `oh-my-sdd-ecosystem` assume que a conversa (issue) e o código (branch/PR) vivem no mesmo lugar, mistura protocolo e provedor, e só o GitHub foi verificado (por fixtures locais).

## Escopo (tudo nesta feature)

### 1. Contrato por provedor
- Separar **tracker** (conversa e checkpoints), **forge** (branch e PR/MR) e **board** (projeção de estado; só escrita, nunca fonte de verdade).
- `ecosystem.json` com `tracker`, `forge` e `board` (opcional); formato atual (`provider` único) continua válido.
- Contrato do tracker em seis operações: ler item, listar comentários, publicar comentário, trocar estado/label, checar permissão do autor ("pode editar este item"), criar/vincular item. Forge em quatro: criar branch, commitar, abrir revisão em rascunho, tirar do rascunho.
- Um adaptador por provedor em `skills/oh-my-sdd-ecosystem/providers/<nome>.md`: tabela operação → ferramenta, na ordem MCP → CLI → colar conteúdo (piso universal). Pacote continua sem rede.
- `issue.json` generalizado: chave do item como string (`PROJ-123`); `tracker` e `forge` quando diferentes.

### 2. Provedores
- **GitHub issue**: manter.
- **GitHub Discussions** como canal de entrada: eventos `discussion` e `discussion_comment` no workflow; leitura/escrita via `gh api graphql`; labels de fase; aprovação por permissão (nunca por "marcar como resposta"); contexto passado ao agente pelo prompt. Ciclo: discussion gera intenção → issue vinculada carrega os checkpoints → PR carrega o código.
- **GitHub Projects v2** como board: campo single-select "SDD phase" espelhado das labels a cada transição; exige token de App/PAT com permissão Projects (o `GITHUB_TOKEN` não acessa); Projects não dispara workflow, gatilho continua sendo menção/label; sem token, degrada com aviso.
- **GitLab**: executar de verdade o template (webhook → pipeline trigger, `$TRIGGER_PAYLOAD`, `glab`) e corrigir o que falhar.
- **Jira** como tracker com forge separado (GitHub ou Bitbucket): Automation → webhook → `repository_dispatch` (ou equivalente); leitura/escrita via MCP Atlassian ou CLI; permissão por papel no projeto; labels do Jira como labels de fase.
- Caminho aberto (adaptador em markdown, sem código) para Bitbucket, Azure DevOps e Linear.

### 3. Garantia executável
- `npx oh-my-sdd ecosystem doctor`: matriz de capacidades do ambiente (CLIs autenticadas, provider do remote, o que degrada para fallback). Só leitura, sem rede.
- Modo **dry-run** no `publish`: lista as operações sem executar; base para conformidade por provedor com fixtures em CI.
- Teste de fumaça de ponta a ponta por provedor em projeto sandbox: menção → spec publicado → aprovação sem permissão ignorada → aprovação válida avança.
- `ecosystem init` pergunta sobre Discussions e Project e cria o campo no Project quando houver token.

### 4. Docs
- README + `docs/ecosystem.md` (EN/PT) por papel (tracker / forge / board) e por provedor, com a matriz "verificado por fixture / de ponta a ponta / não verificado".

## Critérios de aceite (rascunho)
- [ ] `ecosystem.json` com tracker/forge/board; config antiga continua válida.
- [ ] Jira + GitHub (forge separado) roda o ciclo completo em sandbox.
- [ ] GitLab roda o ciclo completo em sandbox.
- [ ] Discussion com menção gera perguntas ou issue vinculada; a issue segue o fluxo normal.
- [ ] Project reflete a fase a cada transição quando configurado; sem token, aviso e nunca bloqueio.
- [ ] `ecosystem doctor` e `publish --dry-run` com saída estável.
- [ ] Nenhuma chamada de rede em `lib/`; nenhuma dependência nova.
- [ ] Docs EN/PT atualizadas.

## Ordem sugerida
1. Separação tracker/forge/board (estrutural; antes de haver usuários do canal).
2. `doctor` + dry-run (permitem dizer "funciona em X" com evidência).
3. GitLab de ponta a ponta.
4. Discussions.
5. Jira com forge separado.
6. Projects.

Escala esperada: LARGE.
