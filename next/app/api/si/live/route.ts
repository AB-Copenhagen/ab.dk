import { NextResponse } from 'next/server';

import { fetchABEvents } from '@/lib/si/client';

export async function GET() {
  try {
    const events = await fetchABEvents({ status: 'inprogress', limit: 1 });
    return NextResponse.json(events ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
