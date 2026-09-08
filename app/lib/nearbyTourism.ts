const TOUR_API_ENDPOINT =
  'https://apis.data.go.kr/B551011/KorService2/locationBasedList2';

const CONTENT_TYPES = [
  { id: '12', kind: 'attraction' as const },
  { id: '32', kind: 'accommodation' as const },
];

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

function parseCoordinate(value: string | undefined, min: number, max: number) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export async function getNearbyTourism(longitude: number, latitude: number, radius = 3000, attractionsOnly = false) {
  const configuredKey = process.env.API_KEY?.trim();
  if (!configuredKey) {
    throw new Error('서버에 TourAPI 인증키가 설정되지 않았습니다.');
  }

  let serviceKey = configuredKey;
  try {
    serviceKey = decodeURIComponent(configuredKey);
  } catch {
    // 이미 디코딩된 일반 인증키라면 원래 값을 사용합니다.
  }

  try {
    const types = attractionsOnly ? CONTENT_TYPES.filter(type => type.kind === 'attraction') : CONTENT_TYPES;
    const results = await Promise.all(types.map(async contentType => {
      const params = new URLSearchParams({
        serviceKey,
        MobileOS: 'WEB',
        MobileApp: 'celeb-map',
        _type: 'json',
        mapX: longitude.toString(),
        mapY: latitude.toString(),
        radius: radius.toString(),
        arrange: 'E',
        contentTypeId: contentType.id,
        numOfRows: '20',
        pageNo: '1',
      });
      const response = await fetch(`${TOUR_API_ENDPOINT}?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`TourAPI 요청에 실패했습니다. (${response.status})`);

      const data = await response.json();
      const header = data?.response?.header;
      if (header?.resultCode !== '0000') {
        throw new Error(header?.resultMsg ?? 'TourAPI가 오류를 반환했습니다.');
      }

      const rawItems = data?.response?.body?.items?.item;
      const items: TourApiItem[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
      const places = items.flatMap(item => {
        const itemLongitude = parseCoordinate(item.mapx, -180, 180);
        const itemLatitude = parseCoordinate(item.mapy, -90, 90);
        if (!item.contentid || !item.title || itemLongitude === null || itemLatitude === null || (itemLongitude === 0 && itemLatitude === 0)) return [];
        return [{
          id: item.contentid,
          kind: contentType.kind,
          contentTypeId: item.contenttypeid ?? contentType.id,
          title: item.title,
          address: [item.addr1, item.addr2].filter(Boolean).join(' '),
          imageUrl: item.firstimage || null,
          longitude: itemLongitude,
          latitude: itemLatitude,
          distanceMeters: item.dist !== undefined && String(item.dist).trim() !== '' && Number.isFinite(Number(item.dist)) && Number(item.dist) >= 0
            ? Math.round(Number(item.dist)) : null,
        }];
      });
      return { totalCount: Number(data?.response?.body?.totalCount ?? places.length), places };
    }));

    const places = results.flatMap(result => result.places);

    return {
      totalCount: results.reduce((sum, result) => sum + result.totalCount, 0),
      places,
    };
  } catch {
    // 외부 오류 문자열에 인증키가 담긴 URL이 포함될 수 있으므로 그대로 반환하지 않는다.
    throw new Error('TourAPI 주변 장소 조회에 실패했습니다.');
  }
}
