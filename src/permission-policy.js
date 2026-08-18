import { readFile } from 'node:fs/promises';

const DECISIONS = new Set(['allowed', 'allowed-with-user-action', 'requires-human-authorization', 'denied']);

export async function loadOperationPermissionPolicy(file) {
  const policy = JSON.parse(await readFile(file, 'utf8'));
  if (!policy.id || !policy.name || !policy.version || !policy.operations || Array.isArray(policy.operations)) {
    throw new Error('Operation permission policy requires id, name, version, and an operations object.');
  }
  for (const [operation, decision] of Object.entries(policy.operations)) {
    if (!operation || !DECISIONS.has(decision)) throw new Error(`Invalid permission decision for operation ${operation}.`);
  }
  return policy;
}

export function permissionForOperation(policy, operation) {
  return policy.operations[operation] ?? 'denied';
}

export function assertOperationPermitted(policy, operation, { userAction = false, humanAuthorization = false } = {}) {
  const decision = permissionForOperation(policy, operation);
  if (decision === 'allowed') return decision;
  if (decision === 'allowed-with-user-action' && userAction) return decision;
  if (decision === 'requires-human-authorization' && humanAuthorization) return decision;
  throw new Error(`Operation ${operation} is not permitted by policy (${decision}).`);
}
