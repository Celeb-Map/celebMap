import { createClient } from '@supabase/supabase-js';

export type NearbyRestaurant = {
  id: number;
  source: 'supabase';
  kind: 'restaurant';
  title: string | null;
  address: string | null;
  longitude: number;
  latitude: number;
  category?: string | null;
  hours?: string | null;
  distanceMeters?: number;
};

export type NearbyRestaurantsResult = {
  origin: NearbyRestaurant;
  radiusMeters: number;
  distanceType: 'geodesic';
  places: NearbyRestaurant[];
};

export class NearbySearchError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function parseNearbyParams(params: URLSearchParams) {
  const idText = params.get('restaurantId') ?? '';
  const radiusText = params.get('radius') ?? '2000';
  const restaurantId = Number(idText);
  const radius = Number(radiusText);
  if (!/^\d+$/.test(idText) || !Number.isSafeInteger(restaurantId) || restaurantId < 1) {
    throw new NearbySearchError('올바른 restaurantId가 필요합니다.', 400);
  }
  if (!['2000', '3000'].includes(radiusText)) {
    throw new NearbySearchError('radius는 2000 또는 3000이어야 합니다.', 400);
  }
  return { restaurantId, radius };
}

export async function getNearbyRestaurants(restaurantId: number, radius: number): Promise<NearbyRestaurantsResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new NearbySearchError('Supabase 환경 변수가 설정되지 않았습니다.', 500);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('nearby_restaurants', {
    p_restaurant_id: restaurantId, p_radius_meters: radius, p_limit: 30,
  });
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new NearbySearchError('PostGIS 검색 함수가 없습니다. docs/postgis-setup.md의 SQL을 먼저 적용하세요.', 503);
    }
    if (error.code === 'P0002') throw new NearbySearchError('출발 맛집을 찾을 수 없습니다.', 404);
    if (error.code === '22023') throw new NearbySearchError('출발 맛집의 좌표 또는 검색 조건을 확인하세요.', 422);
    throw new NearbySearchError('주변 맛집 조회에 실패했습니다. DB 연결과 SELECT/RLS 권한을 확인하세요.', 502);
  }
  if (!data?.origin || !Array.isArray(data.places)) {
    throw new NearbySearchError('주변 맛집 응답 형식이 올바르지 않습니다.', 502);
  }
  return data as NearbyRestaurantsResult;
}
