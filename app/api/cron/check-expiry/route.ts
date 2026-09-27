import { CompanyController } from '@/lib/controllers/CompanyController';
const c = CompanyController.getInstance();
export const POST = c.handleCheckExpiry;
