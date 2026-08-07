import { NextRequest } from 'next/server';

const TOUR_API_ENDPOINT =
  'https://apis.data.go.kr/B551011/KorService2/locationBasedList2';

type TourApiItem = {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  firstimage?: string;
  mapx?: string;
  mapy?: string;
  dist?: string;
};

function parseCoordinate(value: string | null, min: number, max: number) {
  if (value === null || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export async function GET(request: NextRequest) {
  const longitude = parseCoordinate(request.nextUrl.searchParams.get('longitude'), -180, 180);
  const latitude = parseCoordinate(request.nextUrl.searchParams.get('latitude'), -90, 90);

  if (longitude === null || latitude === null) {
    return Response.json({ message: '올바른 위도와 경도가 필요합니다.' }, { status: 400 });
  }

  const configuredKey = process.env.API_KEY?.trim();
  if (!configuredKey) {
    return Response.json({ message: '서버에 TourAPI 인증키가 설정되지 않았습니다.' }, { status: 500 });
  }

  let serviceKey = configuredKey;
  try {
    serviceKey = decodeURIComponent(configuredKey);
  } catch {
    // 이미 디코딩된 일반 인증키라면 원래 값을 사용합니다.
  }

  const params = new URLSearchParams({
    serviceKey,
    MobileOS: 'WEB',
    MobileApp: 'celeb-map',
    _type: 'json',
    mapX: longitude.toString(),
    mapY: latitude.toString(),
    radius: '3000',
    arrange: 'E',
    contentTypeId: '12',
    numOfRows: '20',
    pageNo: '1',
  });

  try {
    const response = await fetch(`${TOUR_API_ENDPOINT}?${params}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return Response.json(
        { message: `TourAPI 요청에 실패했습니다. (${response.status})` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const header = data?.response?.header;
    if (header?.resultCode !== '0000') {
      return Response.json(
        { message: header?.resultMsg ?? 'TourAPI가 오류를 반환했습니다.' },
        { status: 502 },
      );
    }

    const rawItems = data?.response?.body?.items?.item;
    const items: TourApiItem[] = Array.isArray(rawItems)
      ? rawItems
      : rawItems
        ? [rawItems]
        : [];

    const places = items.flatMap(item => {
      const itemLongitude = Number(item.mapx);
      const itemLatitude = Number(item.mapy);
      if (!item.contentid || !item.title || !Number.isFinite(itemLongitude) || !Number.isFinite(itemLatitude)) {
        return [];
      }

      return [{
        id: item.contentid,
        contentTypeId: item.contenttypeid ?? '12',
        title: item.title,
        address: [item.addr1, item.addr2].filter(Boolean).join(' '),
        imageUrl: item.firstimage || null,
        longitude: itemLongitude,
        latitude: itemLatitude,
        distanceMeters: Math.round(Number(item.dist) || 0),
      }];
    });

    return Response.json({
      totalCount: Number(data?.response?.body?.totalCount ?? places.length),
      places,
    });
  } catch {
    return Response.json({ message: 'TourAPI 통신 중 오류가 발생했습니다.' }, { status: 502 });
  }
}
