import { ReportsController } from '@/lib/controllers/ReportsController';
const c = ReportsController.getInstance();
export const GET = c.handleGet;
