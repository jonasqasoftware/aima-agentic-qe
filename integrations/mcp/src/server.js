import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadOperationPermissionPolicy } from '../../../src/permission-policy.js';
import { registerResources } from './resources.js';
import { registerTools } from './tools.js';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function createServer({ rootDir = defaultRootDir, permissionPolicy } = {}) {
  if (!permissionPolicy) {
    throw new Error('createServer requires an already-loaded permissionPolicy.');
  }
  const server = new McpServer({
    name: 'aima-agentic-qe',
    version: '0.1.0'
  });
  registerResources(server, { rootDir, permissionPolicy });
  registerTools(server, { permissionPolicy });
  return server;
}

export async function startServer({ rootDir = defaultRootDir } = {}) {
  const permissionPolicy = await loadOperationPermissionPolicy(
    path.join(rootDir, 'aima', 'policies', 'operation-permissions.json')
  );
  return createServer({ rootDir, permissionPolicy });
}
