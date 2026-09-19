import { LoansController } from '@/lib/controllers/LoansController';
const c = LoansController.getInstance();
export const GET = c.handleGet;
export const POST = c.handlePost;
export const PATCH = c.handlePatch;
export const DELETE = c.handleDelete;
