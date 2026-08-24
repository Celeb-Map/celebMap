'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, LoaderCircle, MapPin, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = { restaurantId: string; name: string; address: string; latitude: number; longitude: number };

type KakaoMaps = {
  load: (callback: () => void) => void;
  LatLng: new (latitude: number, longitude: number) => unknown;
  Map: new (container: HTMLElement, options: { center: unknown; level: number }) => { addControl: (control: unknown, position: unknown) => void };
  Marker: new (options: { map: unknown; position: unknown }) => unknown;
  CustomOverlay: new (options: { map: unknown; position: unknown; content: HTMLElement; yAnchor: number }) => unknown;
  ZoomControl: new () => unknown;
  ControlPosition: { RIGHT: unknown };
};

declare global {
  interface Window { kakao?: { maps: KakaoMaps } }
}

let kakaoMapsPromise: Promise<KakaoMaps> | null = null;

function loadKakaoMaps(appKey: string) {
  if (window.kakao?.maps) {
    return new Promise<KakaoMaps>(resolve => window.kakao?.maps.load(() => resolve(window.kakao!.maps)));
  }
  if (kakaoMapsPromise) return kakaoMapsPromise;

  kakaoMapsPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error('카카오 지도 SDK를 불러오지 못했습니다.'));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao!.maps));
    };
    script.onerror = () => reject(new Error('카카오 지도 서버에 연결하지 못했습니다.'));
    document.head.appendChild(script);
  });
  return kakaoMapsPromise;
}

export default function RestaurantLocationMap({ restaurantId, name, address, latitude, longitude }: Props) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_SCRIPT_KEY ?? process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const [mapStatus, setMapStatus] = useState<'loading' | 'success' | 'error'>(appKey ? 'loading' : 'error');
  const [mapError, setMapError] = useState(appKey ? '' : '카카오 지도 JavaScript 키가 설정되지 않았습니다.');
  const validCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

  useEffect(() => {
    if (!validCoordinates || !mapRef.current) return;
    if (!appKey) return;

    let cancelled = false;
    loadKakaoMaps(appKey)
      .then(maps => {
        if (cancelled || !mapRef.current) return;
        const position = new maps.LatLng(latitude, longitude);
        const map = new maps.Map(mapRef.current, { center: position, level: 3 });
        new maps.Marker({ map, position });
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);

        const label = document.createElement('div');
        label.className = 'whitespace-nowrap rounded-full border-2 border-white bg-plum-700 px-3 py-1.5 text-xs font-extrabold text-neon-400 shadow-lg';
        label.textContent = name;
        new maps.CustomOverlay({ map, position, content: label, yAnchor: 2.35 });
        setMapStatus('success');
      })
      .catch(error => {
        if (!cancelled) {
          setMapStatus('error');
          setMapError(error instanceof Error ? error.message : '카카오 지도를 표시하지 못했습니다.');
        }
      });
    return () => { cancelled = true };
  }, [appKey, latitude, longitude, name, validCoordinates]);

  const directionsUrl = validCoordinates
    ? `https://map.kakao.com/link/to/${encodeURIComponent(name)},${latitude},${longitude}`
    : '#';

  return (
    <main className="mx-auto flex h-screen w-full max-w-md flex-col overflow-hidden border-x border-plum-100 bg-canvas shadow-2xl">
      <header className="z-20 flex items-center gap-3 border-b border-plum-100 bg-white px-4 py-4 shadow-sm">
        <button type="button" onClick={() => router.back()} aria-label="이전 화면" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum-700 text-neon-400">
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold text-plum-900">{name}</p>
          <p className="mt-0.5 truncate text-xs text-plum-400">{address}</p>
        </div>
      </header>

      <section className="relative flex-1 overflow-hidden bg-plum-50">
        {validCoordinates ? <div ref={mapRef} className="h-full w-full" aria-label={`${name} 위치 지도`} /> : (
          <MapMessage icon="pin" message="유효한 위도·경도가 없습니다." detail={`맛집 ID: ${restaurantId}`} />
        )}
        {validCoordinates && mapStatus === 'loading' && <MapMessage icon="loading" message="카카오 지도를 불러오고 있어요." />}
        {validCoordinates && mapStatus === 'error' && (
          <MapMessage icon="error" message={mapError} detail="카카오 개발자 콘솔의 JavaScript 키와 등록 도메인을 확인해 주세요." />
        )}

        {validCoordinates && mapStatus === 'success' && (
          <div className="absolute bottom-5 left-4 right-4 z-10 rounded-3xl border border-white/70 bg-white/95 p-4 shadow-[0_16px_50px_rgba(60,26,71,0.24)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-plum-700 text-neon-400 shadow-sm"><MapPin size={19} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-plum-900">{name}</p>
                <p className="mt-1 truncate text-xs text-plum-400">{address}</p>
                <p className="mt-1.5 text-[11px] font-medium text-plum-400">위도 {latitude.toFixed(6)} · 경도 {longitude.toFixed(6)}</p>
              </div>
            </div>
            <a href={directionsUrl} target="_blank" rel="noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-plum-700 py-3.5 text-sm font-extrabold text-neon-400 shadow-md shadow-plum-200">
              <Navigation size={17} /> 카카오맵 길찾기
            </a>
          </div>
        )}
      </section>
    </main>
  );
}

function MapMessage({ icon, message, detail }: { icon: 'pin' | 'loading' | 'error'; message: string; detail?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-plum-50 px-8 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-plum-600 shadow-sm">
        {icon === 'loading' ? <LoaderCircle size={25} className="animate-spin" /> : icon === 'error' ? <AlertCircle size={25} /> : <MapPin size={25} />}
      </span>
      <p className="font-bold text-plum-700">{message}</p>
      {detail && <p className="mt-2 text-sm leading-5 text-plum-400">{detail}</p>}
    </div>
  );
}
