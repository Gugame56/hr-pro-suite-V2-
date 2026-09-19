import { AttendanceController } from '@/lib/controllers/AttendanceController';
const c = AttendanceController.getInstance();
export const GET = c.handleGet;
export const POST = c.handlePost;
