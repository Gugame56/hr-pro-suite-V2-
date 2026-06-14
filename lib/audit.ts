import { addRow, ensureHeaders } from './sheetManager';
import { toISOTimestamp } from './dateUtils';

const AUDIT_SHEET = 'AuditLogs';
const AUDIT_HEADERS = ['timestamp', 'actor', 'action', 'entity', 'entityId', 'changes'];

export interface AuditEntry {
  actor?: string;        // who did it (email / id); 'system' if unknown
  action: string;        // CREATE | UPDATE | DELETE | LOGIN | ...
  entity: string;        // sheet / resource name
  entityId?: string;     // affected row id
  changes?: unknown;     // payload / diff (serialized to JSON)
}

/**
 * Append an audit record. Never throws — auditing must not break the operation
 * it is recording. Failures are logged to the server console only.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    // Create the AuditLogs sheet/headers on first use so logging never fails
    // just because the tab hasn't been set up yet.
    await ensureHeaders(AUDIT_SHEET, AUDIT_HEADERS);
    await addRow(AUDIT_SHEET, {
      timestamp: toISOTimestamp(),
      actor: entry.actor || 'system',
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId || '',
      changes:
        entry.changes === undefined ? '' : JSON.stringify(entry.changes),
    });
  } catch (error) {
    console.error('Audit log failed (non-fatal):', error);
  }
}
