const RECOMMENDATIONS = new Set(['GO', 'GO WITH RISKS', 'NO-GO']);
const REQUIRED_FIELDS = [
  'id',
  'name',
  'version',
  'blockOnAnyUnknown',
  'blockOnHighRiskWithUnknown',
  'recommendationWhenHighRisk',
  'recommendationWhenNoHighRisk'
];

export function validateReleasePolicy(policy) {
  for (const field of REQUIRED_FIELDS) {
    if (policy[field] === undefined || policy[field] === '') throw new Error(`Release policy is missing required field ${field}.`);
  }
  if (typeof policy.blockOnAnyUnknown !== 'boolean' || typeof policy.blockOnHighRiskWithUnknown !== 'boolean') {
    throw new Error('Release policy blocking rules must be boolean.');
  }
  for (const field of ['recommendationWhenHighRisk', 'recommendationWhenNoHighRisk']) {
    if (!RECOMMENDATIONS.has(policy[field])) throw new Error(`${field} must be GO, GO WITH RISKS, or NO-GO.`);
  }
}
