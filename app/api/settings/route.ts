import { SettingsController } from '@/lib/controllers/SettingsController';
const c = SettingsController.getInstance();
export const GET = c.handleGet;
export const PATCH = c.handlePatch;
