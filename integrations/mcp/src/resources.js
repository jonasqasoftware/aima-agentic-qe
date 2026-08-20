import path from 'node:path';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadFrameworkRegistry, getFrameworkById } from '../../../src/framework-registry.js';
import { assertOperationPermitted } from '../../../src/permission-policy.js';

export function registerResources(server, { rootDir, permissionPolicy }) {
  const frameworksDirectory = path.join(rootDir, 'aima', 'frameworks');

  server.registerResource(
    'aima-frameworks',
    'aima://frameworks',
    {
      title: 'Frameworks AIMA',
      description: 'Registry completo de frameworks AIMA, sem reshape (dados estruturados em aima/frameworks).',
      mimeType: 'application/json'
    },
    async (uri) => {
      assertOperationPermitted(permissionPolicy, 'read-framework-registry');
      const frameworks = await loadFrameworkRegistry(frameworksDirectory);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(frameworks, null, 2)
          }
        ]
      };
    }
  );

  server.registerResource(
    'aima-framework',
    new ResourceTemplate('aima://frameworks/{id}', { list: undefined }),
    {
      title: 'Framework AIMA',
      description: 'Definição declarada de um framework AIMA por id (dados estruturados em aima/frameworks, sem lógica de negócio duplicada).',
      mimeType: 'application/json'
    },
    async (uri, variables) => {
      assertOperationPermitted(permissionPolicy, 'read-framework-registry');
      const frameworks = await loadFrameworkRegistry(frameworksDirectory);
      const framework = getFrameworkById(frameworks, variables.id);
      if (!framework) {
        throw new Error(`Framework "${variables.id}" não está registrado em aima/frameworks.`);
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(framework, null, 2)
          }
        ]
      };
    }
  );
}
