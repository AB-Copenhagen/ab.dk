import { NextResponse } from 'next/server';

import { fetchABEvents } from '@/lib/si/client';

// Short cache — only used during a live match
export const revalidate = 30;

export async function GET() {
  try {
    const events = await fetchABEvents({ status: 'inprogress', limit: 1 });
    return NextResponse.json(events ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
