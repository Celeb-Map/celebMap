"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, LoaderCircle, MapPin, Navigation } from 'lucide-react';
import { loadKakaoMap, type KakaoMap, type KakaoMapsApi, type KakaoOverlay } from '../lib/kakaoMapLoader';

type Coordinates = { latitude: number; longitude: number; accuracy: number };
type TourismPlace = { id: string; contentTypeId: string; title: string; address: string; imageUrl: string | null; longitude: number; latitude: number; distanceMeters: number };
type NearbyResponse = { totalCount: number; places: TourismPlace[]; message?: string };

const formatDistance = (meters: number) => meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const mapsApiRef = useRef<KakaoMapsApi | null>(null);
  const locationOverlayRef = useRef<KakaoOverlay | null>(null);
  const placeOverlaysRef = useRef<KakaoOverlay[]>([]);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  const [panelOpen, setPanelOpen] = useState(true);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [places, setPlaces] = useState<TourismPlace[]>([]);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [status, setStatus] = useState<'locating' | 'loading' | 'success' | 'error'>('locating');
  const [message, setMessage] = useState('현재 위치를 확인하고 있어요.');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(() => appKey ? null : 'NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.');

  const loadNearbyPlaces = useCallback(async (position: Coordinates) => {
    setStatus('loading');
    setMessage('주변 관광지를 불러오고 있어요.');
    try {
      const params = new URLSearchParams({ latitude: position.latitude.toString(), longitude: position.longitude.toString() });
      const response = await fetch(`/api/tourism/nearby?${params}`);
      const data = await response.json() as NearbyResponse;
      if (!response.ok) throw new Error(data.message ?? '관광 정보를 불러오지 못했습니다.');
      setPlaces(data.places);
      setStatus('success');
      setMessage(data.places.length ? `반경 3km 내 관광지 ${data.places.length}곳을 표시했어요.` : '반경 3km 내 등록된 관광지가 없어요.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '관광 정보를 불러오지 못했습니다.');
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
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
        setCoordinates(next);
        void loadNearbyPlaces(next);
      },
      error => {
        setStatus('error');
        setMessage(error.code === error.PERMISSION_DENIED ? '위치 권한이 필요합니다. 브라우저에서 위치 접근을 허용해 주세요.' : '현재 위치를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  }, [loadNearbyPlaces]);

  useEffect(() => {
    const timeoutId = window.setTimeout(locateMe, 0);
    return () => window.clearTimeout(timeoutId);
  }, [locateMe]);

  useEffect(() => {
    if (!coordinates || !mapContainerRef.current) return;
    if (!appKey) return;
    let cancelled = false;
    loadKakaoMap(appKey).then(maps => {
      if (cancelled || !mapContainerRef.current) return;
      mapsApiRef.current = maps;
      const center = new maps.LatLng(coordinates.latitude, coordinates.longitude);
      const isNewMap = !mapRef.current;
      const map = mapRef.current ?? new maps.Map(mapContainerRef.current, { center, level: 6 });
      mapRef.current = map;
      if (isNewMap) map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
      map.relayout();
      map.setCenter(center);
      locationOverlayRef.current?.setMap(null);
      const locationNode = document.createElement('div');
      locationNode.className = 'h-6 w-6 rounded-full border-4 border-white bg-blue-500 shadow-lg';
      locationNode.setAttribute('aria-label', '내 위치');
      locationOverlayRef.current = new maps.CustomOverlay({ map, position: center, content: locationNode, xAnchor: 0.5, yAnchor: 0.5 });
      setMapError(null);
      setMapReady(true);
    }).catch(error => {
      if (!cancelled) {
        setMapReady(false);
        setMapError(error instanceof Error ? error.message : 'Kakao 지도를 표시하지 못했습니다.');
      }
    });
    return () => { cancelled = true; };
  }, [appKey, coordinates]);

  useEffect(() => {
    placeOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    placeOverlaysRef.current = [];
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    if (!mapReady || !map || !maps) return;

    placeOverlaysRef.current = places.map(place => {
      const position = new maps.LatLng(place.latitude, place.longitude);
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center';
      if (activePlaceId === place.id) {
        const label = document.createElement('div');
        label.className = 'mb-1 max-w-44 truncate rounded-xl bg-plum-900 px-3 py-1.5 text-xs font-bold text-neon-400 shadow-lg';
        label.textContent = place.title;
        wrapper.appendChild(label);
      }
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = `flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform ${activePlaceId === place.id ? 'scale-125 bg-neon-400 text-plum-900' : 'bg-plum-700 text-neon-400'}`;
      marker.setAttribute('aria-label', `${place.title} 관광지`);
      marker.textContent = '●';
      marker.addEventListener('click', () => {
        setActivePlaceId(current => current === place.id ? null : place.id);
        map.setCenter(position);
      });
      wrapper.appendChild(marker);
      return new maps.CustomOverlay({ map, position, content: wrapper, xAnchor: 0.5, yAnchor: 1 });
    });
    return () => {
      placeOverlaysRef.current.forEach(overlay => overlay.setMap(null));
      placeOverlaysRef.current = [];
    };
  }, [activePlaceId, mapReady, places]);

  const focusPlace = (place: TourismPlace) => {
    setActivePlaceId(place.id);
    if (mapRef.current && mapsApiRef.current) mapRef.current.setCenter(new mapsApiRef.current.LatLng(place.latitude, place.longitude));
  };

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-col">
      <div className="relative flex-1 overflow-hidden bg-plum-50">
        <div ref={mapContainerRef} className="absolute inset-0" aria-label="내 위치 주변 관광지 지도" />
        {mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-plum-50 px-8 text-center"><div><AlertCircle className="mx-auto mb-3 text-plum-500" size={30} /><p className="text-sm font-bold text-plum-800">Kakao 지도를 표시하지 못했습니다.</p><p className="mt-2 text-xs leading-5 text-plum-500">{mapError}</p></div></div>
        )}
        <div className="absolute left-4 right-4 top-4 z-20 rounded-2xl border border-plum-100 bg-white/95 p-3 shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${status === 'error' ? 'bg-neon-400' : 'bg-plum-50'}`}>
              {status === 'locating' || status === 'loading' ? <LoaderCircle size={17} className="animate-spin text-plum-700" /> : status === 'error' ? <AlertCircle size={17} className="text-plum-900" /> : <MapPin size={17} className="text-plum-700" />}
            </div>
            <div className="min-w-0 flex-1"><p className="text-xs font-bold text-plum-900">내 위치 기반 관광정보</p><p className="mt-0.5 truncate text-[11px] text-plum-500">{message}</p></div>
            <button type="button" onClick={locateMe} disabled={status === 'locating' || status === 'loading'} aria-label="현재 위치 다시 확인" className="flex h-9 w-9 items-center justify-center rounded-xl bg-plum-700 text-neon-400 shadow-sm disabled:opacity-50"><Navigation size={16} /></button>
          </div>
          {coordinates && <p className="mt-2 border-t border-plum-100 pt-2 text-[10px] text-plum-400">위도 {coordinates.latitude.toFixed(5)} · 경도 {coordinates.longitude.toFixed(5)} · 정확도 약 {Math.round(coordinates.accuracy)}m</p>}
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 z-20 overflow-hidden rounded-t-[28px] border border-b-0 border-plum-100 bg-white/95 shadow-[0_-12px_40px_rgba(60,26,71,0.14)] backdrop-blur-xl transition-[height] duration-300 ${panelOpen ? 'h-80' : 'h-[88px]'}`}>
        <button type="button" onClick={() => setPanelOpen(open => !open)} aria-expanded={panelOpen} aria-controls="nearby-places-panel" className="flex h-[88px] w-full items-center gap-3 px-5 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-plum-700 text-neon-400"><MapPin size={18} /></span>
          <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-sm font-extrabold text-plum-900">주변 관광지</span><span className="rounded-full bg-neon-400/20 px-2 py-0.5 text-[11px] font-extrabold text-plum-700">{places.length}곳</span></span><span className="mt-1 block truncate text-xs text-plum-400">{panelOpen ? '지도에서 핀을 선택하거나 목록을 둘러보세요.' : '주변 관광지 목록 보기'}</span></span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-plum-100 bg-white text-plum-600"><ChevronDown size={18} className={`transition-transform ${panelOpen ? '' : 'rotate-180'}`} /></span>
        </button>
        {panelOpen && (
          <div id="nearby-places-panel" className="h-[calc(100%-88px)] space-y-2.5 overflow-y-auto border-t border-plum-100/80 px-4 pb-5 pt-3 no-scrollbar">
            {places.length === 0 ? <div className="flex h-32 flex-col items-center justify-center text-center"><MapPin size={24} className="mb-2 text-plum-300" /><p className="text-sm font-semibold text-plum-500">{status === 'success' ? '주변 관광지가 없어요.' : '위치를 확인하면 관광지가 표시돼요.'}</p></div> : places.map(place => (
              <button type="button" key={place.id} onClick={() => focusPlace(place)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${activePlaceId === place.id ? 'border-neon-400 bg-neon-50 shadow-sm' : 'border-transparent bg-plum-50/70 hover:border-plum-200'}`}>
                <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-plum-300 to-plum-100 bg-cover bg-center" style={place.imageUrl ? { backgroundImage: `url(${place.imageUrl.replace(/^http:/, 'https:')})` } : undefined} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-plum-900">{place.title}</p><p className="mt-0.5 truncate text-xs text-plum-400">{place.address || '주소 정보 없음'}</p></div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-plum-700 shadow-sm">{formatDistance(place.distanceMeters)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
