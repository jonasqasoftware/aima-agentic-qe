import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import { analyzeDeclaredChange } from '../../../src/declared-analysis.js';
import { loadOperationPermissionPolicy } from '../../../src/permission-policy.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

async function loadAllowedPolicy() {
  return loadOperationPermissionPolicy(path.join(repoRoot, 'aima', 'policies', 'operation-permissions.json'));
}

function withOperationDenied(policy, operation) {
  return {
    ...policy,
    operations: { ...policy.operations, [operation]: 'denied' }
  };
}

async function connectedClient({ permissionPolicy } = {}) {
  const policy = permissionPolicy ?? (await loadAllowedPolicy());
  const server = createServer({ rootDir: repoRoot, permissionPolicy: policy });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'aima-mcp-test-client', version: '0.1.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

async function loadPaymentRefactorChange() {
  return JSON.parse(await readFile(path.join(repoRoot, 'examples', 'payment-refactor.change.json'), 'utf8'));
}

test('aima://frameworks lists the full framework registry without reshaping it', async () => {
  const client = await connectedClient();

  const result = await client.readResource({ uri: 'aima://frameworks' });

  assert.equal(result.contents.length, 1);
  const frameworks = JSON.parse(result.contents[0].text);
  assert.ok(Array.isArray(frameworks));
  assert.ok(frameworks.some((framework) => framework.id === 'risk-based-testing'));
  assert.ok(frameworks.some((framework) => framework.id === 'data-quality-validation'));
});

test('aima://frameworks/{id} reads a registered framework by id', async () => {
  const client = await connectedClient();

  const result = await client.readResource({ uri: 'aima://frameworks/risk-based-testing' });

  assert.equal(result.contents.length, 1);
  const framework = JSON.parse(result.contents[0].text);
  assert.equal(framework.id, 'risk-based-testing');
  assert.equal(framework.name, 'Risk-Based Testing');
});

test('aima://frameworks/{id} fails to read an unknown id instead of fabricating a resource', async () => {
  const client = await connectedClient();

  await assert.rejects(() => client.readResource({ uri: 'aima://frameworks/does-not-exist' }));
});

test('analyze_change returns exactly what the core analyzeDeclaredChange computes', async () => {
  const client = await connectedClient();
  const change = await loadPaymentRefactorChange();

  const [result, expectedReport] = await Promise.all([
    client.callTool({ name: 'analyze_change', arguments: change }),
    analyzeDeclaredChange(change)
  ]);

  assert.notEqual(result.isError, true);
  const actualReport = JSON.parse(result.content[0].text);
  assert.deepEqual(actualReport, expectedReport);
});

test('analyze_change preserves FACT, INFERENCE, and UNKNOWN entries in the evidence ledger', async () => {
  const client = await connectedClient();
  const change = await loadPaymentRefactorChange();

  const result = await client.callTool({ name: 'analyze_change', arguments: change });

  const report = JSON.parse(result.content[0].text);
  const kinds = new Set(report.evidenceLedger.map((entry) => entry.kind));
  assert.ok(kinds.has('FACT'), 'evidence ledger must preserve FACT entries');
  assert.ok(kinds.has('INFERENCE'), 'evidence ledger must preserve INFERENCE entries');
  assert.ok(kinds.has('UNKNOWN'), 'evidence ledger must preserve UNKNOWN entries');
});

test('a policy that denies read-framework-registry blocks resource reads', async () => {
  const deniedPolicy = withOperationDenied(await loadAllowedPolicy(), 'read-framework-registry');
  const client = await connectedClient({ permissionPolicy: deniedPolicy });

  await assert.rejects(() => client.readResource({ uri: 'aima://frameworks' }));
  await assert.rejects(() => client.readResource({ uri: 'aima://frameworks/risk-based-testing' }));
});

test('a policy that denies analyze-declared-change blocks the tool with isError instead of running the core', async () => {
  const deniedPolicy = withOperationDenied(await loadAllowedPolicy(), 'analyze-declared-change');
  const client = await connectedClient({ permissionPolicy: deniedPolicy });
  const change = await loadPaymentRefactorChange();

  const result = await client.callTool({ name: 'analyze_change', arguments: change });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /not permitted by policy/i);
});

test('analyze_change reports isError for a declared change missing required fields', async () => {
  const client = await connectedClient();

  const result = await client.callTool({ name: 'analyze_change', arguments: { id: 'INCOMPLETE' } });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Invalid arguments for tool analyze_change/i);
});
