import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { hashFile } from '../installer/manifest.js';

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'ecosystem');
const CONFIG_REL = join('.oh-my-sdd', 'config', 'ecosystem.json');

const PROVIDERS = {
  github: { template: 'github-workflow.yml', target: join('.github', 'workflows', 'oh-my-sdd.yml') },
  gitlab: { template: 'gitlab-ci.yml', target: join('.gitlab', 'oh-my-sdd.gitlab-ci.yml') },
};

const DEFAULTS = {
  handle: '@claude',
  labelPrefix: 'sdd:',
  branchPrefix: 'oh-my-sdd',
  approval: 'write',
  openDraftPR: true,
};

export default async function ecosystem(args = []) {
  const [sub, provider] = args;
  if (sub === 'init') return init(provider, args.includes('--yes'), args.includes('--force'));
  usage();
}

function usage() {
  console.log(chalk.bold('\n  oh-my-sdd ecosystem\n'));
  console.log('  Uso: npx oh-my-sdd ecosystem init <github | gitlab> [--yes] [--force]');
  console.log('  init     escreve o template de CI que aciona o fluxo SDD por menção/label em issues');
  console.log('           e grava .oh-my-sdd/config/ecosystem.json (handle, labels, branch, aprovação)');
  console.log('  --yes    não pergunta antes de escrever fora de .oh-my-sdd/');
  console.log('  --force  sobrescreve um template modificado manualmente\n');
}

function readConfig(cwd) {
  const p = join(cwd, CONFIG_REL);
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; }
}

function render(template, config) {
  return template
    .replaceAll('{{handle}}', config.handle)
    .replaceAll('{{labelPrefix}}', config.labelPrefix)
    .replaceAll('{{branchPrefix}}', config.branchPrefix);
}

async function confirm(message) {
  if (!process.stdin.isTTY) return false;
  const { default: inquirer } = await import('inquirer');
  const { proceed } = await inquirer.prompt([{ prefix: '', type: 'confirm', name: 'proceed', default: true, message }]);
  return proceed;
}

async function init(provider, yes, force) {
  const surface = PROVIDERS[provider];
  if (!surface) {
    console.error(chalk.red(`\n  Provider ${provider ? `"${provider}"` : 'não informado'}. Suportados: ${Object.keys(PROVIDERS).join(', ')}\n`));
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const config = { ...DEFAULTS, ...readConfig(cwd), provider };
  config.templates = config.templates || {};
  const targetRel = surface.target.split('\\').join('/');
  const target = join(cwd, surface.target);
  const content = render(readFileSync(join(TEMPLATES_DIR, surface.template), 'utf8'), config);

  console.log(chalk.bold(`\n  oh-my-sdd ecosystem — ${provider}\n`));

  let writeTemplate = true;
  if (existsSync(target)) {
    const current = readFileSync(target, 'utf8');
    const ours = hashFile(target) === config.templates[targetRel];
    if (ours && current === content) {
      console.log(`  ${chalk.dim('·')} ${targetRel}: já registrado`);
      writeTemplate = false;
    } else if (!ours && !force) {
      console.log(chalk.yellow(`  ${targetRel} existe e foi modificado manualmente (ou não foi gerado pelo oh-my-sdd).`));
      const proceed = await confirm(`Sobrescrever ${targetRel} com o template atual?`);
      if (!proceed) {
        console.log(chalk.gray('  Template preservado — rode com --force para sobrescrever.\n'));
        writeTemplate = false;
      }
    }
  } else if (!yes) {
    const proceed = await confirm(`Escrever ${targetRel} (fora de .oh-my-sdd/)?`);
    if (!proceed) {
      console.log(chalk.cyan('\n  Nada gravado. Rode com --yes para escrever sem perguntar.\n'));
      return;
    }
  }

  if (writeTemplate) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    console.log(`  ${chalk.green('✔')} ${targetRel}: gravado`);
  }
  config.templates[targetRel] = hashFile(target);

  const configPath = join(cwd, CONFIG_REL);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`  ${chalk.green('✔')} ${CONFIG_REL.split('\\').join('/')}: handle ${config.handle}, labels ${config.labelPrefix}*, branch ${config.branchPrefix}/<slug>, aprovação "${config.approval}"`);

  console.log(chalk.bold('\n  Próximos passos:'));
  if (provider === 'github') {
    console.log('  1. Secret ANTHROPIC_API_KEY (ou CLAUDE_CODE_OAUTH_TOKEN) em Settings → Secrets and variables → Actions.');
    console.log(`  2. Mencione ${config.handle} em uma issue, ou aplique a label ${config.labelPrefix}specify.`);
  } else {
    console.log('  1. Inclua o arquivo no .gitlab-ci.yml:  include: [{ local: .gitlab/oh-my-sdd.gitlab-ci.yml }]');
    console.log('  2. Settings → CI/CD → Pipeline trigger tokens: crie um token.');
    console.log('  3. Settings → Webhooks (Comments + Issues events) com a URL:');
    console.log(chalk.cyan('     https://<host>/api/v4/projects/<project-id>/ref/<default-branch>/trigger/pipeline?token=<trigger-token>'));
    console.log('  4. Variables (masked): ANTHROPIC_API_KEY e SDD_GITLAB_TOKEN (project access token, api + write_repository).');
    console.log(`  5. Mencione ${config.handle} em uma issue, ou aplique a label ${config.labelPrefix}specify.`);
  }
  console.log(chalk.dim('\n  Segredos nunca são gravados: o template referencia apenas os nomes.\n'));
}
