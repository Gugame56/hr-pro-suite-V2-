// =============================================================================
// HR Pro Suite — SupabaseClient (Singleton)
// Drop-in replacement for GoogleSheetsClient — uses Supabase REST API (PostgREST)
// =============================================================================

export class SupabaseClient {
  private static instance: SupabaseClient;

  private readonly baseUrl: string;
  private readonly apiKey: string;

  // Simple in-memory cache (same TTL as the old GoogleSheetsClient cache)
  private readonly cache = new Map<string, { data: any; expires: number }>();
  private readonly ttlMs = 8000;

  private constructor() {
    this.baseUrl = process.env.SUPABASE_URL || 'https://vruancgpqtdhaauugwme.supabase.co';
    this.apiKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydWFuY2dwcXRkaGFhdXVnd21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQ0MzQxMCwiZXhwIjoyMTA2MDE5NDEwfQ.hJ87cPGBZrX-lobJ3BYkfN2CP7GlIO81_pkIZd8MOXg';
  }

  /** Singleton instance */
  static getInstance(): SupabaseClient {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient();
    }
    return SupabaseClient.instance;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.apiKey,
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  /** Convert sheet/table name to Supabase table name (lowercase, no separators) */
  toTableName(sheetName: string): string {
    return sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // ---------------------------------------------------------------------------
  // Cache
  // ---------------------------------------------------------------------------

  private getCached(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.data;
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, expires: Date.now() + this.ttlMs });
  }

  /** Invalidate cache for a specific table or all tables */
  invalidateCache(table?: string): void {
    if (!table) {
      this.cache.clear();
      return;
    }
    const t = table.toLowerCase();
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(t)) this.cache.delete(key);
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /** Read all rows from a table */
  async getAll(table: string): Promise<Record<string, any>[]> {
    const cacheKey = `${table}:all`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(
        `${this.baseUrl}/rest/v1/${table}?select=*&order=id`,
        { headers: this.headers() },
      );

      if (!res.ok) {
        // If ordering by id fails (e.g. settings table uses 'key'), retry without order
        if (res.status === 400) {
          const retry = await fetch(
            `${this.baseUrl}/rest/v1/${table}?select=*`,
            { headers: this.headers() },
          );
          if (retry.ok) {
            const data = await retry.json();
            this.setCache(cacheKey, data);
            return data;
          }
        }
        console.error(`[Supabase] GET ${table}:`, await res.text());
        // Return cached stale data if available
        const stale = this.cache.get(cacheKey);
        return stale ? stale.data : [];
      }

      const data = await res.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`[Supabase] GET ${table} error:`, error);
      const stale = this.cache.get(cacheKey);
      return stale ? stale.data : [];
    }
  }

  /** Insert a row into a table */
  async insert(table: string, data: Record<string, any>): Promise<Record<string, any>> {
    const cleanData = this.cleanRecord(data);

    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await fetch(`${this.baseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: this.headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(cleanData),
      });

      if (res.ok) {
        this.invalidateCache(table);
        return cleanData;
      }

      const errText = await res.text();

      // 1. Missing column in schema: strip the offending column and retry
      const missingColMatch = errText.match(/Could not find the '([^']+)' column/);
      if (missingColMatch && missingColMatch[1]) {
        delete cleanData[missingColMatch[1]];
        continue;
      }

      // 2. Serial id conflict: strip id and retry
      if (
        cleanData.id &&
        (errText.includes('invalid input syntax') || errText.includes('violates') || errText.includes('type integer'))
      ) {
        delete cleanData.id;
        continue;
      }

      throw new Error(`[Supabase] INSERT ${table}: ${errText}`);
    }

    throw new Error(`[Supabase] INSERT ${table}: Maximum retries exceeded`);
  }

  /** Update a row by primary key */
  async update(
    table: string,
    idValue: string,
    data: Record<string, any>,
    idKey = 'id',
  ): Promise<void> {
    const cleanData = this.cleanRecord(data);
    delete cleanData[idKey];

    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await fetch(
        `${this.baseUrl}/rest/v1/${table}?${encodeURIComponent(idKey)}=eq.${encodeURIComponent(idValue)}`,
        {
          method: 'PATCH',
          headers: this.headers({ Prefer: 'return=minimal' }),
          body: JSON.stringify(cleanData),
        },
      );

      if (res.ok) {
        this.invalidateCache(table);
        return;
      }

      const errText = await res.text();

      // Strip unknown column and retry
      const missingColMatch = errText.match(/Could not find the '([^']+)' column/);
      if (missingColMatch && missingColMatch[1]) {
        delete cleanData[missingColMatch[1]];
        continue;
      }

      throw new Error(`[Supabase] UPDATE ${table}: ${errText}`);
    }

    throw new Error(`[Supabase] UPDATE ${table}: Maximum retries exceeded`);
  }

  /** Delete a row by primary key */
  async delete(
    table: string,
    idValue: string,
    idKey = 'id',
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/rest/v1/${table}?${encodeURIComponent(idKey)}=eq.${encodeURIComponent(idValue)}`,
      {
        method: 'DELETE',
        headers: this.headers(),
      },
    );

    if (!res.ok) {
      throw new Error(`[Supabase] DELETE ${table}: ${await res.text()}`);
    }

    this.invalidateCache(table);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Remove internal/undefined fields from a record before sending to Supabase */
  private cleanRecord(data: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip internal fields
      if (key === '_row') continue;
      // Skip undefined values
      if (value === undefined) continue;
      clean[key] = value;
    }
    return clean;
  }
}
