import { z } from 'zod';
import { analyzeDeclaredChange } from '../../../src/declared-analysis.js';
import { assertOperationPermitted } from '../../../src/permission-policy.js';

const declaredEvidenceSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  summary: z.string().min(1),
  source: z.string().min(1).optional()
});

const changeInputShape = {
  id: z.string().min(1),
  summary: z.string().min(1),
  changedFiles: z.array(z.string()).min(1),
  businessImpact: z.enum(['low', 'medium', 'high']),
  technicalComplexity: z.enum(['low', 'medium', 'high']),
  knownUnknowns: z.array(z.string()).optional(),
  declaredEvidence: z.array(declaredEvidenceSchema).optional()
};

export function registerTools(server, { permissionPolicy }) {
  server.registerTool(
    'analyze_change',
    {
      title: 'Analisar mudança declarada',
      description: 'Executa o motor determinístico do AIMA sobre uma mudança declarada (JSON) e retorna riscos, estratégia, evidências ausentes e recomendação de release. Não lê conteúdo de diff, não usa LLM e não escreve arquivos.',
      inputSchema: changeInputShape
    },
    async (args) => {
      assertOperationPermitted(permissionPolicy, 'analyze-declared-change');
      const report = await analyzeDeclaredChange(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
      };
    }
  );
}
