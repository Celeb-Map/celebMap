export type WalkingStop = { latitude: number; longitude: number };
export type WalkingRoute = {
  distance: number;
  duration: number;
  legs: { distance: number; duration: number; paths: [number, number][][] }[];
};

export function validStop(value: unknown): value is WalkingStop {
  if (!value || typeof value !== 'object') return false;
  const { latitude, longitude } = value as WalkingStop;
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

export function walkingParams(stops: WalkingStop[]) {
  const first = stops[0], last = stops[stops.length - 1];
  const params = new URLSearchParams({
    start_x: String(first.longitude), start_y: String(first.latitude),
    end_x: String(last.longitude), end_y: String(last.latitude),
    input_coord: 'WGS84', output_coord: 'WGS84',
  });
  if (stops.length > 2) {
    params.set('via_x', stops.slice(1, -1).map(stop => stop.longitude).join(','));
    params.set('via_y', stops.slice(1, -1).map(stop => stop.latitude).join(','));
  }
  return params;
}

export function parseWalkingRoute(value: unknown, legCount: number): WalkingRoute {
  const data = value as { status?: string; route?: {
    properties: { totalDistance: number; totalTime: number };
    legs: { properties: { distance: number; time: number }; steps: { path: { points: [number, number][] } }[] }[];
  } };
  const route = data?.route;
  if (data?.status !== 'OK' || !route || route.legs?.length !== legCount) throw new Error('경로 없음');
  const nonnegative = (n: number) => Number.isFinite(n) && n >= 0;
  if (!nonnegative(route.properties.totalDistance) || !nonnegative(route.properties.totalTime)) throw new Error('잘못된 거리');
  const legs = route.legs.map(leg => {
    if (!nonnegative(leg.properties.distance) || !nonnegative(leg.properties.time)) throw new Error('잘못된 구간');
    const paths = leg.steps.map(step => {
      const points = step.path.points;
      if (!Array.isArray(points) || !points.length || !points.every(point => Array.isArray(point) && point.length === 2 && validStop({ longitude: point[0], latitude: point[1] }))) throw new Error('잘못된 좌표');
      return points;
    });
    if (!paths.some(path => path.length >= 2)) throw new Error('경로 좌표 없음');
    return { distance: leg.properties.distance, duration: leg.properties.time, paths };
  });
  return { distance: route.properties.totalDistance, duration: route.properties.totalTime, legs };
}
