#!/usr/bin/env node
/**
 * a11y-check.mjs
 *
 * Roda axe-core via Playwright (Chromium) contra cada rota da landing pública.
 * Falha (exit 1) se houver qualquer violação com impact "serious" ou "critical".
 *
 * Pré-requisitos:
 *  - servidor estático rodando em http://localhost:3000 (use `npm run serve`)
 *  - dependências instaladas: @playwright/test, @axe-core/playwright
 *
 * Uso: node scripts/a11y-check.mjs
 */

import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = process.env.A11Y_BASE_URL || 'http://localhost:3000';

const ROUTES = [
  '/',
  '/privacidade',
  '/termos',
  '/obrigado',
  '/404',
  '/admin/login',
];

const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

function colorize(str, code) {
  if (process.env.NO_COLOR) return str;
  return `[${code}m${str}[0m`;
}
const red = (s) => colorize(s, '31');
const green = (s) => colorize(s, '32');
const yellow = (s) => colorize(s, '33');
const bold = (s) => colorize(s, '1');

async function auditRoute(page, route) {
  const url = `${BASE_URL}${route}`;
  process.stdout.write(`\n${bold('→')} Auditando ${url}\n`);

  // Para 404 testamos rota inexistente; aqui pedimos /404 literal que existe como arquivo.
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  if (!response || !response.ok()) {
    console.warn(yellow(`  [warn] HTTP ${response ? response.status() : '???'} em ${url}`));
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();

  const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact));
  const advisory = results.violations.filter((v) => !BLOCKING_IMPACTS.has(v.impact));

  if (blocking.length === 0 && advisory.length === 0) {
    console.log(green(`  ✓ sem violações`));
  } else {
    if (blocking.length > 0) {
      console.log(red(`  ✗ ${blocking.length} violação(ões) bloqueante(s)`));
      for (const v of blocking) {
        console.log(red(`    - [${v.impact}] ${v.id}: ${v.help}`));
        console.log(`      ${v.helpUrl}`);
        for (const node of v.nodes.slice(0, 3)) {
          const target = Array.isArray(node.target) ? node.target.join(' ') : String(node.target);
          console.log(`      · ${target}`);
        }
        if (v.nodes.length > 3) {
          console.log(`      · (+${v.nodes.length - 3} ocorrência(s))`);
        }
      }
    }
    if (advisory.length > 0) {
      console.log(yellow(`  ! ${advisory.length} violação(ões) informativa(s) (não bloqueante)`));
      for (const v of advisory) {
        console.log(yellow(`    - [${v.impact || 'minor'}] ${v.id}: ${v.help}`));
      }
    }
  }

  return { route, url, blocking, advisory };
}

async function main() {
  console.log(bold(`axe-core a11y check — base: ${BASE_URL}`));
  console.log(`Rotas: ${ROUTES.join(', ')}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const summary = [];
  try {
    for (const route of ROUTES) {
      // eslint-disable-next-line no-await-in-loop
      const result = await auditRoute(page, route);
      summary.push(result);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  // Resumo final
  console.log(`\n${bold('=== Resumo ===')}`);
  let totalBlocking = 0;
  let totalAdvisory = 0;
  for (const r of summary) {
    totalBlocking += r.blocking.length;
    totalAdvisory += r.advisory.length;
    const status = r.blocking.length === 0 ? green('OK') : red('FAIL');
    console.log(`  ${status}  ${r.route.padEnd(16)} bloqueantes=${r.blocking.length} informativas=${r.advisory.length}`);
  }
  console.log(`\nTotal: ${totalBlocking} bloqueante(s) · ${totalAdvisory} informativa(s)`);

  if (totalBlocking > 0) {
    console.error(red(`\nFalhou: ${totalBlocking} violação(ões) serious/critical encontrada(s).`));
    process.exit(1);
  }
  console.log(green(`\nTudo certo: zero violação serious/critical.`));
}

main().catch((err) => {
  console.error(red('Erro inesperado no a11y-check:'));
  console.error(err);
  process.exit(2);
});
