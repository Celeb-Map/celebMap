"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BedDouble, ChevronDown, ExternalLink, LoaderCircle, MapPin, Phone, Sparkles, Store, X } from 'lucide-react';
import CoursePlanner from './CoursePlanner';
import { loadKakaoMap, type KakaoMap, type KakaoMapsApi, type KakaoOverlay } from '../lib/kakaoMapLoader';
import type { Restaurant } from '../lib/types';

type Coordinates = { latitude: number; longitude: number };
type PlaceKind = 'attraction' | 'accommodation';
type PlaceFilter = 'all' | PlaceKind;
type TourismPlace = { id: string; kind: PlaceKind; contentTypeId: string; title: string; address: string; imageUrl: string | null; longitude: number; latitude: number; distanceMeters: number | null };
type NearbyResponse = { totalCount: number; places: TourismPlace[]; message?: string };
type PlaceDetail = { title: string; address: string; imageUrl: string | null; telephone: string; overview: string; zipcode: string };
type DetailResponse = { detail?: PlaceDetail; message?: string };

const formatDistance = (meters: number | null) => meters === null ? '거리 정보 없음' : meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;

export default function MapView({ restaurant }: { restaurant: Restaurant | null }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const mapsApiRef = useRef<KakaoMapsApi | null>(null);
  const locationOverlayRef = useRef<KakaoOverlay | null>(null);
  const placeOverlaysRef = useRef<KakaoOverlay[]>([]);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  const [panelOpen, setPanelOpen] = useState(true);
  const [courseOpen, setCourseOpen] = useState(false);
  const [courseMap, setCourseMap] = useState<{ map: KakaoMap; maps: KakaoMapsApi } | null>(null);
  const coordinates = useMemo<Coordinates | null>(() => {
    if (restaurant?.latitude === null || restaurant?.longitude === null || restaurant?.latitude === undefined || restaurant?.longitude === undefined) return null;
    if (!Number.isFinite(restaurant.latitude) || !Number.isFinite(restaurant.longitude)) return null;
    return { latitude: restaurant.latitude, longitude: restaurant.longitude };
  }, [restaurant]);
  const [places, setPlaces] = useState<TourismPlace[]>([]);
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>('all');
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<TourismPlace | null>(null);
  const [placeDetail, setPlaceDetail] = useState<PlaceDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('맛집을 선택하면 주변 여행 정보를 보여드려요.');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(() => appKey ? null : 'NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.');

  const loadNearbyPlaces = useCallback(async (position: Coordinates) => {
    setStatus('loading');
    setMessage('주변 관광지와 숙박을 불러오고 있어요.');
    try {
      const params = new URLSearchParams({ latitude: position.latitude.toString(), longitude: position.longitude.toString() });
      const response = await fetch(`/api/tourism/nearby?${params}`);
      const data = await response.json() as NearbyResponse;
      if (!response.ok) throw new Error(data.message ?? '관광 정보를 불러오지 못했습니다.');
      setPlaces(data.places);
      setStatus('success');
      const accommodations = data.places.filter(place => place.kind === 'accommodation').length;
      setMessage(data.places.length ? `반경 3km 내 관광지와 숙박 ${data.places.length}곳 · 숙박 ${accommodations}곳` : '반경 3km 내 등록된 장소가 없어요.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '관광 정보를 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    if (!coordinates) return;
    const timeoutId = window.setTimeout(() => {
      setPlaceFilter('all');
      setActivePlaceId(null);
      setSelectedPlace(null);
      void loadNearbyPlaces(coordinates);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [coordinates, loadNearbyPlaces]);

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
      setCourseMap({ map, maps });
      if (isNewMap) map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
      map.relayout();
      map.setCenter(center);
      locationOverlayRef.current?.setMap(null);
      const locationNode = document.createElement('div');
      locationNode.className = 'relative flex flex-col items-center';
      const restaurantLabel = document.createElement('div');
      restaurantLabel.className = 'pointer-events-none absolute bottom-full mb-1 max-w-32 truncate rounded-md bg-neon-400 px-2 py-1 text-[10px] font-bold text-plum-900 shadow-sm';
      restaurantLabel.textContent = restaurant?.name ?? '선택한 맛집';
      const restaurantMarker = document.createElement('div');
      restaurantMarker.className = 'flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-plum-700 text-[9px] font-bold text-neon-400 shadow-sm';
      restaurantMarker.textContent = '맛집';
      locationNode.append(restaurantLabel, restaurantMarker);
      locationNode.setAttribute('aria-label', `${restaurant?.name ?? '선택한 맛집'} 기준 위치`);
      locationOverlayRef.current = new maps.CustomOverlay({ map, position: center, content: locationNode, xAnchor: 0.5, yAnchor: 0.5, zIndex: 20 });
      setMapError(null);
      setMapReady(true);
    }).catch(error => {
      if (!cancelled) {
        setMapReady(false);
        setMapError(error instanceof Error ? error.message : 'Kakao 지도를 표시하지 못했습니다.');
      }
    });
    return () => { cancelled = true; };
  }, [appKey, coordinates, restaurant]);

  useEffect(() => {
    placeOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    placeOverlaysRef.current = [];
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    if (!mapReady || !map || !maps || courseOpen) return;

    const visiblePlaces = placeFilter === 'all' ? places : places.filter(place => place.kind === placeFilter);
    placeOverlaysRef.current = visiblePlaces.map(place => {
      const position = new maps.LatLng(place.latitude, place.longitude);
      const wrapper = document.createElement('div');
      wrapper.className = 'relative flex flex-col items-center';
      if (activePlaceId === place.id) {
        const label = document.createElement('div');
        label.className = `pointer-events-none absolute bottom-full mb-1 max-w-36 truncate rounded-md px-2 py-1 text-[10px] font-bold text-white shadow-sm ${place.kind === 'accommodation' ? 'bg-orange-500' : 'bg-plum-900'}`;
        label.textContent = place.title;
        wrapper.appendChild(label);
      }
      const marker = document.createElement('button');
      marker.type = 'button';
      const isAccommodation = place.kind === 'accommodation';
      marker.className = `flex h-6 w-6 items-center justify-center border-2 border-white text-[10px] font-bold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-700 ${isAccommodation ? 'rounded-lg bg-orange-500 text-white' : 'rounded-full bg-plum-700 text-neon-400'} ${activePlaceId === place.id ? 'ring-2 ring-plum-700/25' : ''}`;
      marker.setAttribute('aria-label', `${place.title} ${isAccommodation ? '숙박' : '관광지'}`);
      marker.textContent = isAccommodation ? 'H' : '●';
      marker.addEventListener('click', event => {
        event.stopPropagation();
        setActivePlaceId(place.id);
        setPlaceDetail(null);
        setDetailStatus('loading');
        setSelectedPlace(place);
        map.setCenter(position);
      });
      wrapper.appendChild(marker);
      return new maps.CustomOverlay({ map, position, content: wrapper, xAnchor: 0.5, yAnchor: 0.5, zIndex: activePlaceId === place.id ? 30 : 5 });
    });
    return () => {
      placeOverlaysRef.current.forEach(overlay => overlay.setMap(null));
      placeOverlaysRef.current = [];
    };
  }, [activePlaceId, mapReady, placeFilter, places, courseOpen]);

  const attractionCount = places.filter(place => place.kind === 'attraction').length;
  const accommodationCount = places.filter(place => place.kind === 'accommodation').length;
  const filteredPlaces = placeFilter === 'all' ? places : places.filter(place => place.kind === placeFilter);

  const changeFilter = (filter: PlaceFilter) => {
    setPlaceFilter(filter);
    setActivePlaceId(null);
    setSelectedPlace(null);
  };

  const focusPlace = (place: TourismPlace) => {
    setActivePlaceId(place.id);
    setPlaceDetail(null);
    setDetailStatus('loading');
    setSelectedPlace(place);
    if (mapRef.current && mapsApiRef.current) mapRef.current.setCenter(new mapsApiRef.current.LatLng(place.latitude, place.longitude));
  };

  useEffect(() => {
    if (!selectedPlace) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ contentTypeId: selectedPlace.contentTypeId });
    fetch(`/api/tourism/detail/${selectedPlace.id}?${query}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json() as DetailResponse;
        if (!response.ok || !data.detail) throw new Error(data.message ?? '상세 정보를 불러오지 못했습니다.');
        setPlaceDetail(data.detail);
        setDetailStatus('success');
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setDetailStatus('error');
      });
    return () => controller.abort();
  }, [selectedPlace]);

  const closeDetail = () => {
    setSelectedPlace(null);
    setActivePlaceId(null);
    setPlaceDetail(null);
    setDetailStatus('idle');
  };

  if (!restaurant) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-plum-50 px-8 text-center">
        <div>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-plum-700 text-neon-400 shadow-lg"><Store size={27} /></span>
          <h2 className="mt-5 text-lg font-black text-plum-900">먼저 맛집을 선택해 주세요</h2>
          <p className="mt-2 text-sm leading-6 text-plum-500">홈이나 검색에서 맛집을 누르면<br />주변 관광지와 숙박을 지도에서 보여드려요.</p>
          <p className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-plum-400 shadow-sm">현재 위치 권한은 사용하지 않아요</p>
        </div>
      </div>
    );
  }

  if (!coordinates) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-plum-50 px-8 text-center">
        <div><AlertCircle className="mx-auto text-plum-400" size={32} /><h2 className="mt-4 text-base font-black text-plum-900">맛집 위치 정보가 없어요</h2><p className="mt-2 text-sm text-plum-500">다른 맛집을 선택해 주세요.</p></div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-col">
      <div className="relative flex-1 overflow-hidden bg-plum-50">
        <div ref={mapContainerRef} className="absolute inset-0" aria-label={`${restaurant.name} 주변 관광지와 숙박 지도`} />
        {mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-plum-50 px-8 text-center"><div><AlertCircle className="mx-auto mb-3 text-plum-500" size={30} /><p className="text-sm font-bold text-plum-800">Kakao 지도를 표시하지 못했습니다.</p><p className="mt-2 text-xs leading-5 text-plum-500">{mapError}</p></div></div>
        )}
        <div className="absolute left-4 right-4 top-4 z-20 rounded-2xl border border-plum-100 bg-white/95 p-3 shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${status === 'error' ? 'bg-neon-400' : 'bg-plum-50'}`}>
              {status === 'loading' ? <LoaderCircle size={17} className="animate-spin text-plum-700" /> : status === 'error' ? <AlertCircle size={17} className="text-plum-900" /> : <Store size={17} className="text-plum-700" />}
            </div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-plum-900">{restaurant.name} 주변</p><p className="mt-0.5 truncate text-[11px] text-plum-500">{message}</p></div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 border-t border-plum-100 pt-2 text-[10px] text-plum-400"><MapPin size={11} /><span className="min-w-0 flex-1 truncate">기준 맛집 · {restaurant.location || '주소 정보 없음'}</span></div>
          {!courseOpen && <button type="button" onClick={() => { closeDetail(); setCourseOpen(true); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-plum-700 py-3 text-xs font-extrabold text-neon-400"><Sparkles size={16} />이 맛집에서 추천 코스 만들기<span className="ml-1 text-[10px] font-medium text-white/70">4~5곳</span></button>}
        </div>
      </div>

      {!courseOpen && <div className={`absolute bottom-0 left-0 right-0 z-20 overflow-hidden rounded-t-[28px] border border-b-0 border-plum-100 bg-white/95 shadow-[0_-12px_40px_rgba(60,26,71,0.14)] backdrop-blur-xl transition-[height] duration-300 ${panelOpen ? 'h-80' : 'h-[88px]'}`}>
        <button type="button" onClick={() => setPanelOpen(open => !open)} aria-expanded={panelOpen} aria-controls="nearby-places-panel" className="flex h-[88px] w-full items-center gap-3 px-5 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-plum-700 text-neon-400"><MapPin size={18} /></span>
          <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-sm font-extrabold text-plum-900">맛집 주변 여행 장소</span><span className="rounded-full bg-neon-400/20 px-2 py-0.5 text-[11px] font-extrabold text-plum-700">{places.length}곳</span></span><span className="mt-1 block truncate text-xs text-plum-400">{panelOpen ? `관광 ${attractionCount} · 숙박 ${accommodationCount}` : '관광지와 숙박 목록 보기'}</span></span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-plum-100 bg-white text-plum-600"><ChevronDown size={18} className={`transition-transform ${panelOpen ? '' : 'rotate-180'}`} /></span>
        </button>
        {panelOpen && (
          <div id="nearby-places-panel" className="h-[calc(100%-88px)] overflow-y-auto overscroll-contain border-t border-plum-100/80 px-4 pb-5 no-scrollbar">
            <div className="sticky top-0 z-10 -mx-4 mb-3 flex gap-2 border-b border-plum-100 bg-white px-4 pb-3 pt-3 shadow-[0_6px_12px_rgba(60,26,71,0.04)]">
              {([
                ['all', '전체', places.length],
                ['attraction', '관광', attractionCount],
                ['accommodation', '숙박', accommodationCount],
              ] as const).map(([filter, label, count]) => (
                <button key={filter} type="button" onClick={() => changeFilter(filter)} aria-pressed={placeFilter === filter} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold transition-colors ${placeFilter === filter ? filter === 'accommodation' ? 'bg-orange-500 text-white' : 'bg-plum-700 text-white' : 'bg-plum-50 text-plum-500'}`}>
                  {filter === 'accommodation' && <BedDouble size={13} />}{label}<span className="opacity-70">{count}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2.5">
            {filteredPlaces.length === 0 ? <div className="flex h-28 flex-col items-center justify-center text-center">{placeFilter === 'accommodation' ? <BedDouble size={24} className="mb-2 text-orange-300" /> : <MapPin size={24} className="mb-2 text-plum-300" />}<p className="text-sm font-semibold text-plum-500">{status === 'success' ? `주변 ${placeFilter === 'accommodation' ? '숙박이' : '장소가'} 없어요.` : '위치를 확인하면 주변 장소가 표시돼요.'}</p></div> : filteredPlaces.map(place => (
              <button type="button" key={place.id} onClick={() => focusPlace(place)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${activePlaceId === place.id ? 'border-neon-400 bg-neon-50 shadow-sm' : 'border-transparent bg-plum-50/70 hover:border-plum-200'}`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br bg-cover bg-center ${place.kind === 'accommodation' ? 'from-orange-300 to-orange-100 text-orange-700' : 'from-plum-300 to-plum-100 text-plum-700'}`} style={place.imageUrl ? { backgroundImage: `url(${place.imageUrl.replace(/^http:/, 'https:')})` } : undefined}>{!place.imageUrl && (place.kind === 'accommodation' ? <BedDouble size={20} /> : <MapPin size={20} />)}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black ${place.kind === 'accommodation' ? 'bg-orange-100 text-orange-700' : 'bg-plum-100 text-plum-600'}`}>{place.kind === 'accommodation' ? '숙박' : '관광'}</span><p className="truncate text-sm font-bold text-plum-900">{place.title}</p></div><p className="mt-0.5 truncate text-xs text-plum-400">{place.address || '주소 정보 없음'}</p></div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-plum-700 shadow-sm">{formatDistance(place.distanceMeters)}</span>
              </button>
            ))}
            </div>
          </div>
        )}
      </div>

      }
      {courseOpen && <CoursePlanner key={restaurant.id} restaurant={restaurant} map={mapReady ? courseMap?.map ?? null : null} maps={mapReady ? courseMap?.maps ?? null : null} onClose={() => setCourseOpen(false)} />}

      {selectedPlace && (
        <div className="absolute inset-0 z-40 flex items-end" role="dialog" aria-modal="true" aria-labelledby="place-detail-title">
          <button type="button" className="absolute inset-0 bg-plum-900/35 backdrop-blur-[2px]" onClick={closeDetail} aria-label="상세 정보 닫기" />
          <section className="relative z-10 max-h-[78%] w-full overflow-y-auto rounded-t-[30px] bg-white shadow-[0_-18px_50px_rgba(29,8,36,0.24)] no-scrollbar">
            <div className="sticky top-0 z-10 flex justify-center bg-white pb-1 pt-3"><span className="h-1 w-10 rounded-full bg-plum-200" /></div>
            <button type="button" onClick={closeDetail} aria-label="상세 정보 닫기" className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-plum-700 shadow-md"><X size={18} /></button>

            <div className="relative h-48 bg-plum-100">
              {(placeDetail?.imageUrl || selectedPlace.imageUrl) ? <div className="h-full bg-cover bg-center" style={{ backgroundImage: `url(${(placeDetail?.imageUrl || selectedPlace.imageUrl)!.replace(/^http:/, 'https:')})` }} /> : <div className={`flex h-full items-center justify-center ${selectedPlace.kind === 'accommodation' ? 'bg-orange-50 text-orange-300' : 'bg-plum-50 text-plum-300'}`}>{selectedPlace.kind === 'accommodation' ? <BedDouble size={44} /> : <MapPin size={44} />}</div>}
              <span className={`absolute bottom-3 left-4 rounded-full px-3 py-1 text-[11px] font-black text-white shadow-sm ${selectedPlace.kind === 'accommodation' ? 'bg-orange-500' : 'bg-plum-700'}`}>{selectedPlace.kind === 'accommodation' ? '숙박' : '관광지'}</span>
            </div>

            <div className="px-5 pb-7 pt-5">
              <div className="pr-6">
                <h2 id="place-detail-title" className="text-xl font-black leading-tight text-plum-900">{placeDetail?.title || selectedPlace.title}</h2>
                <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-plum-500"><MapPin size={14} className="mt-0.5 shrink-0" /><span>{placeDetail?.address || selectedPlace.address || '주소 정보 없음'}</span></div>
              </div>

              <div className="mt-4 flex gap-2">
                <span className="rounded-full bg-plum-50 px-3 py-1.5 text-xs font-extrabold text-plum-700">현재 기준 {formatDistance(selectedPlace.distanceMeters)}</span>
                {placeDetail?.zipcode && <span className="rounded-full bg-plum-50 px-3 py-1.5 text-xs font-bold text-plum-500">우편번호 {placeDetail.zipcode}</span>}
              </div>

              {detailStatus === 'loading' && <div className="mt-5 flex items-center gap-2 rounded-2xl bg-plum-50 p-4 text-xs font-semibold text-plum-500"><LoaderCircle size={16} className="animate-spin" />상세 정보를 불러오고 있어요.</div>}
              {detailStatus === 'error' && <div className="mt-5 rounded-2xl bg-plum-50 p-4 text-xs leading-5 text-plum-500">추가 상세 정보는 제공되지 않아요. 기본 위치 정보는 확인할 수 있습니다.</div>}
              {placeDetail?.overview && <div className="mt-5"><h3 className="text-sm font-extrabold text-plum-900">장소 소개</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-plum-600">{placeDetail.overview}</p></div>}
              {placeDetail?.telephone && <a href={`tel:${placeDetail.telephone.replace(/[^\d+]/g, '')}`} className="mt-5 flex items-center gap-3 rounded-2xl border border-plum-100 p-4 text-sm font-bold text-plum-800"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-plum-50"><Phone size={16} /></span><span className="min-w-0 flex-1 truncate">{placeDetail.telephone}</span></a>}

              <a href={`https://map.kakao.com/link/map/${encodeURIComponent(selectedPlace.title)},${selectedPlace.latitude},${selectedPlace.longitude}`} target="_blank" rel="noreferrer" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-plum-700 text-sm font-extrabold text-neon-400 shadow-sm"><ExternalLink size={16} />카카오맵에서 보기</a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
