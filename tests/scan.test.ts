import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import type { Audit } from '../lib/types';

const fixture: Audit = {
  id: 'fixture', url: 'https://example.com/', domain: 'example.com', name: 'Ejemplo de prueba',
  description: 'Datos de prueba local.', country: 'PE', category: 'Otros', status: 'active',
  score: 0, issues: [], contacts: [], aiEvidence: { detected: false, label: 'Sin evidencia', evidence: [] },
  metrics: { responseMs: 100, htmlBytes: 1000, viewport: true, title: true, h1: 1, imageAltMissing: 0, performance: null, accessibility: null },
  checkedAt: '2026-01-01T00:00:00Z', source: 'https://example.com/', limitations: [],
};

async function run(args: string[]) {
  return new Promise<{ code: number | null; output: string }>((resolveResult, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/scan.ts', ...args], { cwd: process.cwd(), env: process.env });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('close', code => resolveResult({ code, output }));
  });
}

async function close(server: Server) {
  await new Promise<void>((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
}

async function cleanup(directory: string) {
  const root = resolve(tmpdir());
  const target = resolve(directory);
  const within = relative(root, target);
  assert.ok(within && !within.startsWith('..') && !isAbsolute(within) && within.startsWith('stack-cli-test-'));
  await rm(target, { recursive: true, force: true });
}

test('CLI rechaza fuentes incompatibles y países fuera del catálogo', async () => {
  const incompatible = await run(['--query', 'restaurantes', '--urls', 'https://example.com']);
  assert.equal(incompatible.code, 1);
  assert.match(incompatible.output, /no ambas/);
  const invalid = await run(['--query', 'restaurantes', '--country', 'ZZ']);
  assert.equal(invalid.code, 1);
  assert.match(invalid.output, /País no admitido/);
});

test('CLI conserva resultados exitosos y exporta errores parciales', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stack-cli-test-'));
  const output = join(directory, 'resultados.json');
  const seen: { path: string; body: Record<string, unknown> }[] = [];
  const server = createServer(async (request, response) => {
    let body = ''; for await (const chunk of request) body += chunk;
    const data = JSON.parse(body || '{}') as Record<string, unknown>;
    seen.push({ path: request.url || '', body: data });
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/search') return response.end(JSON.stringify({
      results: [{ url: 'https://example.com/' }, { url: 'https://example.org/' }], provider: 'Fixture local', query: data.query,
    }));
    if (data.url === 'https://example.org/') {
      response.statusCode = 503;
      return response.end(JSON.stringify({ error: 'Fallo controlado de prueba' }));
    }
    response.end(JSON.stringify(fixture));
  });
  try {
    await new Promise<void>(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
    const address = server.address(); assert.ok(address && typeof address === 'object');
    const result = await run(['--query', 'restaurantes', '--country', 'PE', '--rounds', '1', '--out', output, '--page-speed', '--base-url', `http://127.0.0.1:${address.port}`]);
    assert.equal(result.code, 1);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), [fixture]);
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'resultados.errors.json'), 'utf8')), [{ url: 'https://example.org/', error: 'Fallo controlado de prueba' }]);
    assert.equal(seen[0].body.country, 'PE');
    assert.equal(seen[1].body.usePageSpeed, true);
    assert.equal(seen.length, 3);
  } finally {
    if (server.listening) await close(server);
    await cleanup(directory);
  }
});

test('CLI descubre sin URLs ni consulta y elimina dominios repetidos entre tandas', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stack-cli-test-'));
  const output = join(directory, 'automatico.json');
  const searches: Record<string, unknown>[] = [];
  const audits: string[] = [];
  const server = createServer(async (request, response) => {
    let body = ''; for await (const chunk of request) body += chunk;
    const data = JSON.parse(body || '{}') as Record<string, unknown>;
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/search') {
      searches.push(data);
      return response.end(JSON.stringify({ results: data.offset === 0
        ? [{ url: 'https://example.com/' }, { url: 'https://www.example.com/contacto' }]
        : [{ url: 'https://example.com/otra' }, { url: 'https://example.org/' }], provider: 'Fixture local', query: '' }));
    }
    audits.push(String(data.url));
    response.end(JSON.stringify({ ...fixture, id: `fixture-${audits.length}`, url: data.url }));
  });
  try {
    await new Promise<void>(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
    const address = server.address(); assert.ok(address && typeof address === 'object');
    const result = await run(['--rounds', '2', '--out', output, '--base-url', `http://127.0.0.1:${address.port}`]);
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(searches.map(s => s.offset), [0, 1]);
    assert.equal(searches[0].country, 'PE');
    assert.equal(searches[0].query, '');
    assert.deepEqual(audits, ['https://example.com/', 'https://example.org/']);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).length, 2);
  } finally {
    if (server.listening) await close(server);
    await cleanup(directory);
  }
});

test('CLI valida las tandas antes de conectar a la red', async () => {
  for (const rounds of ['0', '11', '1.5', 'no']) {
    const result = await run(['--rounds', rounds]);
    assert.equal(result.code, 1);
    assert.match(result.output, /--rounds debe/);
  }
});

test('CLI respeta Retry-After y deduplica negocios tras una redirección', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stack-cli-test-'));
  const output = join(directory, 'redirecciones.json');
  let requests = 0;
  const server = createServer(async (request, response) => {
    for await (const _chunk of request) { /* consume request */ }
    response.setHeader('Content-Type', 'application/json');
    requests++;
    if (requests === 1) {
      response.writeHead(429, { 'Retry-After': '1' });
      return response.end(JSON.stringify({ error: 'Límite temporal' }));
    }
    response.end(JSON.stringify(fixture));
  });
  try {
    await new Promise<void>(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
    const address = server.address(); assert.ok(address && typeof address === 'object');
    const result = await run(['--urls', 'https://example.com/,https://example.org/', '--out', output, '--base-url', `http://127.0.0.1:${address.port}`]);
    assert.equal(result.code, 0, result.output);
    assert.equal(requests, 3);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), [fixture]);
  } finally {
    if (server.listening) await close(server);
    await cleanup(directory);
  }
});

test('CLI no sobrescribe un archivo de resultados existente', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stack-cli-test-'));
  const output = join(directory, 'conservar.json');
  await writeFile(output, 'contenido anterior', 'utf8');
  const server = createServer(async (request, response) => {
    for await (const _chunk of request) { /* consumir solicitud */ }
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(fixture));
  });
  try {
    await new Promise<void>(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
    const address = server.address(); assert.ok(address && typeof address === 'object');
    const result = await run(['--urls', 'https://example.com/', '--out', output, '--base-url', `http://127.0.0.1:${address.port}`]);
    assert.equal(result.code, 1);
    assert.equal(await readFile(output, 'utf8'), 'contenido anterior');
    assert.match(result.output, /EEXIST/);
  } finally {
    if (server.listening) await close(server);
    await cleanup(directory);
  }
});
