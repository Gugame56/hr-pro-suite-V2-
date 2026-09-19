import { PayrollSyncController } from '@/lib/controllers/PayrollSyncController';
const c = PayrollSyncController.getInstance();
export const POST = c.handlePost;
