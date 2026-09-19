import { PlacesController } from '@/lib/controllers/PlacesController';
const c = PlacesController.getInstance();
export const GET = c.handleGet;
