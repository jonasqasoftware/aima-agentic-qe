export function getFrameworkById(frameworks, id) {
  return frameworks.find((framework) => framework.id === id);
}

export function selectFramework(frameworks, change) {
  const hasDataSurface = change.changedFiles.some((file) => /migration|schema|database|data/i.test(file));
  const frameworkId = hasDataSurface ? 'data-quality-validation' : 'risk-based-testing';
  const selected = frameworks.find((framework) => framework.id === frameworkId);
  if (!selected) throw new Error(`${frameworkId} framework is not registered.`);
  return {
    framework: selected,
    evidence: [
      `Impacto de negócio declarado como ${change.businessImpact}.`,
      `Complexidade técnica declarada como ${change.technicalComplexity}.`,
      `${change.changedFiles.length} arquivo(s) declarado(s) como alterado(s).`,
      hasDataSurface
        ? 'A superfície declarada contém sinal de dados, schema ou migração.'
        : 'A superfície declarada não contém sinal de dados, schema ou migração.'
    ]
  };
}
