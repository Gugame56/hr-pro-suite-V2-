// =============================================================================
// SettingsController — แปลงจาก app/api/settings/route.ts
// Key-value settings get/patch
// =============================================================================

import { NextResponse } from 'next/server';
import { BaseRepository } from '../repositories/BaseRepository';
import { AuthorizationService } from '../services/AuthorizationService';

export class SettingsController {
  private static _instance: SettingsController;
  private readonly repository: BaseRepository;
  private readonly authService: AuthorizationService;

  constructor() {
    this.repository = new BaseRepository('Settings', 'key');
    this.authService = AuthorizationService.getInstance();
    this.handleGet = this.handleGet.bind(this);
    this.handlePatch = this.handlePatch.bind(this);
  }

  static getInstance(): SettingsController {
    if (!SettingsController._instance) {
      SettingsController._instance = new SettingsController();
    }
    return SettingsController._instance;
  }

  async handleGet(): Promise<NextResponse> {
    try {
      const rows = await this.repository.getAll();
      const settings = rows.reduce((acc: any, row: any) => {
        if (row.key) acc[row.key] = row.value;
        return acc;
      }, {});
      return NextResponse.json(settings);
    } catch (error) {
      console.error('API Error (Settings GET):', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
  }

  async handlePatch(request: Request): Promise<NextResponse> {
    const denied = this.authService.requireManager(request);
    if (denied) return denied;

    try {
      const body = await request.json();
      const allSettings = await this.repository.getAll();

      for (const [key, value] of Object.entries(body)) {
        const existing = allSettings.find((s: any) => s.key === key);
        if (existing) {
          await this.repository.update(key, { value });
        } else {
          await this.repository.add({ key, value });
        }
      }

      return NextResponse.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('API Error (Settings PATCH):', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
  }
}
