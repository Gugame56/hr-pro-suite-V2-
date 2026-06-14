import { NextResponse } from 'next/server';
import { getRows, addRow, updateRow, deleteRow } from './sheetManager';
import { logAudit } from './audit';

const ID_KEY = 'id';

interface CrudOptions {
  /** Default values merged into every created row (e.g. { status: 'Pending' }). */
  defaults?: Record<string, unknown>;
  /** Record create/update/delete to AuditLogs (default true). */
  audit?: boolean;
}

/**
 * Build a standard set of Next.js route handlers for a Google-Sheet-backed
 * resource. Keeps the many CRUD routes identical and audited by default.
 *
 *   export const { GET, POST, PATCH, DELETE } = makeCrud('Departments');
 *
 * GET supports `?employeeId=` filtering when the rows carry an employeeId column.
 * The actor for audit logging is read from the `x-actor` request header.
 */
export function makeCrud(sheetName: string, options: CrudOptions = {}) {
  const { defaults = {}, audit = true } = options;
  const actorOf = (req: Request) => req.headers.get('x-actor') || 'system';

  async function GET(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const employeeId = searchParams.get('employeeId');
      const id = searchParams.get('id');

      const rows = (await getRows(sheetName)).map(stripInternal);

      if (id) return NextResponse.json(rows.find(r => r.id?.toString() === id) ?? null);
      if (employeeId) return NextResponse.json(rows.filter(r => r.employeeId === employeeId));
      return NextResponse.json(rows);
    } catch (error) {
      console.error(`API Error (GET ${sheetName}):`, error);
      return NextResponse.json({ error: `Failed to fetch ${sheetName}` }, { status: 500 });
    }
  }

  async function POST(request: Request) {
    try {
      const body = await request.json();
      const data = { ...defaults, ...body };
      await addRow(sheetName, data);
      if (audit) await logAudit({ actor: actorOf(request), action: 'CREATE', entity: sheetName, entityId: data.id, changes: data });
      return NextResponse.json({ message: `${sheetName} created successfully` });
    } catch (error) {
      console.error(`API Error (POST ${sheetName}):`, error);
      return NextResponse.json({ error: `Failed to create ${sheetName}` }, { status: 500 });
    }
  }

  async function PATCH(request: Request) {
    try {
      const body = await request.json();
      const { id, ...updatedData } = body;
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

      await updateRow(sheetName, ID_KEY, id, updatedData);
      if (audit) await logAudit({ actor: actorOf(request), action: 'UPDATE', entity: sheetName, entityId: id, changes: updatedData });
      return NextResponse.json({ message: `${sheetName} updated successfully` });
    } catch (error) {
      console.error(`API Error (PATCH ${sheetName}):`, error);
      return NextResponse.json({ error: `Failed to update ${sheetName}` }, { status: 500 });
    }
  }

  async function DELETE(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

      await deleteRow(sheetName, ID_KEY, id);
      if (audit) await logAudit({ actor: actorOf(request), action: 'DELETE', entity: sheetName, entityId: id });
      return NextResponse.json({ message: `${sheetName} deleted successfully` });
    } catch (error) {
      console.error(`API Error (DELETE ${sheetName}):`, error);
      return NextResponse.json({ error: `Failed to delete ${sheetName}` }, { status: 500 });
    }
  }

  return { GET, POST, PATCH, DELETE };
}

/** Drop the internal `_row` bookkeeping field before returning rows to clients. */
function stripInternal<T extends Record<string, any>>(row: T): T {
  const { _row, ...rest } = row;
  return rest as T;
}
