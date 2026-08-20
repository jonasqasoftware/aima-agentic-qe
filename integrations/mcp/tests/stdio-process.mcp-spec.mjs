import { test } from 'node:test';
import assert from 'node:assert/strict';
// child_process is permitted here only: this file validates the real stdio
// subprocess contract (stdout purity, stderr, exit code), which cannot be
// exercised through the in-memory transport used by the other MCP tests.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binPath = path.join(packageRoot, 'bin', 'aima-mcp-stdio.js');

function initializeRequest() {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'stdio-guardrail-test', version: '0.1.0' }
    }
  };
}

test('the real stdio subprocess writes only newline-delimited JSON-RPC to stdout, never raw console output', async () => {
  const child = spawn(process.execPath, [binPath], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });

  try {
    child.stdin.write(`${JSON.stringify(initializeRequest())}\n`);
    const [firstChunk] = await once(child.stdout, 'data');
    stdout += firstChunk.toString('utf8');

    const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
    assert.ok(lines.length > 0, 'expected at least one JSON-RPC line on stdout');
    for (const line of lines) {
      const parsed = JSON.parse(line);
      assert.equal(parsed.jsonrpc, '2.0');
    }
    assert.equal(stderr, '');
  } finally {
    child.kill();
  }
});

test('a fatal startup error is reported on stderr with a non-zero exit code, never fabricated on stdout', async () => {
  const child = spawn(process.execPath, [binPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      AIMA_MCP_ROOT_DIR: path.join(packageRoot, 'this-directory-does-not-exist')
    }
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });

  const [code] = await once(child, 'exit');

  assert.notEqual(code, 0);
  assert.equal(stdout, '');
  assert.ok(stderr.trim().length > 0, 'expected the fatal startup error on stderr');
});
