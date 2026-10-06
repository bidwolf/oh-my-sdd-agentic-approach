# Referência da CLI

O `oh-my-sdd` traz uma CLI pequena, invocada via `npx`, que gerencia a instalação global das 7 skills.

## `install`

```bash
npx oh-my-sdd install
```

Instala (ou reinstala) as 7 skills em `~/.claude/skills/`, junto com uma cópia da base de conhecimento dentro de cada uma, e grava um manifest de integridade em `~/.claude/skills/.oh-my-sdd-manifest.json`. Se as skills já estiverem instaladas, pede confirmação antes de reinstalar.

## `status`

```bash
npx oh-my-sdd status
```

Reporta:

- Se o `oh-my-sdd` está instalado, e a versão do pacote instalada.
- Quais das 7 skills estão presentes (`✓`) ou ausentes (`✗`).
- Se algum arquivo instalado foi modificado manualmente desde a instalação (comparado contra o manifest SHA-256) — apenas informativo, nada é sobrescrito.

## `uninstall`

```bash
npx oh-my-sdd uninstall
```

Pede confirmação, depois remove as 7 pastas de skill de `~/.claude/skills/` e o arquivo de manifest. Veja [Segurança e Dados](safety.md) para saber exatamente o que isso toca e o que não toca.

## `sensor`

```bash
npx oh-my-sdd sensor init --yes
npx oh-my-sdd sensor run <feature-slug>
npx oh-my-sdd sensor status <feature-slug>
```

Verificação executável para features SDD. Sensors são comandos reais (detectados automaticamente por stack ou editados por você) que **provam** — em vez de presumir — a integridade do código após a implementação.

### `sensor init`

Varre o projeto (qualquer stack: Node, Python, Go, Rust, Java) e grava `.oh-my-sdd/config/sensors.json` com os comandos resolvidos para sua stack:

| Sensor | Detecta | Exemplos de comando resolvido |
|---|---|---|
| `tests-passing` | `package.json` `scripts.test`, pytest, go.mod, Cargo.toml, pom.xml, gradle | `npm test`, `pytest`, `go test ./...`, `cargo test` |
| `typecheck-clean` | tsconfig/jsconfig, pyrightconfig, mypy, Cargo.toml | `npx tsc --noEmit`, `pyright`, `mypy .`, `cargo check` |
| `lint` | eslint/biome, ruff, golangci, flake8, clippy | `npx eslint .`, `ruff check .`, `golangci-lint run` |

Sensors detectados ficam `required: true`; não detectados permanecem opcionais e são pulados com motivo em runtime. Edite o arquivo para mudar comandos, timeouts ou obrigatoriedade — é a fonte única de verdade.

Também grava `.oh-my-sdd/config/runtime.json` (flags de comportamento; `autonomous_mode: false` por padrão) e garante `.oh-my-sdd/runtime/` no `.gitignore` (nunca commitado).

Sem `--yes` e em TTY, exibe a proposta e pergunta antes de gravar qualquer coisa. Re-executar com config existente é um **merge**: sensors novos detectados entram, entradas existentes nunca são removidas nem alteradas, e sensor declarado cujo backing artifact sumiu é sinalizado como stale. Em projeto sem stack detectável, grava proposta mínima (builtins opcionais + `runtime.json`) com aviso.

### `sensor run <slug>`

Roda cada sensor declarado para o slug da feature e grava evidências JSON em `.oh-my-sdd/runtime/sensors/<slug>/` (comando, exit code, duração, saída truncada, timestamp, fingerprint). Sai 1 e imprime a saída da falha se qualquer sensor `required` falhar — é o gate bloqueante que a skill `oh-my-sdd-implement` roda antes do relatório final.

### `sensor status <slug>`

Tabela read-only de evidências por sensor, incluindo se cada evidência ainda é válida contra o fingerprint atual do código. Editar arquivo rastreado após sensor passar **expira a evidência** — re-execute para renovar.

### Evidência de critérios de aceite

A skill `oh-my-sdd-implement` só pode reportar um critério de aceite como atendido com evidência: sensor passando (mapeado em `criteria` do `sensors.json`) ou nota de verificação manual em `.oh-my-sdd/runtime/sensors/<slug>/manual-checks.md`. Critérios sem nenhum dos dois são reportados como **pendente de verificação** — nunca como atendidos.

## `report`

```bash
npx oh-my-sdd report [--json]
```

Tabela de portfólio de todas as features SDD do projeto atual: slug, fase atual, progresso de tarefas (`N/M`), issue vinculada (`#n` a partir de `specs/<slug>/issue.json`, `—` caso contrário) e critérios de aceite pendentes. Prioridade de derivação de fase: session ativa em runtime > checkboxes de `tasks.md` > presença de artefatos. Com `--json`, emite array estável de `{slug, phase, tasks_done, tasks_total, pending_criteria, issue}` (`issue` é a URL ou `null`; schema documentado; breaking change = major). Read-only — em projeto sem `.oh-my-sdd/`, mensagem amigável e exit 0.

## `export`

```bash
npx oh-my-sdd export <tool>
```

Grava as regras SDD destiladas (pipeline, checkpoints bloqueantes, layout `.oh-my-sdd/`, regra de evidência) na superfície de regras de outra ferramenta de IA: `cursor` (`.cursor/rules/oh-my-sdd.mdc`), `windsurf` (`.windsurf/rules/oh-my-sdd.md`), `zed` (`.zed/rules/oh-my-sdd.md`), `codex` (seção marcada em `AGENTS.md`), `gemini` (seção marcada em `GEMINI.md`). Superfícies own-file são arquivos nossos (sobrescrita segura); superfícies de seção fazem merge idempotente entre marcadores `<!-- oh-my-sdd:start|end -->`, preservando conteúdo de terceiros. Ferramenta não suportada: lista suportadas e exit 1. Conteúdo exportado é tool-agnostic — sem precondição de cliente.

## `ecosystem`

```bash
npx oh-my-sdd ecosystem init <github | gitlab> [--yes] [--force]
```

Configura o [canal por issue](ecosystem.md): escreve o template de CI que ativa o fluxo SDD quando o agente é mencionado (ou a label `sdd:specify` aplicada) em uma issue — `.github/workflows/oh-my-sdd.yml` no GitHub (claude-code-action), `.gitlab/oh-my-sdd.gitlab-ci.yml` no GitLab (include + webhook → pipeline trigger, instruções impressas) — e `.oh-my-sdd/config/ecosystem.json` (`handle`, `labelPrefix`, `branchPrefix`, `approval`, `openDraftPR`, hashes dos templates).

Pergunta antes de escrever fora de `.oh-my-sdd/` (`--yes` pula; sem TTY e sem `--yes`, nada é gravado). Rodar de novo com template inalterado imprime "já registrado"; template editado manualmente é preservado a menos que você confirme ou passe `--force`. Templates referenciam segredos só por nome. O comando em si nunca acessa a rede. Provider não suportado: lista suportados e exit 1.
