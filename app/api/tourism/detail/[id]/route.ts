import { NextRequest } from 'next/server';

const TOUR_API_ENDPOINT = 'https://apis.data.go.kr/B551011/KorService2/detailCommon2';

function textOnly(value: unknown) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const contentId = id.trim();
  const contentTypeId = request.nextUrl.searchParams.get('contentTypeId')?.trim();
  if (!/^\d+$/.test(contentId)) {
    return Response.json({ message: '올바른 콘텐츠 ID가 필요합니다.' }, { status: 400 });
  }

  const configuredKey = process.env.API_KEY?.trim();
  if (!configuredKey) {
    return Response.json({ message: '서버에 TourAPI 인증키가 설정되지 않았습니다.' }, { status: 500 });
  }

  let serviceKey = configuredKey;
  try {
    serviceKey = decodeURIComponent(configuredKey);
  } catch {
    // 이미 디코딩된 인증키는 원래 값을 사용합니다.
  }

  const query = new URLSearchParams({
    serviceKey,
    MobileOS: 'WEB',
    MobileApp: 'celeb-map',
    _type: 'json',
    contentId,
    defaultYN: 'Y',
    firstImageYN: 'Y',
    addrinfoYN: 'Y',
    mapinfoYN: 'Y',
    overviewYN: 'Y',
  });
  if (contentTypeId) query.set('contentTypeId', contentTypeId);

  try {
    const response = await fetch(`${TOUR_API_ENDPOINT}?${query}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`TourAPI 상세 요청에 실패했습니다. (${response.status})`);
    const data = await response.json();
    const header = data?.response?.header;
    if (header?.resultCode !== '0000') throw new Error(header?.resultMsg ?? 'TourAPI가 오류를 반환했습니다.');

    const rawItem = data?.response?.body?.items?.item;
    const item = Array.isArray(rawItem) ? rawItem[0] : rawItem;
    if (!item) return Response.json({ message: '상세 정보가 없습니다.' }, { status: 404 });

    return Response.json({
      detail: {
        title: textOnly(item.title),
        address: textOnly([item.addr1, item.addr2].filter(Boolean).join(' ')),
        imageUrl: item.firstimage || item.firstimage2 || null,
        telephone: textOnly(item.tel),
        overview: textOnly(item.overview),
        zipcode: textOnly(item.zipcode),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : '상세 정보를 불러오지 못했습니다.' }, { status: 502 });
  }
}
