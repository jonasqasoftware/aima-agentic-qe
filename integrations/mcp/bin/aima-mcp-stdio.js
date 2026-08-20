#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startServer } from '../src/server.js';

async function main() {
  const rootDir = process.env.AIMA_MCP_ROOT_DIR;
  const server = await startServer(rootDir ? { rootDir } : {});
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  process.exitCode = 1;
});
