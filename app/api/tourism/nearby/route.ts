import type { NextRequest } from 'next/server';
import { getNearbyTourism } from '../../../lib/nearbyTourism';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lonText = params.get('longitude');
  const latText = params.get('latitude');
  const longitude = Number(lonText);
  const latitude = Number(latText);
  const radius = params.get('radius') ?? '3000';
  if (!lonText?.trim() || !latText?.trim() || !Number.isFinite(longitude) || !Number.isFinite(latitude)
    || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return Response.json({ message: '올바른 위도와 경도가 필요합니다.' }, { status: 400 });
  }
  if (!['2000', '3000'].includes(radius)) {
    return Response.json({ message: 'radius는 2000 또는 3000이어야 합니다.' }, { status: 400 });
  }
  if (!process.env.API_KEY?.trim()) {
    return Response.json({ message: '서버에 TourAPI 인증키가 설정되지 않았습니다.' }, { status: 500 });
  }
  try {
    return Response.json(await getNearbyTourism(longitude, latitude, Number(radius)), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ message: 'TourAPI 주변 장소 조회에 실패했습니다.' }, { status: 502 });
  }
}
