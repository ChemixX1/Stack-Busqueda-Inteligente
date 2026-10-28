import type { Audit } from './types';

export const CONTACT_SCAN_VERSION = 2;

export function canReuseAudit(site: Audit, now = Date.now()): boolean {
  const age = now - Date.parse(site.checkedAt);
  return site.status === 'active'
    && site.contactScanVersion === CONTACT_SCAN_VERSION
    && site.metrics.wordCount !== undefined
    && age >= 0 && age < 86_400_000;
}
