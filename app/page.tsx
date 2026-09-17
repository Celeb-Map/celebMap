"use client";
import { useEffect, useMemo, useState } from 'react';
import Navbar from './components/Navbar';
import HomeView from './components/HomeView';
import SearchView from './components/SearchView';
import MapView from './components/MapView';
import MyPageView from './components/MyPageView';
import type { Celeb, Restaurant } from './lib/types';
import seventeenLogo from '../public/imgs/SEVENTEEN_logo.png';
import cortisLogo from '../public/imgs/CORTIS_logo.png';
import btsLogo from '../public/imgs/BTS_logo.png';
import { LanguageToggle, useLanguage } from './components/LanguageProvider';

export type Tab = 'home' | 'search' | 'map' | 'mypage';

const CELEBRITIES: Celeb[] = [
  { id: 1, englishName: 'BLACKPINK', name: '블랙핑크', group: '블랙핑크', emoji: '🖤', logo: '/imgs/BLACKPINK_logo.png', logoScale: 1.1, gradient: 'from-plum-900 to-pink-500' },
  { id: 2, englishName: 'SEVENTEEN', name: '세븐틴', group: '세븐틴', emoji: '💎', logo: seventeenLogo.src, logoScale: 0.85, gradient: 'from-blue-400 to-pink-300' },
  { id: 3, englishName: 'BTS', name: 'BTS', group: 'BTS', emoji: '💜', logo: btsLogo.src, logoScale: 0.85, gradient: 'from-plum-800 to-plum-500' },
  { id: 4, englishName: 'Stray Kids', name: '스트레이키즈', group: '스트레이키즈', emoji: '⚡', logo: '/imgs/StrayKids_logo%20.jpg', logoScale: 1.2, gradient: 'from-red-600 to-plum-800' },
  { id: 5, englishName: 'CORTIS', name: '코르티스', group: '코르티스', emoji: '✨', logo: cortisLogo.src, logoScale: 0.95, gradient: 'from-neon-500 to-plum-500' },
  { id: 6, englishName: 'G-DRAGON', name: 'GD', group: 'GD', emoji: '🌼', logo: '/imgs/GD_logo.png', logoScale: 1.5, gradient: 'from-yellow-300 to-plum-600' },
];

export default function Page() {
  const { locale, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [mapRestaurant, setMapRestaurant] = useState<Restaurant | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [catalogError, setCatalogError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/catalog', { signal: controller.signal })
      .then(async response => {
        const data = await response.json() as { restaurants?: Restaurant[]; message?: string };
        if (!response.ok) throw new Error(data.message ?? '맛집 정보를 불러오지 못했습니다.');
        setRestaurants(data.restaurants ?? []);
        setCatalogError(undefined);
        setCatalogStatus('success');
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCatalogError(error instanceof Error ? error.message : '맛집 정보를 불러오지 못했습니다.');
        setCatalogStatus('error');
      });

    return () => controller.abort();
  }, []);

  const displayedRestaurants = useMemo(() => restaurants.map(restaurant => locale === 'ko' ? restaurant : ({
    ...restaurant,
    name: restaurant.english?.name || restaurant.name,
    location: restaurant.english?.address || t(restaurant.location),
    hours: restaurant.english?.hours || t(restaurant.hours),
    category: restaurant.english?.category || t(restaurant.category),
    distance: t(restaurant.distance),
  })), [restaurants, locale, t]);
  const displayedMapRestaurant = displayedRestaurants.find(restaurant => restaurant.id === mapRestaurant?.id) ?? mapRestaurant;

  const openRestaurantMap = (restaurant: Restaurant) => {
    setMapRestaurant(restaurant);
    setActiveTab('map');
  };

  return (
    <div className="flex flex-col h-dvh w-full bg-canvas max-w-md mx-auto border-x border-plum-100 overflow-hidden relative shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-plum-100 bg-canvas px-5 py-2">
        <span className="text-[11px] font-semibold text-plum-500">{t('언어')}</span>
        <LanguageToggle />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain no-scrollbar">
        {activeTab === 'home' && (
          <HomeView celebrities={CELEBRITIES} restaurants={displayedRestaurants} catalogStatus={catalogStatus} catalogError={locale === 'en' && catalogError ? t('맛집 정보를 불러오지 못했습니다.') : catalogError} onSelectRestaurant={openRestaurantMap} />
        )}
        {activeTab === 'search' && (
          <SearchView celebrities={CELEBRITIES} restaurants={displayedRestaurants} onSelectRestaurant={openRestaurantMap} />
        )}
        {activeTab === 'map' && (
          <MapView key={`${mapRestaurant?.id ?? 'empty'}:${locale}`} restaurant={displayedMapRestaurant} />
        )}
        {activeTab === 'mypage' && (
          <MyPageView restaurants={displayedRestaurants} />
        )}
      </div>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
