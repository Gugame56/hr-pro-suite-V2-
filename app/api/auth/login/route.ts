import { AuthController } from '@/lib/controllers/AuthController';
const c = AuthController.getInstance();
export const POST = c.handleLogin;
