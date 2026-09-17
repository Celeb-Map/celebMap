'use client';

import { useEffect, useState } from 'react';
import { BedDouble, MapPin, LoaderCircle } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import type { Restaurant } from '../lib/types';

type Place = {
  id: string;
  kind: 'attraction' | 'accommodation';
  title: string;
  address: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
};

type Props = {
  restaurants: Restaurant[];
  filter: 'all' | 'hotel' | 'spot';
  onSelectRestaurant: (restaurant: Restaurant) => void;
};

export default function SearchNearbyPlaces({ restaurants, filter, onSelectRestaurant }: Props) {
  const { locale, t } = useLanguage();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const restaurant = restaurants.find(item => item.id === selectedId) ?? restaurants[0];

  if (!restaurant) return <p className="rounded-2xl border border-plum-100 bg-white p-4 text-sm text-plum-500">{t('맛집을 검색하면 주변 관광지와 숙박을 보여드려요.')}</p>;

  return (
    <section className="space-y-3">
      <div className="rounded-2xl bg-plum-50 p-4">
        <label htmlFor="nearby-search-restaurant" className="mb-2 block text-xs font-bold text-plum-700">{t('주변 검색 기준 맛집')}</label>
        <select id="nearby-search-restaurant" value={restaurant.id} onChange={event => setSelectedId(Number(event.target.value))} className="w-full rounded-xl border border-plum-200 bg-white p-3 text-sm text-plum-900">
          {restaurants.map(item => <option key={item.id} value={item.id}>{item.name} — {item.location}</option>)}
        </select>
        <p className="mt-2 text-[11px] text-plum-500">{t('지도와 동일하게 맛집 반경 3km 내 장소를 보여드려요.')}</p>
        <button type="button" onClick={() => onSelectRestaurant(restaurant)} className="mt-3 text-xs font-bold text-plum-700 underline underline-offset-4">{t('이 맛집 주변 지도 보기')}</button>
      </div>
      <NearbyResults key={`${restaurant.id}:${restaurant.latitude}:${restaurant.longitude}:${locale}`} restaurant={restaurant} filter={filter} />
    </section>
  );
}

function NearbyResults({ restaurant, filter }: { restaurant: Restaurant; filter: Props['filter'] }) {
  const { locale, t } = useLanguage();
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const { latitude, longitude } = restaurant;
  const hasCoordinates = latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude);

  useEffect(() => {
    if (!hasCoordinates) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), lang: locale });
        const response = await fetch(`/api/tourism/nearby?${params}`, { signal: controller.signal });
        const data = await response.json() as { places?: Place[] };
        if (!response.ok || !Array.isArray(data.places)) throw new Error('Nearby request failed');
        if (controller.signal.aborted) return;
        setPlaces(data.places);
        setStatus('success');
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    }, 250);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [latitude, longitude, hasCoordinates, locale, attempt]);

  if (!hasCoordinates) return <p className="p-4 text-sm text-plum-500">{t('맛집 위치 정보가 없어요')} {t('다른 맛집을 선택해 주세요.')}</p>;
  if (status === 'loading') return <p role="status" className="flex items-center gap-2 p-4 text-xs text-plum-500"><LoaderCircle size={16} className="animate-spin" />{t('주변 관광지와 숙박을 불러오고 있어요.')}</p>;
  if (status === 'error') return <div role="alert" className="rounded-2xl bg-plum-50 p-4 text-sm text-plum-500"><p>{t('관광 정보를 불러오지 못했습니다.')}</p><button type="button" onClick={() => { setStatus('loading'); setAttempt(value => value + 1); }} className="mt-2 font-bold underline">{t('다시 시도')}</button></div>;

  return (
    <div className="space-y-5">
      {(['attraction', 'accommodation'] as const).filter(kind => filter === 'all' || (filter === 'hotel' ? kind === 'accommodation' : kind === 'attraction')).map(kind => {
        const items = places.filter(place => place.kind === kind);
        const Icon = kind === 'accommodation' ? BedDouble : MapPin;
        return <section key={kind}>
          <h3 className="mb-3 text-[13px] font-bold text-plum-800">{t(kind === 'accommodation' ? '근처 숙박' : '근처 관광지')} <span className="text-plum-400">{items.length}</span></h3>
          {!items.length ? <p className="rounded-2xl border border-plum-100 bg-white p-4 text-xs text-plum-500">{t('반경 3km 내 {kind} 없어요.', { kind: t(kind === 'accommodation' ? '숙박이' : '장소가') })}</p> : <div className="space-y-2.5">{items.map(place => (
            <a key={place.id} href={`https://map.kakao.com/link/map/${encodeURIComponent(place.title)},${place.latitude},${place.longitude}`} target="_blank" rel="noreferrer" aria-label={`${place.title} · ${t('카카오맵에서 보기')}`} className="flex items-center gap-3 rounded-2xl border border-plum-100 bg-white p-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cover bg-center ${kind === 'accommodation' ? 'bg-orange-100 text-orange-700' : 'bg-plum-100 text-plum-700'}`} style={place.imageUrl ? { backgroundImage: `url(${place.imageUrl.replace(/^http:/, 'https:')})` } : undefined}>{!place.imageUrl && <Icon size={20} />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-plum-900">{place.title}</span><span className="mt-1 block truncate text-xs text-plum-400">{place.address || t('주소 정보 없음')}</span></span>
              <span className="shrink-0 text-[11px] font-bold text-plum-700">{place.distanceMeters === null ? t('거리 정보 없음') : place.distanceMeters < 1000 ? `${place.distanceMeters}m` : `${(place.distanceMeters / 1000).toFixed(1)}km`}</span>
            </a>
          ))}</div>}
        </section>;
      })}
    </div>
  );
}
