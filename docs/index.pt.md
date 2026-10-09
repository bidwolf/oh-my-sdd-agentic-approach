# oh-my-sdd

**Spec-Driven Development, aplicado por um orquestrador global + 6 skills do Claude Code.**

O `oh-my-sdd` instala um conjunto de skills do [Claude Code](https://claude.com/claude-code) que tornam o **Spec-Driven Development (SDD)** a forma padrão de trabalhar. Antes de qualquer linha de código de implementação ser escrita, o Claude analisa seu projeto, gera um `constitution.md`, depois um `spec.md`, um `plan.md` e um `tasks.md` — parando duas vezes para sua aprovação explícita antes de tocar no seu código.

## Instale com um comando

```bash
npx oh-my-sdd install
```

Isso instala 7 skills globalmente em `~/.claude/skills/`, disponíveis em todo projeto que você abrir no Claude Code — sem necessidade de configuração por projeto.

## Por que oh-my-sdd

<div class="grid cards" markdown>

-   :material-sitemap: **Fases orquestradas**

    ---

    Uma skill orquestradora (`oh-my-sdd`) ativa 5 skills especializadas em sequência — constitution, specify, plan, tasks, implement — cada uma responsável por exatamente um artefato.

-   :material-magnify-scan: **Constitution a partir do código real**

    ---

    A `oh-my-sdd-constitution` lê seu `package.json`, configs de lint e padrões de código já existentes para inferir sua stack e convenções — só pergunta o que não conseguir inferir.

-   :material-hand-back-right: **Dois checkpoints humanos**

    ---

    Nenhuma implementação começa até você validar explicitamente o `spec.md`, e novamente até você aprovar o `plan.md` + `tasks.md`.

-   :material-book-open-variant: **Base de conhecimento autocontida**

    ---

    Cada skill instalada traz sua própria cópia da base de conhecimento sobre SDD — níveis de maturidade, sintaxe EARS/GEARS, hierarquia de artefatos, exemplos práticos.

</div>

## Como é usar

```
/oh-my-sdd "adicionar endpoint de logout que invalida o refresh token"
/oh-my-sdd PROJ-123
/oh-my-sdd https://empresa.atlassian.net/browse/PROJ-123
```

O Claude então percorre [constitution → specify → plan → tasks → implement](architecture/overview.md), pausando para sua validação ao longo do caminho.

## Antes de instalar

O `oh-my-sdd` só escreve em `~/.claude/skills/` (as próprias skills) e em `.oh-my-sdd/` dentro do projeto em que você está trabalhando (specs e constitution). Ele nunca toca no seu `~/.claude/CLAUDE.md` global, e tudo que ele instala pode ser removido com um único comando. Veja [Segurança e Dados](safety.md) para o panorama completo.

[Comece agora :material-arrow-right:](getting-started/installation.md){ .md-button .md-button--primary }
[Ver no GitHub :material-github:](https://github.com/slpascoal/oh-my-sdd){ .md-button }
