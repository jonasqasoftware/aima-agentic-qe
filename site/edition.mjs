import { frameworks, lexicon } from './content.mjs';

// Declared fields (label, version, status) cannot be derived from any other
// source and must be edited by hand. Derived fields are computed here, once,
// from content.mjs — never duplicated as literals across the site. This
// version is the editorial Preview Edition version; it is intentionally
// unrelated to package.json's version and must never read from it.
export const edition = {
  label: 'Preview Edition',
  version: '0.9',
  status: 'preview',
  frameworksCount: frameworks.length,
  conceptsCount: lexicon.length,
  diagramsCount: frameworks.length
};
