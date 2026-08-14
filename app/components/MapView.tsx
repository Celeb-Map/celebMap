"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  LoaderCircle,
  MapPin,
  Navigation,
} from 'lucide-react';

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type TourismPlace = {
  id: string;
  contentTypeId: string;
  title: string;
  address: string;
  imageUrl: string | null;
  longitude: number;
  latitude: number;
  distanceMeters: number;
};

type NearbyResponse = {
  totalCount: number;
  places: TourismPlace[];
  message?: string;
};

function formatDistance(meters: number) {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function MapView() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [places, setPlaces] = useState<TourismPlace[]>([]);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [status, setStatus] = useState<'locating' | 'loading' | 'success' | 'error'>('locating');
  const [message, setMessage] = useState('현재 위치를 확인하고 있어요.');

  const loadNearbyPlaces = useCallback(async (position: Coordinates) => {
    setStatus('loading');
    setMessage('주변 관광지를 불러오고 있어요.');

    try {
      const params = new URLSearchParams({
        latitude: position.latitude.toString(),
        longitude: position.longitude.toString(),
      });
      const response = await fetch(`/api/tourism/nearby?${params}`);
      const data = await response.json() as NearbyResponse;

      if (!response.ok) throw new Error(data.message ?? '관광정보를 불러오지 못했습니다.');

      setPlaces(data.places);
      setStatus('success');
      setMessage(
        data.places.length > 0
          ? `반경 3km 내 관광지 ${data.places.length}곳을 불러왔어요.`
          : '반경 3km 내 등록된 관광지가 없어요.',
      );
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '관광정보를 불러오지 못했습니다.');
    }
  }, []);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('이 브라우저는 위치 기능을 지원하지 않습니다.');
      return;
    }

    setStatus('locating');
    setMessage('현재 위치를 확인하고 있어요.');
    navigator.geolocation.getCurrentPosition(
      position => {
        const nextCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCoordinates(nextCoordinates);
        void loadNearbyPlaces(nextCoordinates);
      },
      error => {
        setStatus('error');
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? '위치 권한이 필요합니다. 브라우저에서 위치 접근을 허용해 주세요.'
            : '현재 위치를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  }, [loadNearbyPlaces]);

  useEffect(() => {
    const timeoutId = window.setTimeout(locateMe, 0);
    return () => window.clearTimeout(timeoutId);
  }, [locateMe]);

  const pinPositions = useMemo(() => {
    if (!coordinates) return [];
    const latitudeScale = 0.032;
    const longitudeScale = 0.04;

    return places.map(place => ({
      ...place,
      left: Math.min(90, Math.max(10, 50 + ((place.longitude - coordinates.longitude) / longitudeScale) * 50)),
      top: Math.min(86, Math.max(16, 50 - ((place.latitude - coordinates.latitude) / latitudeScale) * 50)),
    }));
  }, [coordinates, places]);

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-col">
      <div className="relative flex-1 overflow-hidden bg-plum-50">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(#b99cc4 1px, transparent 1px), linear-gradient(90deg, #b99cc4 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 right-0 top-[32%] h-5 rounded bg-white/60" />
          <div className="absolute left-0 right-0 top-[60%] h-3.5 rounded bg-white/50" />
          <div className="absolute bottom-0 left-[30%] top-0 w-4 rounded bg-white/60" />
          <div className="absolute bottom-0 left-[65%] top-0 w-3 rounded bg-white/50" />
        </div>

        <div className="absolute left-4 right-4 top-4 z-20 rounded-2xl border border-plum-100 bg-white/95 p-3 shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${status === 'error' ? 'bg-neon-400' : 'bg-plum-50'}`}>
              {status === 'locating' || status === 'loading' ? (
                <LoaderCircle size={17} className="animate-spin text-plum-700" />
              ) : status === 'error' ? (
                <AlertCircle size={17} className="text-plum-900" />
              ) : (
                <MapPin size={17} className="text-plum-700" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-plum-900">내 위치 기반 관광정보</p>
              <p className="mt-0.5 truncate text-[11px] text-plum-500">{message}</p>
            </div>
            <button
              type="button"
              onClick={locateMe}
              disabled={status === 'locating' || status === 'loading'}
              aria-label="현재 위치 다시 확인"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-plum-700 text-neon-400 shadow-sm disabled:opacity-50"
            >
              <Navigation size={16} />
            </button>
          </div>
          {coordinates && (
            <p className="mt-2 border-t border-plum-100 pt-2 text-[10px] text-plum-400">
              위도 {coordinates.latitude.toFixed(5)} · 경도 {coordinates.longitude.toFixed(5)} · 정확도 약 {Math.round(coordinates.accuracy)}m
            </p>
          )}
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-plum-400/40" />
        {coordinates && (
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" aria-label="내 위치">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-14 w-14 animate-pulse rounded-full bg-neon-400/30" />
              <div className="z-10 h-5 w-5 rounded-full border-[4px] border-neon-400 bg-plum-700 shadow-lg" />
            </div>
          </div>
        )}

        {pinPositions.map(place => {
          const active = activePlaceId === place.id;
          return (
            <button
              type="button"
              key={place.id}
              onClick={() => setActivePlaceId(active ? null : place.id)}
              className="absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ left: `${place.left}%`, top: `${place.top}%` }}
            >
              {active && (
                <span className="mb-1 max-w-44 truncate rounded-xl bg-plum-900 px-3 py-1.5 text-xs font-bold text-neon-400 shadow-lg">
                  {place.title}
                </span>
              )}
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform ${active ? 'scale-125 bg-neon-400 text-plum-900' : 'bg-plum-700 text-neon-400'}`}>
                <MapPin size={15} />
              </span>
            </button>
          );
        })}

      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 z-20 overflow-hidden rounded-t-[28px] border border-b-0 border-plum-100 bg-white/95 shadow-[0_-12px_40px_rgba(60,26,71,0.14)] backdrop-blur-xl transition-[height] duration-300 ease-out ${panelOpen ? 'h-80' : 'h-[88px]'}`}
      >
        <button
          type="button"
          onClick={() => setPanelOpen(open => !open)}
          aria-expanded={panelOpen}
          aria-controls="nearby-places-panel"
          className="group flex h-[88px] w-full items-center gap-3 px-5 text-left outline-none transition-colors hover:bg-plum-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neon-400"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-plum-700 text-neon-400 shadow-sm">
            <MapPin size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-plum-900">주변 관광지</span>
              <span className="rounded-full bg-neon-400/20 px-2 py-0.5 text-[11px] font-extrabold text-plum-700">
                {places.length}곳
              </span>
            </span>
            <span className="mt-1 block truncate text-xs text-plum-400">
              {panelOpen ? '지도에서 핀을 선택하거나 목록을 둘러보세요' : '눌러서 관광지 목록 보기'}
            </span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-plum-100 bg-white text-plum-600 shadow-sm">
            <ChevronDown size={18} className={`transition-transform duration-300 ${panelOpen ? '' : 'rotate-180'}`} />
          </span>
        </button>

        {panelOpen && (
          <div id="nearby-places-panel" className="h-[calc(100%-88px)] space-y-2.5 overflow-y-auto border-t border-plum-100/80 px-4 pb-5 pt-3 no-scrollbar">
            {places.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <MapPin size={24} className="mb-2 text-plum-300" />
                <p className="text-sm font-semibold text-plum-500">{status === 'success' ? '주변 관광지가 없어요.' : '위치를 확인하면 관광지가 표시돼요.'}</p>
              </div>
            ) : places.map(place => (
              <button
                type="button"
                key={place.id}
                onClick={() => setActivePlaceId(place.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-neon-400 ${activePlaceId === place.id ? 'border-neon-400 bg-neon-50 shadow-sm' : 'border-transparent bg-plum-50/70 hover:border-plum-200 hover:bg-plum-50'}`}
              >
                <div
                  className="h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-plum-300 to-plum-100 bg-cover bg-center"
                  style={place.imageUrl ? { backgroundImage: `url(${place.imageUrl.replace(/^http:/, 'https:')})` } : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-plum-900">{place.title}</p>
                  <p className="mt-0.5 truncate text-xs text-plum-400">{place.address || '주소 정보 없음'}</p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-plum-700 shadow-sm">{formatDistance(place.distanceMeters)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
