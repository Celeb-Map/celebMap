export type CoursePlace = {
  candidateId: string;
  id: string | number;
  source: 'supabase' | 'tourapi';
  kind: 'restaurant' | 'attraction';
  title: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
};

export function straightDistance(a: CoursePlace, b: CoursePlace) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h)))));
}

// 가까운 후보를 이어 붙인 초안이다. 영업시간·테마·실제 경로 최적화는 별도 단계다.
export function buildCourseDraft(origin: CoursePlace, candidates: CoursePlace[], count: number, attractionsOnly: boolean) {
  const remaining = [...new Map(candidates.filter(place => place.candidateId !== origin.candidateId
    && (!attractionsOnly || place.kind === 'attraction')
    && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90
    && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180)
    .map(place => [place.candidateId, place])).values()];
  const stops = [origin];
  while (stops.length < count && remaining.length) {
    const last = stops[stops.length - 1];
    remaining.sort((a, b) => straightDistance(last, a) - straightDistance(last, b)
      || a.candidateId.localeCompare(b.candidateId));
    stops.push(remaining.shift()!);
  }
  return stops;
}
