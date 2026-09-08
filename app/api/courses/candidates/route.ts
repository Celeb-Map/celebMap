import type { NextRequest } from 'next/server';
import { getNearbyRestaurants, NearbySearchError, parseNearbyParams } from '../../../lib/nearbyRestaurants';
import { getNearbyTourism } from '../../../lib/nearbyTourism';

async function collect(restaurantId: number, radius: number) {
  const restaurants = await getNearbyRestaurants(restaurantId, radius);
  const { longitude, latitude } = restaurants.origin;
  const tourism = await getNearbyTourism(longitude, latitude, radius, true);
  const places = [
    ...restaurants.places.map(place => ({ ...place, candidateId: `supabase:${place.id}` })),
    ...tourism.places.map(place => ({ ...place, source: 'tourapi' as const, candidateId: `tourapi:${place.id}` })),
  ];
  const unique = [...new Map(places.map(place => [place.candidateId, place])).values()];
  unique.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity)
    || a.candidateId.localeCompare(b.candidateId));
  return { origin: restaurants.origin, radiusMeters: radius, places: unique };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const { restaurantId, radius } = parseNearbyParams(params);
    let result = await collect(restaurantId, radius);
    // 초기 후보 부족 기준은 출발지 외 4곳 미만. 방문 가능성은 후속 코스 생성 단계에서 평가한다.
    if (!params.has('radius') && result.places.length < 4) {
      result = await collect(restaurantId, 3000);
    }
    return Response.json({
      ...result,
      distanceType: 'geodesic',
      expanded: !params.has('radius') && result.radiusMeters === 3000,
      returnedCount: result.places.length,
      scheduleValidated: false,
      message: '주변 후보 목록입니다. 방문시간·테마·실제 이동 경로는 아직 평가하지 않았습니다.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json(
      { message: error instanceof NearbySearchError ? error.message : '관광지 후보 조회에 실패했습니다. 잠시 후 다시 시도하세요.' },
      { status: error instanceof NearbySearchError ? error.status : 502 },
    );
  }
}
