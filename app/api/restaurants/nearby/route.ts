import type { NextRequest } from 'next/server';
import { getNearbyRestaurants, NearbySearchError, parseNearbyParams } from '../../../lib/nearbyRestaurants';

export async function GET(request: NextRequest) {
  try {
    const { restaurantId, radius } = parseNearbyParams(request.nextUrl.searchParams);
    return Response.json(await getNearbyRestaurants(restaurantId, radius));
  } catch (error) {
    return Response.json(
      { message: error instanceof NearbySearchError ? error.message : '주변 맛집 조회에 실패했습니다.' },
      { status: error instanceof NearbySearchError ? error.status : 502 },
    );
  }
}
