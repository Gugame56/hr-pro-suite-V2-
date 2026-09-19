import { LeaveTypesController } from '@/lib/controllers/LeaveTypesController';
const c = LeaveTypesController.getInstance();
export const GET = c.handleGet;
export const POST = c.handlePost;
export const PATCH = c.handlePatch;
export const DELETE = c.handleDelete;
