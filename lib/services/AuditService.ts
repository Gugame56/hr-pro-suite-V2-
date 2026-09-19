// =============================================================================
// AuditService — แปลงจาก audit.ts
// Append audit records to AuditLogs sheet (never throws)
// =============================================================================

import { BaseRepository } from '../repositories/BaseRepository';
import type { AuditLog } from '../models';

const AUDIT_SHEET = 'AuditLogs';
const AUDIT_HEADERS = ['timestamp', 'actor', 'action', 'entity', 'entityId', 'changes'];

export interface AuditEntry {
  actor?: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: unknown;
}

export class AuditService {
  private static instance: AuditService;
  private readonly repository: BaseRepository<AuditLog>;

  private constructor() {
    this.repository = new BaseRepository<AuditLog>(AUDIT_SHEET);
  }

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /** Append an audit record. Never throws — auditing must not break the operation. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.repository.ensureHeaders(AUDIT_HEADERS);
      await this.repository.add({
        timestamp: new Date().toISOString().replace('T', 'T').slice(0, 19),
        actor: entry.actor || 'system',
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || '',
        changes: entry.changes === undefined ? '' : JSON.stringify(entry.changes),
      });
    } catch (error) {
      console.error('Audit log failed (non-fatal):', error);
    }
  }
}

// Backward-compatible export
export async function logAudit(entry: AuditEntry): Promise<void> {
  return AuditService.getInstance().log(entry);
}
