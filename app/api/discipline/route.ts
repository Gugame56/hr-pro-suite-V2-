import { BaseController } from '@/lib/controllers/BaseController';
const c = new BaseController('Discipline');
export const GET = c.handleGet;
export const POST = c.handlePost;
export const PATCH = c.handlePatch;
export const DELETE = c.handleDelete;
