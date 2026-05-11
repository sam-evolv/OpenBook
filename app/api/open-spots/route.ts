import { NextRequest, NextResponse } from 'next/server';
import { fetchOpenSpots } from '@/lib/open-spots-server';
import { isValidCategory, isValidWhen } from '@/lib/open-spots';

export const runtime = 'nodejs';
export const revalidate = 30;

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const cityParam = url.searchParams.get('city');
  const categoryParam = url.searchParams.get('category');
  const whenParam = url.searchParams.get('when');
  const limit = Number(url.searchParams.get('limit') ?? 50);

  try {
    const spots = await fetchOpenSpots({
      city: cityParam && cityParam !== 'anywhere' ? cityParam : null,
      category: isValidCategory(categoryParam) ? categoryParam : 'all',
      when: isValidWhen(whenParam) ? whenParam : 'week',
      limit: Number.isFinite(limit) ? limit : 50,
    });
    return NextResponse.json({ spots, cursor: null });
  } catch {
    return NextResponse.json(
      { error: 'Could not load Open Spots' },
      { status: 500 }
    );
  }
}
