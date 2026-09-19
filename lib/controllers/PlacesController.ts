import { NextResponse } from 'next/server';

export class PlacesController {
  private static instance: PlacesController;

  private constructor() {
    this.handleGet = this.handleGet.bind(this);
  }

  static getInstance(): PlacesController {
    if (!PlacesController.instance) {
      PlacesController.instance = new PlacesController();
    }
    return PlacesController.instance;
  }

  async handleGet(request: Request): Promise<NextResponse> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ยังไม่ได้ตั้งค่า GOOGLE_PLACES_API_KEY ในไฟล์ .env.local' },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) return NextResponse.json({ results: [] });

    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const body: any = { textQuery: q, languageCode: 'th', regionCode: 'TH' };
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 30000 } };
    }

    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error?.message || 'ค้นหาสถานที่ไม่สำเร็จ' },
          { status: 502 },
        );
      }

      const results = (data.places || [])
        .filter((p: any) => p.location)
        .map((p: any) => ({
          title: p.displayName?.text || p.formattedAddress || 'สถานที่',
          address: p.formattedAddress || '',
          lat: p.location.latitude as number,
          lng: p.location.longitude as number,
        }));

      return NextResponse.json({ results });
    } catch (error) {
      console.error('API Error (Places search):', error);
      return NextResponse.json({ error: 'ค้นหาสถานที่ไม่สำเร็จ' }, { status: 500 });
    }
  }
}
