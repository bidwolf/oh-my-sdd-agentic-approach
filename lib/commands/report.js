import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

export default async function report(args = []) {
  const json = args.includes('--json');
  const cwd = process.cwd();
  const specsDir = join(cwd, '.oh-my-sdd', 'specs');
  if (!existsSync(specsDir)) {
    const msg = 'Nenhum SDD neste projeto (pasta .oh-my-sdd/ não encontrada).';
    if (json) console.log(JSON.stringify([]));
    else console.log(chalk.yellow(`\n  ${msg}\n`));
    return;
  }

  const rows = readdirSync(specsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => inspectSlug(join(specsDir, e.name), e.name, cwd));

  if (json) {
    console.log(JSON.stringify(rows.map(({ slug, phase, tasks_done, tasks_total, pending_criteria, issue }) =>
      ({ slug, phase, tasks_done, tasks_total, pending_criteria, issue })), null, 2));
    return;
  }

  console.log(chalk.bold('\n  Features SDD neste projeto:\n'));
  console.log(`  ${pad('SLUG', 30)}${pad('FASE', 11)}${pad('TAREFAS', 9)}${pad('ISSUE', 8)}PENDÊNCIAS`);
  for (const r of rows) {
    const phaseColor = r.phase === 'done' ? chalk.green : r.phase === 'implement' ? chalk.cyan : chalk.yellow;
    const pend = r.pending_criteria.length ? chalk.red(`${r.pending_criteria.length} critério(s)`) : chalk.green('—');
    const issue = r.issue ? `#${r.issue.split('/').pop()}` : '—';
    console.log(`  ${pad(r.slug, 30)}${phaseColor(pad(r.phase, 11))}${pad(`${r.tasks_done}/${r.tasks_total}`, 9)}${pad(issue, 8)}${pend}`);
  }
  console.log(chalk.dim(`\n  Evidências: .oh-my-sdd/runtime/sensors/<slug>/ · estado fino: runtime/sessions/\n`));
}

function pad(s, n) {
  return s.length >= n ? `${s.slice(0, n - 1)}… ` : s + ' '.repeat(n - s.length);
}

function inspectSlug(dir, slug, cwd) {
  const has = (f) => existsSync(join(dir, f));
  const spec = has('spec.md');
  const plan = has('plan.md');
  const tasksFile = join(dir, 'tasks.md');
  const tasks = has('tasks.md') ? readFileSync(tasksFile, 'utf8') : null;
  const checks = tasks ? (tasks.match(/^\s*- \[x\]/gm) || []) : [];
  const pending = tasks ? (tasks.match(/^\s*- \[ \]/gm) || []) : [];

  // Phase derivation priority: active session > checkboxes > artifacts
  let phase = spec ? (plan ? (tasks ? 'tasks' : 'plan') : 'specify') : 'specify';
  if (tasks) phase = pending.length ? 'tasks' : 'done';
  const session = readSession(slug, cwd);
  if (session && session.status !== 'done') phase = 'implement';

  const total = checks.length + pending.length;
  const pendingCriteria = pendingCriteriaFor(spec, slug, cwd);
  return { slug, phase, tasks_done: checks.length, tasks_total: total, pending_criteria: pendingCriteria, issue: readIssueLink(dir) };
}

function readIssueLink(dir) {
  const p = join(dir, 'issue.json');
  if (!existsSync(p)) return null;
  try {
    const link = JSON.parse(readFileSync(p, 'utf8'));
    return typeof link.url === 'string' ? link.url : null;
  } catch { return null; }
}

function readSession(slug, cwd) {
  const p = join(cwd, '.oh-my-sdd', 'runtime', 'sessions', `${slug}.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function pendingCriteriaFor(hasSpec, slug, cwd) {
  if (!hasSpec) return [];
  const specPath = join(cwd, '.oh-my-sdd', 'specs', slug, 'spec.md');
  const spec = readFileSync(specPath, 'utf8');
  const section = spec.split(/^##\s+/m).find((s) => /^(\d+\.\s*)?Critérios de Aceite/.test(s));
  if (!section) return [];
  const items = (section.match(/^\s*- \[ \] (.+)$/gm) || [])
    .map((l) => l.replace(/^\s*- \[ \] /, '').trim())
    .filter((l) => !/README|docs|mkdocs/i.test(l)); // doc checklist não é critério de produto
  if (!items.length) return [];
  const sensorsDir = join(cwd, '.oh-my-sdd', 'runtime', 'sensors', slug);
  if (!existsSync(sensorsDir)) return items;
  const files = readdirSync(sensorsDir);
  const hasEvidence = files.some((f) => f.endsWith('.json'));
  const manual = files.includes('manual-checks.md')
    ? readFileSync(join(sensorsDir, 'manual-checks.md'), 'utf8') : '';
  const proven = (hasEvidence || /\[x\]/.test(manual));
  return proven ? [] : items;
}
