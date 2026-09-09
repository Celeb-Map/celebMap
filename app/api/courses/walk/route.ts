import { parseWalkingRoute, validStop, walkingParams } from '../../../lib/walkingRoute';

export async function POST(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  let body;
  try { body = await request.json(); } catch { return reply({ message: '코스 좌표를 확인해 주세요.' }, 400); }
  const stops = body?.stops;
  if (!Array.isArray(stops) || stops.length < 2 || stops.length > 5 || !stops.every(validStop)) {
    return reply({ message: '올바른 좌표의 장소 2~5곳을 선택해 주세요.' }, 400);
  }
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return reply({ message: '도보 길찾기 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.' }, 503);
  try {
    const response = await fetch(`https://dapi.kakao.com/v2/routing/walk?${walkingParams(stops)}`, {
      headers: { Authorization: `KakaoAK ${key}` }, cache: 'no-store',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
    });
    if (!response.ok) return reply({ message: response.status === 429 ? '길찾기 요청이 많아요. 잠시 후 다시 시도해 주세요.' : '도보 경로를 조회하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 502);
    return reply(parseWalkingRoute(await response.json(), stops.length - 1));
  } catch {
    return reply({ message: '도보 경로를 찾지 못했어요. 장소를 바꾸거나 다시 시도해 주세요.' }, 502);
  }
}
